/**
 * Integra Contador SERPRO - Exports
 * 
 * Exporta todas as funções e tipos do módulo de integração SERPRO
 */

// ============================================================================
// TIPOS
// ============================================================================

export * from './types';

// ============================================================================
// AUTENTICAÇÃO
// ============================================================================

export {
  getSerproConfig,
  getGatewayUrl,
  getConsultarUrl,
  getAccessToken,
  invalidateToken,
  invalidateAll,
  getAuthHeaders,
  getTokenInfo,
  testConnection,
  // Re-exports do mTLS
  createMtlsAgent,
  invalidateMtlsAgent,
  getMtlsCertificateInfo,
  mtlsFetch,
} from './auth';

// ============================================================================
// CLIENTE CONSULTAR
// ============================================================================

export {
  consultar,
  consultarRaw,
  cnpj,
  cpf,
  buildSelfRequest,
  buildThirdPartyRequest,
  buildSoftwareHouseRequest,
  buildPedidoDados,
  type ConsultarResult,
} from './consultar-client';

// ============================================================================
// NORMALIZAÇÃO DE ERROS
// ============================================================================

export {
  normalizeErrorCode,
  normalizeSerproError,
  parseRateLimitHeaders,
  createSerproError,
  isRetryableError,
  shouldRetryBasedOnStatus,
  isProcessing,
  isSuccess,
  isError,
} from './error-normalizer';

// ============================================================================
// SITFIS - SITUAÇÃO FISCAL
// ============================================================================

export {
  solicitarSitfis,
  emitirSitfis,
  consultarSitfis,
  verificarStatusSitfis,
  pdfBase64ToBuffer,
  generatePdfFilename,
  type SitfisOptions,
  type SitfisResult,
} from './sitfis-service';

// ============================================================================
// PROCURAÇÕES
// ============================================================================

export {
  consultarProcuracoes,
  verificarProcuracao,
  autenticarProcurador,
  listarProcuracoesExpirando,
  getServicoNome,
  listarCodigosProcuracao,
  type ProcuracaoComAlerta,
  type ConsultarProcuracoesResult,
  type AutenticarProcuradorResult,
  type VerificarProcuracaoResult,
} from './procuracoes-service';
