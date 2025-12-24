/**
 * Conecta gov.br OAuth 2.0 Client
 * 
 * Implementa autenticação OAuth 2.0 para APIs do governo brasileiro
 * via plataforma Conecta gov.br
 * 
 * Documentação: https://www.gov.br/conecta
 */

import type { GovBrConfig, OAuthToken, GovBrApiError } from './types';

const GOVBR_ENDPOINTS = {
  production: {
    authorize: 'https://sso.acesso.gov.br/authorize',
    token: 'https://sso.acesso.gov.br/token',
    userInfo: 'https://sso.acesso.gov.br/userinfo',
  },
  sandbox: {
    authorize: 'https://sso.staging.acesso.gov.br/authorize',
    token: 'https://sso.staging.acesso.gov.br/token',
    userInfo: 'https://sso.staging.acesso.gov.br/userinfo',
  },
};

// Cache de tokens por client
const tokenCache = new Map<string, OAuthToken>();

/**
 * Verifica se um token ainda é válido
 */
function isTokenValid(token: OAuthToken): boolean {
  const now = Date.now();
  const expiresAt = token.obtainedAt + (token.expiresIn * 1000);
  // Considera inválido 60 segundos antes de expirar
  return now < expiresAt - 60000;
}

/**
 * Obtém token de acesso usando Client Credentials (M2M)
 */
export async function getClientCredentialsToken(
  config: GovBrConfig,
  scopes: string[] = ['openid']
): Promise<OAuthToken> {
  const cacheKey = `${config.clientId}:${scopes.join(',')}`;
  
  // Verificar cache
  const cached = tokenCache.get(cacheKey);
  if (cached && isTokenValid(cached)) {
    return cached;
  }
  
  const endpoints = GOVBR_ENDPOINTS[config.environment];
  
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: scopes.join(' '),
  });
  
  const response = await fetch(endpoints.token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  
  if (!response.ok) {
    const error = await response.json() as GovBrApiError;
    throw new Error(`OAuth Error: ${error.error} - ${error.errorDescription}`);
  }
  
  const data = await response.json();
  
  const token: OAuthToken = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenType: data.token_type || 'Bearer',
    expiresIn: data.expires_in || 3600,
    obtainedAt: Date.now(),
    scope: data.scope,
  };
  
  // Cachear token
  tokenCache.set(cacheKey, token);
  
  return token;
}

/**
 * Gera URL de autorização para fluxo Authorization Code
 */
export function getAuthorizationUrl(
  config: GovBrConfig,
  scopes: string[] = ['openid', 'email', 'profile'],
  state?: string
): string {
  const endpoints = GOVBR_ENDPOINTS[config.environment];
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri || '',
    scope: scopes.join(' '),
    state: state || crypto.randomUUID(),
  });
  
  return `${endpoints.authorize}?${params.toString()}`;
}

/**
 * Troca código de autorização por token
 */
export async function exchangeCodeForToken(
  config: GovBrConfig,
  code: string
): Promise<OAuthToken> {
  const endpoints = GOVBR_ENDPOINTS[config.environment];
  
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri || '',
  });
  
  const response = await fetch(endpoints.token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  
  if (!response.ok) {
    const error = await response.json() as GovBrApiError;
    throw new Error(`OAuth Error: ${error.error} - ${error.errorDescription}`);
  }
  
  const data = await response.json();
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenType: data.token_type || 'Bearer',
    expiresIn: data.expires_in || 3600,
    obtainedAt: Date.now(),
    scope: data.scope,
  };
}

/**
 * Renova token usando refresh token
 */
export async function refreshAccessToken(
  config: GovBrConfig,
  refreshToken: string
): Promise<OAuthToken> {
  const endpoints = GOVBR_ENDPOINTS[config.environment];
  
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
  });
  
  const response = await fetch(endpoints.token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  
  if (!response.ok) {
    const error = await response.json() as GovBrApiError;
    throw new Error(`OAuth Error: ${error.error} - ${error.errorDescription}`);
  }
  
  const data = await response.json();
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    tokenType: data.token_type || 'Bearer',
    expiresIn: data.expires_in || 3600,
    obtainedAt: Date.now(),
    scope: data.scope,
  };
}

/**
 * Limpa cache de tokens
 */
export function clearTokenCache(): void {
  tokenCache.clear();
}

/**
 * Remove token específico do cache
 */
export function invalidateToken(clientId: string): void {
  for (const key of tokenCache.keys()) {
    if (key.startsWith(clientId)) {
      tokenCache.delete(key);
    }
  }
}


