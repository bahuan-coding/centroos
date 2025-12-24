/**
 * Integra Contador SERPRO - Tipos
 * 
 * Tipos TypeScript para integração com API Integra Contador
 * Baseado na documentação: docs/integra-contador/
 * 
 * Referências:
 * - 02-autenticacao.md: Autenticação OAuth + mTLS
 * - 07-api-reference.md: Estrutura de requisição/resposta
 * - 06-codigos-retorno.md: Códigos de erro
 */

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

export type SerproEnvironment = 'production' | 'homologacao';

export interface SerproConfig {
  /** Consumer Key da aplicação */
  consumerKey: string;
  /** Consumer Secret */
  consumerSecret: string;
  /** Ambiente: production ou homologacao */
  environment: SerproEnvironment;
  /** CNPJ do contratante (Paycubed) */
  cnpjContratante?: string;
}

// ============================================================================
// AUTENTICAÇÃO
// Ref: 02-autenticacao.md
// ============================================================================

export interface SerproToken {
  /** Token de acesso (Bearer) */
  accessToken: string;
  /** JWT token para header jwt_token */
  jwtToken: string;
  /** Tipo do token (Bearer) */
  tokenType: string;
  /** Tempo de expiração em segundos */
  expiresIn: number;
  /** Timestamp de quando foi obtido */
  obtainedAt: number;
  /** Scope concedido */
  scope?: string;
}

export interface SerproAuthError {
  error: string;
  error_description?: string;
}

// ============================================================================
// ENDPOINT UNIFICADO /Consultar
// Ref: 07-api-reference.md lines 59-116
// ============================================================================

/** Identificador de pessoa (CPF ou CNPJ) */
export interface Identificador {
  /** Número do documento (11 dígitos CPF ou 14 dígitos CNPJ) */
  numero: string;
  /** Tipo: 1 = CPF, 2 = CNPJ */
  tipo: 1 | 2;
}

/** Dados do pedido para o endpoint /Consultar */
export interface PedidoDados {
  /** Identificador do sistema RFB (ex: SITFIS, PGDASD, PROCURACOES) */
  idSistema: string;
  /** Identificador do serviço (ex: SOLICITARSITFIS81, EMITIRSITFIS81) */
  idServico: string;
  /** Versão do sistema (geralmente "1.0") */
  versaoSistema: string;
  /** JSON stringificado com parâmetros específicos do serviço */
  dados: string;
}

/** Request body para POST /Consultar */
export interface ConsultarRequest {
  /** CNPJ de quem contratou o produto SERPRO */
  contratante: Identificador;
  /** CNPJ/CPF de quem está fazendo a requisição */
  autorPedidoDados: Identificador;
  /** CNPJ/CPF do contribuinte sendo consultado */
  contribuinte: Identificador;
  /** Dados do pedido */
  pedidoDados: PedidoDados;
}

/** Dados de resposta padrão */
export interface DadosResposta {
  /** ID único da resposta */
  idResposta?: string;
  /** Código de status: 00 = sucesso, 01 = processando, 99 = erro */
  codigoStatus: '00' | '01' | '99';
  /** Mensagem resumida */
  mensagem: string;
}

/** Response body do endpoint /Consultar */
export interface ConsultarResponse<T = Record<string, unknown>> {
  /** Metadados da resposta */
  dadosResposta: DadosResposta;
  /** Dados específicos do serviço */
  resposta: T;
}

// ============================================================================
// OPÇÕES DE MODO DE ACESSO
// Ref: 01-visao-geral.md, 05-procuracoes.md
// ============================================================================

export type ModoAcesso = 'proprio' | 'terceiros' | 'softwarehouse';

export interface ConsultarOptions {
  /** Modo de acesso: próprio, terceiros com procuração, ou software-house */
  modo?: ModoAcesso;
  /** Token de procurador (quando modo = 'softwarehouse') */
  autenticarProcuradorToken?: string;
  /** Usar mTLS com certificado digital */
  useMtls?: boolean;
  /** Configuração SERPRO customizada */
  config?: SerproConfig;
}

// ============================================================================
// SITFIS - Situação Fiscal
// Ref: 04-sitfis.md
// ============================================================================

/** Status possíveis do SITFIS */
export type SitfisStatus = 'SOLICITADO' | 'PROCESSANDO' | 'CONCLUIDO' | 'ERRO';

/** Resposta de solicitação SITFIS */
export interface SitfisSolicitarResposta {
  /** Protocolo da solicitação */
  protocolo: string;
  /** Data/hora da solicitação */
  dataHoraSolicitacao?: string;
  /** Status inicial */
  status: SitfisStatus;
}

/** Resposta de emissão SITFIS */
export interface SitfisEmitirResposta {
  /** Protocolo */
  protocolo: string;
  /** Data/hora da solicitação original */
  dataHoraSolicitacao?: string;
  /** Data/hora da conclusão */
  dataHoraConclusao?: string;
  /** Status atual */
  status: SitfisStatus;
  /** Tempo estimado em segundos (quando PROCESSANDO) */
  tempoEstimado?: number;
  /** Relatório em PDF base64 (quando CONCLUIDO) */
  relatorioBase64?: string;
}

/** Resposta de erro SITFIS */
export interface SitfisErroResposta {
  /** Código do erro (SIT001, SIT002, etc) */
  codigoErro: string;
  /** Mensagem de erro */
  mensagemErro: string;
}

// ============================================================================
// PROCURAÇÕES
// Ref: 05-procuracoes.md
// ============================================================================

/** Outorgante de uma procuração */
export interface Outorgante {
  /** CNPJ/CPF do outorgante */
  numero: string;
  /** Nome/Razão social */
  nome: string;
}

/** Procuração eletrônica */
export interface Procuracao {
  /** Dados do outorgante (quem concedeu) */
  outorgante: Outorgante;
  /** Códigos dos serviços autorizados (45, 59, 91, 92) */
  servicos: number[];
  /** Data de início da procuração */
  dataInicio: string;
  /** Data de fim da procuração */
  dataFim: string;
  /** Status da procuração */
  status: 'ATIVA' | 'EXPIRADA' | 'REVOGADA';
}

/** Resposta de consulta de procurações */
export interface ConsultarProcuracoesResposta {
  /** Lista de procurações recebidas */
  procuracoes: Procuracao[];
}

/** Códigos de serviço por procuração */
export const CODIGOS_PROCURACAO = {
  PGDASD: 45,
  SITFIS: 59,
  DCTFWEB: 91,
  REGULARIZE: 92,
} as const;

// ============================================================================
// AUTENTICAPROCURADOR
// Ref: 05-procuracoes.md lines 99-184
// ============================================================================

/** Resposta do serviço AUTENTICAPROCURADOR */
export interface AutenticaProcuradorResposta {
  /** Token para usar nas requisições subsequentes */
  autenticar_procurador_token: string;
}

// ============================================================================
// CATÁLOGO DE SERVIÇOS
// Ref: 03-catalogo-servicos.md
// ============================================================================

/** Sistemas disponíveis no Integra Contador */
export const SISTEMAS = {
  SITFIS: {
    id: 'SITFIS',
    nome: 'Situação Fiscal',
    codigoProcuracao: 59,
    servicos: {
      SOLICITAR: 'SOLICITARSITFIS81',
      EMITIR: 'EMITIRSITFIS81',
    },
  },
  PGDASD: {
    id: 'PGDASD',
    nome: 'Simples Nacional',
    codigoProcuracao: 45,
    servicos: {
      CONSEXTRATO: 'CONSEXTRATO16',
      CONSPA: 'CONSPA15',
      GERADAS: 'GERADAS24',
      REGDAS: 'REGDAS17',
    },
  },
  DCTFWEB: {
    id: 'DCTFWEB',
    nome: 'DCTFWeb',
    codigoProcuracao: 91,
    servicos: {
      CONSULTADECLARACAO: 'CONSULTADECLARACAO95',
      CONSULTADARF: 'CONSULTADARF99',
      TRANSMITIRDECLARACAO: 'TRANSMITIRDECLARACAO97',
      GERARDARF: 'GERARDARF98',
    },
  },
  PROCURACOES: {
    id: 'PROCURACOES',
    nome: 'Procurações',
    codigoProcuracao: null,
    servicos: {
      CONSULTAR: 'CONSULTARPROCURACOES',
    },
  },
  AUTENTICAPROCURADOR: {
    id: 'AUTENTICAPROCURADOR',
    nome: 'Autenticar Procurador',
    codigoProcuracao: null,
    servicos: {
      ENVIOXML: 'ENVIOXMLASSINADO81',
    },
  },
} as const;

// ============================================================================
// CÓDIGOS DE ERRO
// Ref: 06-codigos-retorno.md
// ============================================================================

/** Categoria de erro SERPRO */
export type ErroCategoria = 'AUTH' | 'PRO' | 'VAL' | 'SIT' | 'PGD' | 'DCT' | 'SYS';

/** Erro normalizado do SERPRO */
export interface SerproErroNormalizado {
  /** Código do erro (ex: AUTH001, PRO001) */
  codigo: string;
  /** Categoria do erro */
  categoria: ErroCategoria;
  /** Mensagem amigável */
  mensagem: string;
  /** Descrição detalhada */
  descricao: string;
  /** Ação sugerida ao usuário */
  acaoSugerida: string;
  /** Status HTTP original */
  httpStatus: number;
  /** Se deve fazer retry */
  retryable: boolean;
  /** Tempo de retry em segundos (se aplicável) */
  retryAfter?: number;
}

/** Classe de erro SERPRO para throw */
export class SerproIntegrationError extends Error {
  public readonly codigo: string;
  public readonly categoria: ErroCategoria;
  public readonly descricao: string;
  public readonly acaoSugerida: string;
  public readonly httpStatus: number;
  public readonly retryable: boolean;
  public readonly retryAfter?: number;

  constructor(erro: SerproErroNormalizado) {
    super(erro.mensagem);
    this.name = 'SerproIntegrationError';
    this.codigo = erro.codigo;
    this.categoria = erro.categoria;
    this.descricao = erro.descricao;
    this.acaoSugerida = erro.acaoSugerida;
    this.httpStatus = erro.httpStatus;
    this.retryable = erro.retryable;
    this.retryAfter = erro.retryAfter;
  }
}

// ============================================================================
// RATE LIMITING
// Ref: 06-codigos-retorno.md lines 148-168
// ============================================================================

export interface RateLimitInfo {
  /** Limite de requisições por janela */
  limit: number;
  /** Requisições restantes */
  remaining: number;
  /** Timestamp Unix do reset */
  reset: number;
  /** Segundos até poder tentar novamente */
  retryAfter?: number;
}

// ============================================================================
// AUDITORIA
// ============================================================================

export interface SerproAuditLog {
  /** ID único do log */
  id: string;
  /** Timestamp da operação */
  timestamp: Date;
  /** Operação realizada */
  operacao: string;
  /** Sistema consultado */
  idSistema: string;
  /** Serviço chamado */
  idServico: string;
  /** CNPJ do contribuinte consultado */
  cnpjContribuinte: string;
  /** Status HTTP da resposta */
  httpStatus: number;
  /** Código de status SERPRO (00/01/99) */
  codigoStatus: string;
  /** Sucesso da operação */
  sucesso: boolean;
  /** Tempo de resposta em ms */
  latencyMs: number;
  /** Código de erro (se aplicável) */
  codigoErro?: string;
  /** Mensagem (resumida, sem dados sensíveis) */
  mensagem?: string;
}

// ============================================================================
// CONFIGURAÇÃO DE STATUS
// ============================================================================

export interface SerproConfigStatus {
  /** Se a integração está habilitada */
  enabled: boolean;
  /** Ambiente configurado */
  environment: SerproEnvironment;
  /** Se as credenciais estão configuradas */
  credentialsConfigured: boolean;
  /** Se o certificado está configurado e válido */
  certificateValid: boolean;
  /** Dias até expiração do certificado */
  certificateDaysRemaining?: number;
  /** CNPJ do certificado */
  certificateCnpj?: string;
  /** Razão social do certificado */
  certificateRazaoSocial?: string;
  /** Se mTLS está habilitado */
  mtlsEnabled: boolean;
  /** Última vez que a conexão foi testada */
  lastConnectionTest?: Date;
  /** Resultado do último teste */
  lastConnectionSuccess?: boolean;
}
