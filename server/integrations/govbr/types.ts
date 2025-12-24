/**
 * Conecta gov.br Types
 * Tipos para integração com APIs governamentais via Conecta gov.br
 */

export interface GovBrConfig {
  /** Client ID da aplicação registrada no Conecta gov.br */
  clientId: string;
  /** Client Secret */
  clientSecret: string;
  /** Ambiente: production ou sandbox */
  environment: 'production' | 'sandbox';
  /** Redirect URI configurado no Conecta */
  redirectUri?: string;
}

export interface OAuthToken {
  /** Token de acesso */
  accessToken: string;
  /** Token de refresh */
  refreshToken?: string;
  /** Tipo do token (Bearer) */
  tokenType: string;
  /** Tempo de expiração em segundos */
  expiresIn: number;
  /** Timestamp de quando foi obtido */
  obtainedAt: number;
  /** Escopos concedidos */
  scope?: string;
}

export interface CnpjBasico {
  /** CNPJ formatado */
  cnpj: string;
  /** Razão Social */
  razaoSocial: string;
  /** Nome Fantasia */
  nomeFantasia?: string;
  /** Situação Cadastral */
  situacao: {
    codigo: number;
    descricao: string;
    data?: string;
  };
  /** Natureza Jurídica */
  naturezaJuridica?: {
    codigo: string;
    descricao: string;
  };
  /** Porte */
  porte?: string;
  /** Endereço */
  endereco?: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
  };
  /** CNAE Principal */
  cnaePrincipal?: {
    codigo: string;
    descricao: string;
  };
  /** Data de abertura */
  dataAbertura?: string;
  /** Email */
  email?: string;
  /** Telefone */
  telefone?: string;
}

export interface GovBrApiError {
  /** Código de erro */
  error: string;
  /** Descrição do erro */
  errorDescription: string;
  /** Status HTTP */
  status: number;
}

export interface RateLimitInfo {
  /** Limite de requisições por segundo */
  perSecond: number;
  /** Limite de requisições por dia */
  perDay: number;
  /** Requisições restantes hoje */
  remainingToday?: number;
  /** Timestamp do reset */
  resetAt?: number;
}


