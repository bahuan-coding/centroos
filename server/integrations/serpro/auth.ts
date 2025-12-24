/**
 * Integra Contador SERPRO - Autenticação OAuth
 * 
 * Cliente OAuth 2.0 para autenticação na API Integra Contador
 * Usa Client Credentials com Basic Auth (Consumer Key:Secret)
 * 
 * IMPORTANTE: Todas as requisições exigem certificado digital e-CNPJ (mTLS)
 * 
 * Referências:
 * - docs/integra-contador/02-autenticacao.md
 * - docs/integra-contador/07-api-reference.md
 */

import type { SerproConfig, SerproToken, SerproAuthError, SerproEnvironment } from './types';
import { createMtlsAgent, mtlsFetch, invalidateMtlsAgent, getMtlsCertificateInfo } from './mtls-client';

// ============================================================================
// ENDPOINTS
// Ref: 07-api-reference.md lines 5-17
// ============================================================================

const AUTH_ENDPOINTS: Record<SerproEnvironment, string> = {
  production: 'https://autenticacao.sapi.serpro.gov.br/authenticate',
  homologacao: 'https://autenticacao-hom.sapi.serpro.gov.br/authenticate',
};

const GATEWAY_ENDPOINTS: Record<SerproEnvironment, string> = {
  production: 'https://gateway.apiserpro.serpro.gov.br',
  homologacao: 'https://gateway-hom.apiserpro.serpro.gov.br',
};

// Cache de token em memória
let cachedToken: SerproToken | null = null;

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

/**
 * Obtém configuração do SERPRO via variáveis de ambiente
 */
export function getSerproConfig(): SerproConfig {
  const consumerKey = process.env.SERPRO_CONSUMER_KEY;
  const consumerSecret = process.env.SERPRO_CONSUMER_SECRET;
  const environment = (process.env.SERPRO_ENVIRONMENT || 'production') as SerproEnvironment;
  const cnpjContratante = process.env.PAYCUBED_CNPJ;

  if (!consumerKey || !consumerSecret) {
    throw new Error('SERPRO_CONSUMER_KEY e SERPRO_CONSUMER_SECRET são obrigatórios');
  }

  // Validar ambiente
  if (environment !== 'production' && environment !== 'homologacao') {
    throw new Error('SERPRO_ENVIRONMENT deve ser "production" ou "homologacao"');
  }

  return { consumerKey, consumerSecret, environment, cnpjContratante };
}

/**
 * Retorna a URL base do gateway para o ambiente configurado
 */
export function getGatewayUrl(environment?: SerproEnvironment): string {
  const env = environment || getSerproConfig().environment;
  return GATEWAY_ENDPOINTS[env];
}

/**
 * Retorna a URL do endpoint /Consultar
 */
export function getConsultarUrl(environment?: SerproEnvironment): string {
  return `${getGatewayUrl(environment)}/integra-contador/v1/Consultar`;
}

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

/**
 * Verifica se o token em cache ainda é válido
 * Ref: 02-autenticacao.md lines 140-148 (margem de 5 minutos recomendada)
 */
function isTokenValid(token: SerproToken): boolean {
  const now = Date.now();
  const expiresAt = token.obtainedAt + (token.expiresIn * 1000);
  // Considera inválido 5 minutos antes de expirar (margem de segurança conforme docs)
  const REFRESH_MARGIN_MS = 5 * 60 * 1000; // 5 minutos
  return now < expiresAt - REFRESH_MARGIN_MS;
}

/**
 * Gera Basic Auth header a partir das credenciais
 * Ref: 02-autenticacao.md lines 66-72
 */
function generateBasicAuth(consumerKey: string, consumerSecret: string): string {
  const credentials = `${consumerKey}:${consumerSecret}`;
  return Buffer.from(credentials).toString('base64');
}

/**
 * Obtém token de acesso via Client Credentials com mTLS
 * 
 * Ref: 02-autenticacao.md
 * - POST /authenticate
 * - Headers: Authorization Basic, Role-Type: TERCEIROS, Content-Type
 * - Body: grant_type=client_credentials
 * - Certificado e-CNPJ obrigatório (mTLS)
 * 
 * @param config - Configuração opcional (usa env vars se não fornecida)
 * @returns Token com accessToken e jwtToken
 */
export async function getAccessToken(config?: SerproConfig): Promise<SerproToken> {
  const cfg = config || getSerproConfig();

  // Verificar cache
  if (cachedToken && isTokenValid(cachedToken)) {
    console.log('[SERPRO Auth] Usando token em cache');
    return cachedToken;
  }

  console.log(`[SERPRO Auth] Solicitando novo token (ambiente: ${cfg.environment})...`);

  const endpoint = AUTH_ENDPOINTS[cfg.environment];
  const basicAuth = generateBasicAuth(cfg.consumerKey, cfg.consumerSecret);

  // Headers conforme 02-autenticacao.md lines 46-52
  const headers: Record<string, string> = {
    'Authorization': `Basic ${basicAuth}`,
    'Role-Type': 'TERCEIROS',
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  // Usar mTLS (certificado digital obrigatório)
  const useMtls = process.env.SERPRO_USE_MTLS !== 'false';
  
  let response: { status: number; ok: boolean; body: string; headers: Record<string, string> };

  if (useMtls) {
    console.log('[SERPRO Auth] Usando mTLS para autenticação');
    const agent = await createMtlsAgent();
    response = await mtlsFetch(endpoint, {
      method: 'POST',
      headers,
      body: 'grant_type=client_credentials',
    }, agent);
  } else {
    // Fallback sem mTLS (apenas para testes locais)
    console.warn('[SERPRO Auth] ⚠️ Autenticação SEM mTLS - apenas para desenvolvimento');
    const fetchResponse = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: 'grant_type=client_credentials',
    });
    response = {
      status: fetchResponse.status,
      ok: fetchResponse.ok,
      body: await fetchResponse.text(),
      headers: Object.fromEntries(fetchResponse.headers.entries()),
    };
  }

  if (!response.ok) {
    let errorData: SerproAuthError;
    try {
      errorData = JSON.parse(response.body) as SerproAuthError;
    } catch {
      errorData = { error: 'unknown', error_description: response.body };
    }
    
    console.error('[SERPRO Auth] Erro na autenticação:', {
      status: response.status,
      error: errorData,
    });
    
    throw new Error(
      `Erro de autenticação SERPRO (${response.status}): ` +
      `${errorData.error} - ${errorData.error_description || 'Sem descrição'}`
    );
  }

  // Parse response
  // Ref: 02-autenticacao.md lines 91-98
  const data = JSON.parse(response.body);

  const token: SerproToken = {
    accessToken: data.access_token,
    jwtToken: data.jwt_token, // Importante: jwt_token é separado do access_token
    tokenType: data.token_type || 'Bearer',
    expiresIn: data.expires_in || 3600,
    obtainedAt: Date.now(),
    scope: data.scope,
  };

  // Validar que recebemos ambos os tokens
  if (!token.accessToken) {
    throw new Error('SERPRO Auth: access_token não retornado');
  }
  if (!token.jwtToken) {
    console.warn('[SERPRO Auth] ⚠️ jwt_token não retornado - algumas APIs podem falhar');
  }

  // Cachear token
  cachedToken = token;

  console.log(`[SERPRO Auth] Token obtido com sucesso (expira em ${token.expiresIn}s)`);

  return token;
}

/**
 * Invalida o token em cache (força nova autenticação)
 */
export function invalidateToken(): void {
  cachedToken = null;
  console.log('[SERPRO Auth] Token invalidado');
}

/**
 * Invalida todos os caches (token + agente mTLS)
 */
export function invalidateAll(): void {
  invalidateToken();
  invalidateMtlsAgent();
  console.log('[SERPRO] Todos os caches invalidados');
}

// ============================================================================
// HEADERS DE REQUISIÇÃO
// Ref: 07-api-reference.md lines 69-74
// ============================================================================

export interface AuthHeaders {
  'Authorization': string;
  'jwt_token': string;
  'Content-Type': string;
}

/**
 * Retorna headers de autorização para requisições à API
 * 
 * Headers obrigatórios:
 * - Authorization: Bearer {access_token}
 * - jwt_token: {jwt_token}
 * - Content-Type: application/json
 * 
 * @param config - Configuração opcional
 * @param autenticarProcuradorToken - Token opcional para modo software-house
 */
export async function getAuthHeaders(
  config?: SerproConfig,
  autenticarProcuradorToken?: string
): Promise<Record<string, string>> {
  const token = await getAccessToken(config);
  
  const headers: Record<string, string> = {
    'Authorization': `${token.tokenType} ${token.accessToken}`,
    'jwt_token': token.jwtToken,
    'Content-Type': 'application/json',
  };

  // Header condicional para modo software-house
  // Ref: 05-procuracoes.md lines 177-184
  if (autenticarProcuradorToken) {
    headers['autenticar_procurador_token'] = autenticarProcuradorToken;
  }

  return headers;
}

// ============================================================================
// INFORMAÇÕES E STATUS
// ============================================================================

/**
 * Informações sobre o token atual (para debug/monitoramento)
 */
export function getTokenInfo(): { 
  cached: boolean; 
  expiresIn?: number; 
  obtainedAt?: Date;
  hasJwtToken?: boolean;
} {
  if (!cachedToken) {
    return { cached: false };
  }

  const now = Date.now();
  const expiresAt = cachedToken.obtainedAt + (cachedToken.expiresIn * 1000);
  const remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));

  return {
    cached: true,
    expiresIn: remainingSeconds,
    obtainedAt: new Date(cachedToken.obtainedAt),
    hasJwtToken: !!cachedToken.jwtToken,
  };
}

/**
 * Testa a conexão com o SERPRO
 * 
 * Verifica:
 * 1. Configuração (env vars)
 * 2. Certificado digital (mTLS)
 * 3. Autenticação OAuth
 */
export async function testConnection(config?: SerproConfig): Promise<{
  success: boolean;
  environment: SerproEnvironment;
  certificateInfo?: Awaited<ReturnType<typeof getMtlsCertificateInfo>>;
  tokenInfo?: ReturnType<typeof getTokenInfo>;
  error?: string;
}> {
  try {
    const cfg = config || getSerproConfig();

    // 1. Verificar certificado
    const certInfo = await getMtlsCertificateInfo();
    
    // 2. Tentar autenticar
    invalidateToken(); // Forçar nova autenticação para testar
    await getAccessToken(cfg);
    
    const tokenInfo = getTokenInfo();

    return {
      success: true,
      environment: cfg.environment,
      certificateInfo: certInfo,
      tokenInfo,
    };
  } catch (error: any) {
    return {
      success: false,
      environment: getSerproConfig().environment,
      error: error.message,
    };
  }
}

// ============================================================================
// EXPORTS PARA COMPATIBILIDADE
// ============================================================================

// Re-exportar funções do mTLS client para conveniência
export { 
  createMtlsAgent, 
  invalidateMtlsAgent, 
  getMtlsCertificateInfo,
  mtlsFetch,
} from './mtls-client';
