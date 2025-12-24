/**
 * Integra Contador SERPRO - Cliente Unificado /Consultar
 * 
 * Cliente para o endpoint unificado POST /Consultar
 * Todas as operações do Integra Contador passam por este endpoint
 * 
 * Referências:
 * - docs/integra-contador/07-api-reference.md lines 59-116
 * - docs/integra-contador/02-autenticacao.md
 * - docs/integra-contador/06-codigos-retorno.md
 */

import type {
  SerproConfig,
  ConsultarRequest,
  ConsultarResponse,
  ConsultarOptions,
  Identificador,
  PedidoDados,
  RateLimitInfo,
} from './types';
import { SerproIntegrationError } from './types';
import { 
  getSerproConfig, 
  getConsultarUrl, 
  getAuthHeaders,
  createMtlsAgent,
  mtlsFetch,
  invalidateToken,
} from './auth';
import { 
  normalizeSerproError, 
  parseRateLimitHeaders,
  isSuccess,
  isProcessing,
  isError,
} from './error-normalizer';

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

/** Timeout padrão para requisições */
const DEFAULT_TIMEOUT_MS = 30000;

/** Máximo de retries para erros 5xx */
const MAX_RETRIES = 3;

/** Delay base para exponential backoff (ms) */
const BACKOFF_BASE_MS = 1000;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Aguarda um tempo especificado
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calcula delay com exponential backoff
 */
function calculateBackoff(attempt: number): number {
  return Math.min(BACKOFF_BASE_MS * Math.pow(2, attempt), 30000);
}

/**
 * Cria um identificador CNPJ
 */
export function cnpj(numero: string): Identificador {
  return { numero: numero.replace(/\D/g, ''), tipo: 2 };
}

/**
 * Cria um identificador CPF
 */
export function cpf(numero: string): Identificador {
  return { numero: numero.replace(/\D/g, ''), tipo: 1 };
}

/**
 * Valida CNPJ (formato básico)
 */
function validateCnpj(numero: string): boolean {
  const clean = numero.replace(/\D/g, '');
  return clean.length === 14;
}

/**
 * Valida CPF (formato básico)
 */
function validateCpf(numero: string): boolean {
  const clean = numero.replace(/\D/g, '');
  return clean.length === 11;
}

// ============================================================================
// CLIENTE CONSULTAR
// ============================================================================

export interface ConsultarResult<T> {
  /** Sucesso da operação */
  success: boolean;
  /** Indica se está processando (polling necessário) */
  processing: boolean;
  /** Dados da resposta */
  data?: T;
  /** Erro normalizado (se houver) */
  error?: SerproIntegrationError;
  /** Informações de rate limit */
  rateLimit?: RateLimitInfo;
  /** ID da resposta para correlação */
  idResposta?: string;
  /** Código de status SERPRO (00/01/99) */
  codigoStatus?: string;
  /** Mensagem do SERPRO */
  mensagem?: string;
}

/**
 * Executa uma chamada ao endpoint /Consultar
 * 
 * @param request - Corpo da requisição
 * @param options - Opções de execução
 * @returns Resultado normalizado
 */
export async function consultar<T = Record<string, unknown>>(
  request: ConsultarRequest,
  options: ConsultarOptions = {}
): Promise<ConsultarResult<T>> {
  const {
    modo = 'proprio',
    autenticarProcuradorToken,
    useMtls = process.env.SERPRO_USE_MTLS !== 'false',
    config,
  } = options;

  const cfg = config || getSerproConfig();
  const url = getConsultarUrl(cfg.environment);

  // Validar requisição
  validateRequest(request);

  // Log da operação (sem dados sensíveis)
  console.log(`[SERPRO Consultar] ${request.pedidoDados.idSistema}/${request.pedidoDados.idServico}`, {
    contribuinte: request.contribuinte.numero.substring(0, 8) + '...',
    modo,
    useMtls,
  });

  // Obter headers de autenticação
  const headers = await getAuthHeaders(cfg, autenticarProcuradorToken);

  // Preparar body
  const body = JSON.stringify(request);

  // Executar com retry para erros 5xx
  let lastError: SerproIntegrationError | null = null;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await executeRequest<T>(url, body, headers, useMtls);
      
      // Se rate limited, aguardar e tentar novamente
      if (result.rateLimit?.retryAfter && attempt < MAX_RETRIES) {
        console.log(`[SERPRO Consultar] Rate limited, aguardando ${result.rateLimit.retryAfter}s...`);
        await sleep(result.rateLimit.retryAfter * 1000);
        continue;
      }

      // Se erro 401, invalidar token e tentar novamente
      if (result.error?.httpStatus === 401 && attempt < MAX_RETRIES) {
        console.log('[SERPRO Consultar] Token expirado, renovando...');
        invalidateToken();
        const newHeaders = await getAuthHeaders(cfg, autenticarProcuradorToken);
        Object.assign(headers, newHeaders);
        continue;
      }

      // Se erro 5xx, aguardar com backoff e tentar novamente
      if (result.error?.httpStatus && result.error.httpStatus >= 500 && attempt < MAX_RETRIES) {
        const backoff = calculateBackoff(attempt);
        console.log(`[SERPRO Consultar] Erro ${result.error.httpStatus}, retry em ${backoff}ms...`);
        await sleep(backoff);
        lastError = result.error;
        continue;
      }

      return result;
    } catch (error) {
      // Erro de rede ou timeout
      if (attempt < MAX_RETRIES) {
        const backoff = calculateBackoff(attempt);
        console.log(`[SERPRO Consultar] Erro de rede, retry em ${backoff}ms...`);
        await sleep(backoff);
        continue;
      }
      throw error;
    }
  }

  // Retornar último erro após esgotados os retries
  return {
    success: false,
    processing: false,
    error: lastError || new SerproIntegrationError({
      codigo: 'SYS001',
      categoria: 'SYS',
      mensagem: 'Máximo de tentativas excedido',
      descricao: 'Não foi possível completar a requisição após várias tentativas',
      acaoSugerida: 'Tente novamente mais tarde',
      httpStatus: 500,
      retryable: true,
    }),
  };
}

/**
 * Executa a requisição HTTP
 */
async function executeRequest<T>(
  url: string,
  body: string,
  headers: Record<string, string>,
  useMtls: boolean
): Promise<ConsultarResult<T>> {
  let response: {
    status: number;
    ok: boolean;
    body: string;
    headers: Record<string, string>;
  };

  if (useMtls) {
    const agent = await createMtlsAgent();
    response = await mtlsFetch(url, {
      method: 'POST',
      headers,
      body,
    }, agent);
  } else {
    const fetchResponse = await fetch(url, {
      method: 'POST',
      headers,
      body,
    });
    response = {
      status: fetchResponse.status,
      ok: fetchResponse.ok,
      body: await fetchResponse.text(),
      headers: Object.fromEntries(fetchResponse.headers.entries()),
    };
  }

  // Parse rate limit headers
  const rateLimit = parseRateLimitHeaders(response.headers) || undefined;

  // Se não OK, normalizar erro
  if (!response.ok) {
    const error = normalizeSerproError(response.status, response.body, response.headers);
    return {
      success: false,
      processing: false,
      error: new SerproIntegrationError(error),
      rateLimit,
    };
  }

  // Parse response
  let parsed: ConsultarResponse<T>;
  try {
    parsed = JSON.parse(response.body);
  } catch {
    return {
      success: false,
      processing: false,
      error: new SerproIntegrationError({
        codigo: 'SYS001',
        categoria: 'SYS',
        mensagem: 'Resposta inválida',
        descricao: 'Não foi possível parsear a resposta do SERPRO',
        acaoSugerida: 'Tente novamente',
        httpStatus: response.status,
        retryable: true,
      }),
      rateLimit,
    };
  }

  const { dadosResposta, resposta } = parsed;
  const codigoStatus = dadosResposta.codigoStatus;

  // Verificar código de status
  if (isError(codigoStatus)) {
    // Extrair código de erro da resposta
    const codigoErro = (resposta as any)?.codigoErro || `ERR_${codigoStatus}`;
    const error = normalizeSerproError(response.status, response.body, response.headers);
    
    return {
      success: false,
      processing: false,
      error: new SerproIntegrationError(error),
      rateLimit,
      idResposta: dadosResposta.idResposta,
      codigoStatus,
      mensagem: dadosResposta.mensagem,
    };
  }

  // Processando (polling necessário)
  if (isProcessing(codigoStatus)) {
    return {
      success: true,
      processing: true,
      data: resposta,
      rateLimit,
      idResposta: dadosResposta.idResposta,
      codigoStatus,
      mensagem: dadosResposta.mensagem,
    };
  }

  // Sucesso
  return {
    success: true,
    processing: false,
    data: resposta,
    rateLimit,
    idResposta: dadosResposta.idResposta,
    codigoStatus,
    mensagem: dadosResposta.mensagem,
  };
}

/**
 * Valida requisição antes de enviar
 */
function validateRequest(request: ConsultarRequest): void {
  // Validar contratante
  if (!request.contratante?.numero) {
    throw new Error('contratante.numero é obrigatório');
  }
  if (request.contratante.tipo === 2 && !validateCnpj(request.contratante.numero)) {
    throw new Error('contratante.numero deve ser um CNPJ válido (14 dígitos)');
  }

  // Validar autorPedidoDados
  if (!request.autorPedidoDados?.numero) {
    throw new Error('autorPedidoDados.numero é obrigatório');
  }

  // Validar contribuinte
  if (!request.contribuinte?.numero) {
    throw new Error('contribuinte.numero é obrigatório');
  }
  if (request.contribuinte.tipo === 2 && !validateCnpj(request.contribuinte.numero)) {
    throw new Error('contribuinte.numero deve ser um CNPJ válido (14 dígitos)');
  }
  if (request.contribuinte.tipo === 1 && !validateCpf(request.contribuinte.numero)) {
    throw new Error('contribuinte.numero deve ser um CPF válido (11 dígitos)');
  }

  // Validar pedidoDados
  if (!request.pedidoDados?.idSistema) {
    throw new Error('pedidoDados.idSistema é obrigatório');
  }
  if (!request.pedidoDados?.idServico) {
    throw new Error('pedidoDados.idServico é obrigatório');
  }
}

// ============================================================================
// BUILDERS
// ============================================================================

/**
 * Cria uma requisição Consultar para modo próprio
 * (contratante = autorPedidoDados = contribuinte)
 */
export function buildSelfRequest(
  cnpjProprio: string,
  pedidoDados: PedidoDados
): ConsultarRequest {
  const id = cnpj(cnpjProprio);
  return {
    contratante: id,
    autorPedidoDados: id,
    contribuinte: id,
    pedidoDados,
  };
}

/**
 * Cria uma requisição Consultar para modo terceiros
 * (contratante = autorPedidoDados = procurador, contribuinte = cliente)
 */
export function buildThirdPartyRequest(
  cnpjProcurador: string,
  cnpjCliente: string,
  pedidoDados: PedidoDados
): ConsultarRequest {
  const procurador = cnpj(cnpjProcurador);
  return {
    contratante: procurador,
    autorPedidoDados: procurador,
    contribuinte: cnpj(cnpjCliente),
    pedidoDados,
  };
}

/**
 * Cria uma requisição Consultar para modo software-house
 * (contratante = software-house, autorPedidoDados = procurador, contribuinte = cliente)
 */
export function buildSoftwareHouseRequest(
  cnpjSoftwareHouse: string,
  cnpjProcurador: string,
  cnpjCliente: string,
  pedidoDados: PedidoDados
): ConsultarRequest {
  return {
    contratante: cnpj(cnpjSoftwareHouse),
    autorPedidoDados: cnpj(cnpjProcurador),
    contribuinte: cnpj(cnpjCliente),
    pedidoDados,
  };
}

/**
 * Cria PedidoDados para um serviço
 */
export function buildPedidoDados(
  idSistema: string,
  idServico: string,
  dados: Record<string, unknown> = {}
): PedidoDados {
  return {
    idSistema,
    idServico,
    versaoSistema: '1.0',
    dados: JSON.stringify(dados),
  };
}

// ============================================================================
// HELPER PARA EXECUÇÃO RAW
// ============================================================================

/**
 * Executa uma chamada raw ao /Consultar (para o Console de desenvolvimento)
 * Retorna a resposta completa sem normalização
 */
export async function consultarRaw(
  request: ConsultarRequest,
  options: ConsultarOptions = {}
): Promise<{
  httpStatus: number;
  headers: Record<string, string>;
  body: unknown;
  rateLimit?: RateLimitInfo;
}> {
  const {
    autenticarProcuradorToken,
    useMtls = process.env.SERPRO_USE_MTLS !== 'false',
    config,
  } = options;

  const cfg = config || getSerproConfig();
  const url = getConsultarUrl(cfg.environment);
  const headers = await getAuthHeaders(cfg, autenticarProcuradorToken);
  const body = JSON.stringify(request);

  let response: {
    status: number;
    ok: boolean;
    body: string;
    headers: Record<string, string>;
  };

  if (useMtls) {
    const agent = await createMtlsAgent();
    response = await mtlsFetch(url, {
      method: 'POST',
      headers,
      body,
    }, agent);
  } else {
    const fetchResponse = await fetch(url, {
      method: 'POST',
      headers,
      body,
    });
    response = {
      status: fetchResponse.status,
      ok: fetchResponse.ok,
      body: await fetchResponse.text(),
      headers: Object.fromEntries(fetchResponse.headers.entries()),
    };
  }

  const rateLimit = parseRateLimitHeaders(response.headers) || undefined;

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(response.body);
  } catch {
    parsedBody = response.body;
  }

  return {
    httpStatus: response.status,
    headers: response.headers,
    body: parsedBody,
    rateLimit,
  };
}

