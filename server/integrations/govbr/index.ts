/**
 * Conecta gov.br Integration Module
 * 
 * APIs gratuitas do governo brasileiro via plataforma Conecta
 * https://www.gov.br/conecta
 */

export * from './types';
export {
  getClientCredentialsToken,
  getAuthorizationUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  clearTokenCache,
  invalidateToken,
} from './oauth-client';
export {
  consultarCnpj,
  validarCnpjAtivo,
  getRateLimitInfo,
  clearCnpjCache,
  invalidateCnpjCache,
  getCacheStats,
} from './cnpj-client';


