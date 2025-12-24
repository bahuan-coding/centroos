/**
 * Motor Fiscal - Idempotência e Consistência
 * 
 * Ref: docs/spec-fiscal/04-idempotencia-e-consistencia.md
 * 
 * Estratégias para garantir operações seguras para retry.
 */

import { randomUUID } from 'crypto';
import { TipoDocumento, DocumentoFiscal } from './types';
import { isRecuperavel } from './errors';

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

export interface RetryConfig {
  maxTentativas: number;
  backoffBase: number; // ms
  backoffFator: number;
  maxBackoff: number;  // ms
}

export const CONFIG_RETRY: RetryConfig = {
  maxTentativas: 3,
  backoffBase: 1000,
  backoffFator: 2,
  maxBackoff: 30000,
};

// ============================================================================
// GERAÇÃO DE IDs
// ============================================================================

/**
 * Gera ID de idempotência para NFS-e SP
 * Formato: {ccm}_{serie}_{numeroRPS}
 */
export const gerarIdNFSeSP = (
  ccm: string,
  serie: string,
  numeroRPS: number | string
): string => {
  const ccmPadded = ccm.padStart(8, '0');
  const seriePadded = serie.padStart(5, ' ').replace(/ /g, '_');
  const numPadded = String(numeroRPS).padStart(12, '0');
  return `NFSE_SP_${ccmPadded}_${seriePadded}_${numPadded}`;
};

/**
 * Gera ID de idempotência para NFS-e Nacional (ADN)
 * Formato: {cLocEmi}_{tpInsc}_{inscFed}_{serie}_{nDPS}
 */
export const gerarIdNFSeADN = (
  cLocEmi: string,
  tpInsc: '1' | '2',
  inscFed: string,
  serie: string,
  nDPS: string
): string => {
  const inscFedPadded = inscFed.padStart(14, '0');
  const seriePadded = serie.padStart(5, '0');
  const numPadded = nDPS.padStart(15, '0');
  return `NFSE_ADN_${cLocEmi}${tpInsc}${inscFedPadded}${seriePadded}${numPadded}`;
};

/**
 * Gera ID de idempotência para NF-e/NFC-e (chave de acesso)
 * A chave de acesso de 44 dígitos é única por natureza
 */
export const gerarIdNFe = (
  cUF: string,
  AAMM: string,
  CNPJ: string,
  mod: '55' | '65',
  serie: string,
  nNF: string,
  tpEmis: string,
  cNF: string
): string => {
  const chave = [
    cUF.padStart(2, '0'),
    AAMM.padStart(4, '0'),
    CNPJ.padStart(14, '0'),
    mod,
    serie.padStart(3, '0'),
    nNF.padStart(9, '0'),
    tpEmis.padStart(1, '0'),
    cNF.padStart(8, '0'),
  ].join('');
  
  // Adiciona dígito verificador (módulo 11)
  const dv = calcularDV(chave);
  
  return `${mod === '55' ? 'NFE' : 'NFCE'}_${chave}${dv}`;
};

/**
 * Calcula dígito verificador da chave de acesso (módulo 11)
 */
const calcularDV = (chave: string): string => {
  const pesos = [2, 3, 4, 5, 6, 7, 8, 9];
  let soma = 0;
  let pesoIdx = 0;
  
  for (let i = chave.length - 1; i >= 0; i--) {
    soma += parseInt(chave[i], 10) * pesos[pesoIdx];
    pesoIdx = (pesoIdx + 1) % pesos.length;
  }
  
  const resto = soma % 11;
  const dv = resto < 2 ? 0 : 11 - resto;
  
  return String(dv);
};

/**
 * Gera correlation ID para rastreamento
 */
export const gerarCorrelationId = (): string => {
  return `fiscal-${Date.now()}-${randomUUID().slice(0, 8)}`;
};

// ============================================================================
// BACKOFF
// ============================================================================

/**
 * Calcula delay de backoff exponencial
 */
export const calcularBackoff = (
  tentativa: number,
  config: RetryConfig = CONFIG_RETRY
): number => {
  const delay = config.backoffBase * Math.pow(config.backoffFator, tentativa);
  return Math.min(delay, config.maxBackoff);
};

/**
 * Aguarda o tempo especificado
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// ============================================================================
// EXECUTOR COM RETRY
// ============================================================================

/**
 * Executa operação com retry automático
 */
export const executeWithRetry = async <T>(
  operation: () => Promise<T>,
  config: RetryConfig = CONFIG_RETRY,
  onRetry?: (tentativa: number, erro: Error) => void
): Promise<T> => {
  let ultimoErro: Error = new Error('Nenhuma tentativa executada');

  for (let tentativa = 0; tentativa < config.maxTentativas; tentativa++) {
    try {
      return await operation();
    } catch (erro: any) {
      ultimoErro = erro;

      // Se não é recuperável, não tentar novamente
      if (!isRecuperavel(erro)) {
        throw erro;
      }

      // Se é a última tentativa, lançar o erro
      if (tentativa === config.maxTentativas - 1) {
        throw erro;
      }

      // Callback de retry
      if (onRetry) {
        onRetry(tentativa + 1, erro);
      }

      // Aguardar backoff
      const delay = calcularBackoff(tentativa, config);
      await sleep(delay);
    }
  }

  throw ultimoErro;
};

// ============================================================================
// LOCK OTIMISTA
// ============================================================================

export interface DocumentoComVersao {
  id: string;
  versao: number;
}

/**
 * Verifica conflito de versão para lock otimista
 */
export const verificarVersao = (
  esperada: number,
  atual: number
): boolean => {
  return esperada === atual;
};

/**
 * Gera erro de conflito de concorrência
 */
export const erroConflito = (id: string, versaoEsperada: number, versaoAtual: number): Error => {
  const erro = new Error(
    `Conflito de concorrência no documento ${id}: ` +
    `versão esperada ${versaoEsperada}, versão atual ${versaoAtual}`
  );
  (erro as any).code = 'OPTIMISTIC_LOCK_FAILED';
  return erro;
};

// ============================================================================
// DEDUPLICAÇÃO
// ============================================================================

// Cache em memória para IDs processados recentemente (TTL: 5 minutos)
const idsProcessados = new Map<string, { resultado: any; timestamp: number }>();
const TTL_CACHE = 5 * 60 * 1000; // 5 minutos

/**
 * Verifica se operação já foi processada
 */
export const jaProcessado = (idIdempotencia: string): any | null => {
  const cached = idsProcessados.get(idIdempotencia);
  
  if (!cached) {
    return null;
  }
  
  // Verificar TTL
  if (Date.now() - cached.timestamp > TTL_CACHE) {
    idsProcessados.delete(idIdempotencia);
    return null;
  }
  
  return cached.resultado;
};

/**
 * Marca operação como processada
 */
export const marcarProcessado = (idIdempotencia: string, resultado: any): void => {
  idsProcessados.set(idIdempotencia, {
    resultado,
    timestamp: Date.now(),
  });
  
  // Limpar entradas antigas periodicamente
  if (idsProcessados.size > 1000) {
    limparCacheAntigo();
  }
};

/**
 * Limpa entradas antigas do cache
 */
const limparCacheAntigo = (): void => {
  const agora = Date.now();
  for (const [id, entry] of idsProcessados.entries()) {
    if (agora - entry.timestamp > TTL_CACHE) {
      idsProcessados.delete(id);
    }
  }
};

// ============================================================================
// WRAPPER DE IDEMPOTÊNCIA
// ============================================================================

/**
 * Wrapper que garante idempotência de uma operação
 */
export const comIdempotencia = async <T>(
  idIdempotencia: string,
  operacao: () => Promise<T>,
  verificarNaAutoridade?: () => Promise<T | null>
): Promise<{ resultado: T; origem: 'cache' | 'operacao' | 'autoridade' }> => {
  // 1. Verificar cache local
  const cached = jaProcessado(idIdempotencia);
  if (cached) {
    return { resultado: cached, origem: 'cache' };
  }
  
  try {
    // 2. Executar operação
    const resultado = await operacao();
    marcarProcessado(idIdempotencia, resultado);
    return { resultado, origem: 'operacao' };
    
  } catch (erro: any) {
    // 3. Em caso de timeout/erro de rede, verificar na autoridade
    if (isRecuperavel(erro) && verificarNaAutoridade) {
      const resultadoAutoridade = await verificarNaAutoridade();
      
      if (resultadoAutoridade) {
        marcarProcessado(idIdempotencia, resultadoAutoridade);
        return { resultado: resultadoAutoridade, origem: 'autoridade' };
      }
    }
    
    throw erro;
  }
};


