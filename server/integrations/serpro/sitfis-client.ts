/**
 * Integra Contador SERPRO - Cliente SITFIS
 * 
 * Serviço de Situação Fiscal - Consulta e emissão de relatório
 * 
 * Fluxo:
 * 1. Solicitar relatório via POST /sitfis/solicitar
 * 2. Aguardar processamento (pode levar alguns segundos)
 * 3. Emitir/obter relatório via GET /sitfis/emitir/{protocolo}
 * 
 * Suporta dois modos de autenticação:
 * - OAuth apenas (fetchWithAuth) - para testes e ambiente sandbox
 * - OAuth + mTLS (fetchWithMtls) - para produção com certificado digital
 * 
 * Documentação: https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/
 */

import { fetchWithAuth, fetchWithMtls, getSerproConfig } from './auth';
import type { 
  SerproConfig, 
  SitfisSolicitarResponse, 
  SitfisEmitirResponse,
  SerproApiError 
} from './types';

// Base URLs da API Integra Contador
// Documentação: https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/
const API_URLS = {
  production: {
    base: 'https://gateway.apiserpro.serpro.gov.br/integra-contador/api/v1',
    sitfis: 'https://gateway.apiserpro.serpro.gov.br/integra-contador/api/v1/sitfis',
  },
  // Ambiente de demonstração para testes
  demo: {
    base: 'https://gateway.apiserpro.serpro.gov.br/integra-contador-trial/api/v1',
    sitfis: 'https://gateway.apiserpro.serpro.gov.br/integra-contador-trial/api/v1/sitfis',
  },
};

// Usar ambiente de demo se configurado
const ENVIRONMENT = process.env.SERPRO_SITFIS_DEMO === 'true' ? 'demo' : 'production';

// Usar mTLS por padrão em produção (certificado digital)
const USE_MTLS = process.env.SERPRO_USE_MTLS !== 'false';

// Configurações de retry
const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 3000; // 3 segundos entre tentativas
const INITIAL_WAIT_MS = 2000; // Aguardar 2s antes da primeira verificação

/**
 * Interface para opções de requisição SITFIS
 */
export interface SitfisOptions {
  /** Usar mTLS com certificado digital (default: true em produção) */
  useMtls?: boolean;
  /** Configuração SERPRO customizada */
  config?: SerproConfig;
}

/**
 * Remove caracteres não numéricos do CNPJ
 */
function sanitizeCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

/**
 * Aguarda um tempo especificado
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Solicita relatório de situação fiscal
 * 
 * @param cnpj - CNPJ do contribuinte
 * @param options - Opções da requisição (mTLS, config)
 */
export async function solicitarSituacaoFiscal(
  cnpj: string,
  options: SitfisOptions = {}
): Promise<SitfisSolicitarResponse> {
  const { useMtls = USE_MTLS, config } = options;
  const cfg = config || getSerproConfig();
  const cnpjClean = sanitizeCnpj(cnpj);

  if (cnpjClean.length !== 14) {
    throw new Error('CNPJ inválido: deve conter 14 dígitos');
  }

  console.log(`[SITFIS] Solicitando situação fiscal para CNPJ: ${cnpjClean}`);
  console.log(`[SITFIS] Modo: ${useMtls ? 'mTLS (certificado digital)' : 'OAuth apenas'}`);

  // Endpoint: POST /sitfis/solicitar/{cnpj}
  const url = `${API_URLS[ENVIRONMENT].sitfis}/solicitar/${cnpjClean}`;
  console.log(`[SITFIS] URL: ${url}`);

  // Escolher método de autenticação
  let response: { ok: boolean; status: number; text: () => Promise<string>; json: () => Promise<any> };
  
  if (useMtls) {
    const mtlsResponse = await fetchWithMtls(url, { method: 'POST' }, cfg);
    response = {
      ok: mtlsResponse.ok,
      status: mtlsResponse.status,
      text: async () => mtlsResponse.body,
      json: mtlsResponse.json,
    };
  } else {
    response = await fetchWithAuth(url, { method: 'POST' }, cfg);
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorData: SerproApiError & { code?: string; message?: string; description?: string };
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { codigo: 'ERRO_DESCONHECIDO', mensagem: errorText };
    }

    // Normalizar diferentes formatos de erro SERPRO
    const codigo = errorData.codigo || errorData.code || `HTTP_${response.status}`;
    const mensagem = errorData.mensagem || errorData.message || errorData.description || 'Erro desconhecido';

    console.error('[SITFIS] Erro ao solicitar:', { codigo, mensagem, status: response.status });
    
    // Mensagens específicas para erros conhecidos
    if (response.status === 404) {
      const mtlsHint = useMtls ? '' : ' Tente habilitar mTLS com certificado digital.';
      throw new Error(`SITFIS não disponível: Verifique se o serviço está incluído no contrato SERPRO.${mtlsHint}`);
    }
    if (response.status === 403) {
      throw new Error(`SITFIS - Acesso negado: O CNPJ ${cnpjClean} não possui autorização. Verifique o certificado digital.`);
    }
    
    throw new Error(`Erro SITFIS [${codigo}]: ${mensagem}`);
  }

  const data = await response.json();

  console.log(`[SITFIS] Solicitação criada - Protocolo: ${data.protocolo || 'N/A'}`);

  return {
    protocolo: data.protocolo || data.numProtocolo || '',
    status: data.status || 'PROCESSANDO',
    mensagem: data.mensagem || data.descricao,
    dataHoraSolicitacao: data.dataHoraSolicitacao || new Date().toISOString(),
  };
}

/**
 * Emite/obtém relatório de situação fiscal
 * 
 * @param protocolo - Protocolo retornado pela solicitação
 * @param options - Opções da requisição (mTLS, config)
 */
export async function emitirSituacaoFiscal(
  protocolo: string,
  options: SitfisOptions = {}
): Promise<SitfisEmitirResponse> {
  const { useMtls = USE_MTLS, config } = options;
  const cfg = config || getSerproConfig();

  console.log(`[SITFIS] Emitindo relatório - Protocolo: ${protocolo}`);

  // Endpoint: GET /sitfis/emitir/{protocolo}
  const url = `${API_URLS[ENVIRONMENT].sitfis}/emitir/${protocolo}`;

  // Escolher método de autenticação
  let response: { ok: boolean; status: number; headers: { get: (name: string) => string | null }; text: () => Promise<string>; json: () => Promise<any>; arrayBuffer: () => Promise<ArrayBuffer> };
  
  if (useMtls) {
    const mtlsResponse = await fetchWithMtls(url, { method: 'GET' }, cfg);
    response = {
      ok: mtlsResponse.ok,
      status: mtlsResponse.status,
      headers: { get: (name: string) => mtlsResponse.headers[name.toLowerCase()] || null },
      text: async () => mtlsResponse.body,
      json: mtlsResponse.json,
      arrayBuffer: async () => Buffer.from(mtlsResponse.body, 'binary'),
    };
  } else {
    const fetchResponse = await fetchWithAuth(url, { method: 'GET' }, cfg);
    response = fetchResponse;
  }

  if (response.status === 404) {
    return {
      status: 'NAO_ENCONTRADO',
      mensagem: 'Protocolo não encontrado ou expirado',
    };
  }

  if (response.status === 202) {
    // Ainda processando
    return {
      status: 'PROCESSANDO',
      mensagem: 'Relatório ainda em processamento',
    };
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[SITFIS] Erro ao emitir:', errorText);
    return {
      status: 'ERRO',
      mensagem: `Erro ao emitir relatório: ${errorText}`,
    };
  }

  const contentType = response.headers.get('content-type') || '';

  // Se retornar PDF diretamente
  if (contentType.includes('application/pdf')) {
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    
    return {
      status: 'DISPONIVEL',
      relatorio: base64,
      formato: 'PDF',
      dataEmissao: new Date().toISOString(),
    };
  }

  // Se retornar JSON
  const data = await response.json();

  return {
    status: data.status || 'DISPONIVEL',
    relatorio: data.relatorio || data.arquivo || data.pdf,
    formato: data.formato || 'PDF',
    mensagem: data.mensagem,
    dataEmissao: data.dataEmissao || new Date().toISOString(),
  };
}

/**
 * Consulta situação fiscal completa (solicita + aguarda + emite)
 * 
 * Função de conveniência que executa todo o fluxo:
 * 1. Solicita o relatório
 * 2. Aguarda o processamento (com polling)
 * 3. Retorna o relatório quando disponível
 * 
 * @param cnpj - CNPJ do contribuinte
 * @param options - Opções da requisição (mTLS, config)
 */
export async function consultarSituacaoFiscal(
  cnpj: string,
  options: SitfisOptions = {}
): Promise<SitfisEmitirResponse> {
  // Etapa 1: Solicitar
  const solicitacao = await solicitarSituacaoFiscal(cnpj, options);

  if (!solicitacao.protocolo) {
    throw new Error('Falha ao obter protocolo da solicitação');
  }

  // Aguardar um pouco antes de verificar
  console.log(`[SITFIS] Aguardando processamento inicial (${INITIAL_WAIT_MS}ms)...`);
  await sleep(INITIAL_WAIT_MS);

  // Etapa 2: Polling até obter resultado
  for (let tentativa = 1; tentativa <= MAX_RETRIES; tentativa++) {
    console.log(`[SITFIS] Verificando status - Tentativa ${tentativa}/${MAX_RETRIES}`);

    const resultado = await emitirSituacaoFiscal(solicitacao.protocolo, options);

    if (resultado.status === 'DISPONIVEL') {
      console.log('[SITFIS] Relatório disponível!');
      return resultado;
    }

    if (resultado.status === 'ERRO' || resultado.status === 'NAO_ENCONTRADO') {
      console.error('[SITFIS] Erro no processamento:', resultado.mensagem);
      return resultado;
    }

    // Ainda processando, aguardar e tentar novamente
    if (tentativa < MAX_RETRIES) {
      console.log(`[SITFIS] Ainda processando, aguardando ${RETRY_DELAY_MS}ms...`);
      await sleep(RETRY_DELAY_MS);
    }
  }

  // Timeout
  console.warn('[SITFIS] Timeout: relatório não ficou disponível a tempo');
  return {
    status: 'PROCESSANDO',
    mensagem: `Timeout após ${MAX_RETRIES} tentativas. Tente novamente mais tarde com o protocolo: ${solicitacao.protocolo}`,
  };
}

/**
 * Verifica status de uma solicitação existente
 * 
 * Útil para retomar uma consulta que demorou muito
 */
export async function verificarStatus(
  protocolo: string,
  options: SitfisOptions = {}
): Promise<SitfisEmitirResponse> {
  return emitirSituacaoFiscal(protocolo, options);
}

