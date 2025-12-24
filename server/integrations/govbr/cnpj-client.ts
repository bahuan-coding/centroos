/**
 * Conecta gov.br - CNPJ Query Client
 * 
 * Consulta dados cadastrais de CNPJ via API gratuita do Conecta gov.br
 * 
 * Limites:
 * - 3 requisições por segundo
 * - 100 requisições por dia (perfil básico)
 * 
 * Alternativa gratuita às APIs pagas do SERPRO
 */

import { getClientCredentialsToken } from './oauth-client';
import type { GovBrConfig, CnpjBasico, OAuthToken, RateLimitInfo } from './types';

// URLs da API de CNPJ
const CNPJ_API_URLS = {
  production: 'https://api.conectagov.estaleiro.serpro.gov.br/api-cnpj-basico/v1/basico',
  sandbox: 'https://apihm.conectagov.estaleiro.serpro.gov.br/api-cnpj-basico/v1/basico',
};

// Cache simples em memória (em produção usar Redis)
const queryCache = new Map<string, { data: CnpjBasico; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

// Controle de rate limit
let requestsToday = 0;
let lastResetDate = new Date().toDateString();

/**
 * Verifica e atualiza rate limit diário
 */
function checkRateLimit(): void {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    requestsToday = 0;
    lastResetDate = today;
  }
  
  if (requestsToday >= 100) {
    throw new Error('Limite diário de consultas atingido (100/dia). Tente novamente amanhã.');
  }
}

/**
 * Formata CNPJ para consulta (remove pontuação)
 */
function formatCnpjForQuery(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

/**
 * Formata CNPJ para exibição (XX.XXX.XXX/XXXX-XX)
 */
function formatCnpjForDisplay(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return cnpj;
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

/**
 * Consulta dados básicos de CNPJ via Conecta gov.br
 */
export async function consultarCnpj(
  cnpj: string,
  config: GovBrConfig
): Promise<CnpjBasico | null> {
  const cnpjClean = formatCnpjForQuery(cnpj);
  
  if (cnpjClean.length !== 14) {
    throw new Error('CNPJ inválido: deve conter 14 dígitos');
  }
  
  // Verificar cache
  const cached = queryCache.get(cnpjClean);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log(`[CNPJ] Cache hit para ${formatCnpjForDisplay(cnpjClean)}`);
    return cached.data;
  }
  
  // Verificar rate limit
  checkRateLimit();
  
  // Obter token
  const token = await getClientCredentialsToken(config, ['openid', 'cnpj']);
  
  // Fazer consulta
  const baseUrl = CNPJ_API_URLS[config.environment];
  const url = `${baseUrl}/${cnpjClean}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token.accessToken}`,
      'Accept': 'application/json',
    },
  });
  
  requestsToday++;
  
  if (response.status === 404) {
    console.log(`[CNPJ] Não encontrado: ${formatCnpjForDisplay(cnpjClean)}`);
    return null;
  }
  
  if (response.status === 429) {
    throw new Error('Rate limit excedido. Aguarde alguns segundos.');
  }
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao consultar CNPJ: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  
  // Mapear resposta para tipo padronizado
  const result: CnpjBasico = {
    cnpj: formatCnpjForDisplay(cnpjClean),
    razaoSocial: data.razao_social || data.nome_empresarial || '',
    nomeFantasia: data.nome_fantasia,
    situacao: {
      codigo: data.situacao_cadastral?.codigo || data.codigo_situacao_cadastral || 0,
      descricao: data.situacao_cadastral?.descricao || data.descricao_situacao_cadastral || '',
      data: data.situacao_cadastral?.data || data.data_situacao_cadastral,
    },
    naturezaJuridica: data.natureza_juridica ? {
      codigo: data.natureza_juridica.codigo || '',
      descricao: data.natureza_juridica.descricao || '',
    } : undefined,
    porte: data.porte,
    endereco: data.endereco ? {
      logradouro: data.endereco.logradouro || '',
      numero: data.endereco.numero || '',
      complemento: data.endereco.complemento,
      bairro: data.endereco.bairro || '',
      municipio: data.endereco.municipio || data.endereco.nome_municipio || '',
      uf: data.endereco.uf || '',
      cep: data.endereco.cep || '',
    } : undefined,
    cnaePrincipal: data.cnae_principal ? {
      codigo: data.cnae_principal.codigo || '',
      descricao: data.cnae_principal.descricao || '',
    } : undefined,
    dataAbertura: data.data_abertura,
    email: data.email,
    telefone: data.telefone,
  };
  
  // Cachear resultado
  queryCache.set(cnpjClean, { data: result, timestamp: Date.now() });
  
  console.log(`[CNPJ] Consultado: ${result.razaoSocial} (${result.cnpj})`);
  
  return result;
}

/**
 * Valida se um CNPJ está ativo
 */
export async function validarCnpjAtivo(
  cnpj: string,
  config: GovBrConfig
): Promise<{ valido: boolean; situacao: string; razaoSocial: string }> {
  const dados = await consultarCnpj(cnpj, config);
  
  if (!dados) {
    return {
      valido: false,
      situacao: 'Não encontrado',
      razaoSocial: '',
    };
  }
  
  // Código 2 = Ativa
  const isAtivo = dados.situacao.codigo === 2;
  
  return {
    valido: isAtivo,
    situacao: dados.situacao.descricao,
    razaoSocial: dados.razaoSocial,
  };
}

/**
 * Obtém informações de rate limit
 */
export function getRateLimitInfo(): RateLimitInfo {
  return {
    perSecond: 3,
    perDay: 100,
    remainingToday: Math.max(0, 100 - requestsToday),
    resetAt: new Date(new Date().setHours(24, 0, 0, 0)).getTime(),
  };
}

/**
 * Limpa cache de consultas
 */
export function clearCnpjCache(): void {
  queryCache.clear();
}

/**
 * Remove CNPJ específico do cache
 */
export function invalidateCnpjCache(cnpj: string): void {
  const cnpjClean = formatCnpjForQuery(cnpj);
  queryCache.delete(cnpjClean);
}

/**
 * Obtém estatísticas do cache
 */
export function getCacheStats(): { size: number; oldestEntry: number | null } {
  let oldest: number | null = null;
  
  for (const entry of queryCache.values()) {
    if (oldest === null || entry.timestamp < oldest) {
      oldest = entry.timestamp;
    }
  }
  
  return {
    size: queryCache.size,
    oldestEntry: oldest,
  };
}


