/**
 * Integra Contador SERPRO - Normalização de Erros
 * 
 * Normaliza erros HTTP e códigos de erro SERPRO para mensagens amigáveis
 * 
 * Referência: docs/integra-contador/06-codigos-retorno.md
 */

import type { 
  SerproErroNormalizado, 
  ErroCategoria,
  RateLimitInfo,
  DadosResposta,
} from './types';
import { SerproIntegrationError } from './types';

// ============================================================================
// MAPEAMENTO DE CÓDIGOS DE ERRO
// Ref: 06-codigos-retorno.md lines 76-144
// ============================================================================

interface ErrorDefinition {
  mensagem: string;
  descricao: string;
  acaoSugerida: string;
  retryable: boolean;
}

const ERROR_DEFINITIONS: Record<string, ErrorDefinition> = {
  // Autenticação (AUTH)
  AUTH001: {
    mensagem: 'Token inválido',
    descricao: 'Bearer token expirado ou malformado',
    acaoSugerida: 'O sistema irá renovar o token automaticamente',
    retryable: true,
  },
  AUTH002: {
    mensagem: 'JWT inválido',
    descricao: 'jwt_token ausente ou inválido',
    acaoSugerida: 'Verifique se o jwt_token está sendo enviado no header',
    retryable: true,
  },
  AUTH003: {
    mensagem: 'Certificado inválido',
    descricao: 'Problema com certificado mTLS',
    acaoSugerida: 'Verifique se o certificado e-CNPJ está configurado corretamente',
    retryable: false,
  },
  AUTH004: {
    mensagem: 'Certificado expirado',
    descricao: 'Certificado digital vencido',
    acaoSugerida: 'Renove o certificado digital e-CNPJ',
    retryable: false,
  },
  AUTH005: {
    mensagem: 'CNPJ não autorizado',
    descricao: 'CNPJ não está no contrato SERPRO',
    acaoSugerida: 'Verifique o contrato SERPRO e o CNPJ do certificado',
    retryable: false,
  },

  // Procuração (PRO)
  PRO001: {
    mensagem: 'Procuração não encontrada',
    descricao: 'Não existe procuração cadastrada para este contribuinte',
    acaoSugerida: 'O contribuinte deve cadastrar procuração no e-CAC',
    retryable: false,
  },
  PRO002: {
    mensagem: 'Procuração expirada',
    descricao: 'A procuração está com validade vencida',
    acaoSugerida: 'Solicite ao contribuinte que renove a procuração no e-CAC',
    retryable: false,
  },
  PRO003: {
    mensagem: 'Serviço não autorizado',
    descricao: 'O código do serviço não está incluído na procuração',
    acaoSugerida: 'Solicite ao contribuinte que adicione o código do serviço na procuração',
    retryable: false,
  },
  PRO004: {
    mensagem: 'Procurador inválido',
    descricao: 'CNPJ do procurador incorreto na procuração',
    acaoSugerida: 'Verifique os dados da procuração no e-CAC',
    retryable: false,
  },
  PRO005: {
    mensagem: 'Token procurador expirado',
    descricao: 'Token do AUTENTICAPROCURADOR expirado',
    acaoSugerida: 'Renove a autenticação do procurador',
    retryable: true,
  },

  // Validação (VAL)
  VAL001: {
    mensagem: 'CNPJ inválido',
    descricao: 'Formato incorreto ou dígito verificador errado',
    acaoSugerida: 'Corrija o CNPJ informado',
    retryable: false,
  },
  VAL002: {
    mensagem: 'CPF inválido',
    descricao: 'Formato incorreto ou dígito verificador errado',
    acaoSugerida: 'Corrija o CPF informado',
    retryable: false,
  },
  VAL003: {
    mensagem: 'Campo obrigatório ausente',
    descricao: 'Um campo requerido não foi informado',
    acaoSugerida: 'Verifique os campos obrigatórios da requisição',
    retryable: false,
  },
  VAL004: {
    mensagem: 'Formato inválido',
    descricao: 'Valor fora do padrão esperado',
    acaoSugerida: 'Corrija o formato dos dados informados',
    retryable: false,
  },
  VAL005: {
    mensagem: 'Sistema não encontrado',
    descricao: 'idSistema inexistente no catálogo',
    acaoSugerida: 'Verifique o catálogo de sistemas disponíveis',
    retryable: false,
  },
  VAL006: {
    mensagem: 'Serviço não encontrado',
    descricao: 'idServico inexistente para o sistema',
    acaoSugerida: 'Verifique o catálogo de serviços do sistema',
    retryable: false,
  },

  // SITFIS (SIT)
  SIT001: {
    mensagem: 'Contribuinte não encontrado',
    descricao: 'CNPJ não cadastrado na RFB',
    acaoSugerida: 'Verifique se o CNPJ está correto',
    retryable: false,
  },
  SIT002: {
    mensagem: 'Serviço SITFIS indisponível',
    descricao: 'Manutenção ou indisponibilidade da RFB',
    acaoSugerida: 'Aguarde alguns minutos e tente novamente',
    retryable: true,
  },
  SIT003: {
    mensagem: 'Protocolo não encontrado',
    descricao: 'Protocolo inexistente ou expirado',
    acaoSugerida: 'Solicite um novo relatório',
    retryable: false,
  },
  SIT004: {
    mensagem: 'Relatório expirado',
    descricao: 'Prazo para emissão do relatório expirou',
    acaoSugerida: 'Solicite um novo relatório',
    retryable: false,
  },
  SIT005: {
    mensagem: 'Erro ao gerar relatório',
    descricao: 'Falha interna na geração do relatório',
    acaoSugerida: 'Tente novamente em alguns minutos',
    retryable: true,
  },

  // PGDAS-D (PGD)
  PGD001: {
    mensagem: 'Não optante pelo Simples',
    descricao: 'CNPJ não é optante do Simples Nacional',
    acaoSugerida: 'Verifique o regime tributário do contribuinte',
    retryable: false,
  },
  PGD002: {
    mensagem: 'Período não encontrado',
    descricao: 'Período de apuração não existe',
    acaoSugerida: 'Verifique o período informado',
    retryable: false,
  },
  PGD003: {
    mensagem: 'DAS já emitido',
    descricao: 'Já existe DAS para o período',
    acaoSugerida: 'Consulte o DAS existente',
    retryable: false,
  },
  PGD004: {
    mensagem: 'Valor zerado',
    descricao: 'Não há débito no período',
    acaoSugerida: 'Verifique a apuração do período',
    retryable: false,
  },

  // DCTFWEB (DCT)
  DCT001: {
    mensagem: 'Declaração não encontrada',
    descricao: 'Não existe declaração para o período',
    acaoSugerida: 'Crie uma nova declaração',
    retryable: false,
  },
  DCT002: {
    mensagem: 'Declaração já transmitida',
    descricao: 'A declaração já foi transmitida anteriormente',
    acaoSugerida: 'Consulte o recibo de transmissão',
    retryable: false,
  },
  DCT003: {
    mensagem: 'Período encerrado',
    descricao: 'Fora do prazo de entrega',
    acaoSugerida: 'Verifique o calendário de obrigações',
    retryable: false,
  },
  DCT004: {
    mensagem: 'Pendências impeditivas',
    descricao: 'Existem pendências que impedem a transmissão',
    acaoSugerida: 'Resolva as pendências antes de transmitir',
    retryable: false,
  },

  // Sistema (SYS)
  SYS001: {
    mensagem: 'Erro interno',
    descricao: 'Falha no gateway SERPRO',
    acaoSugerida: 'Tente novamente em alguns minutos',
    retryable: true,
  },
  SYS002: {
    mensagem: 'Timeout',
    descricao: 'Tempo de resposta excedido',
    acaoSugerida: 'Tente novamente',
    retryable: true,
  },
  SYS003: {
    mensagem: 'Serviço RFB offline',
    descricao: 'Sistemas da RFB indisponíveis',
    acaoSugerida: 'Aguarde a disponibilidade do serviço',
    retryable: true,
  },
  SYS004: {
    mensagem: 'Manutenção programada',
    descricao: 'Janela de manutenção ativa',
    acaoSugerida: 'Tente fora do horário de manutenção',
    retryable: true,
  },
};

// ============================================================================
// MAPEAMENTO HTTP STATUS
// Ref: 06-codigos-retorno.md lines 5-31
// ============================================================================

function getDefaultErrorForHttpStatus(status: number): Omit<SerproErroNormalizado, 'codigo'> {
  switch (status) {
    case 400:
      return {
        categoria: 'VAL',
        mensagem: 'Requisição inválida',
        descricao: 'A requisição contém dados inválidos ou mal formatados',
        acaoSugerida: 'Verifique os dados enviados',
        httpStatus: 400,
        retryable: false,
      };
    case 401:
      return {
        categoria: 'AUTH',
        mensagem: 'Não autorizado',
        descricao: 'Token expirado ou inválido',
        acaoSugerida: 'O sistema irá renovar o token automaticamente',
        httpStatus: 401,
        retryable: true,
      };
    case 403:
      return {
        categoria: 'PRO',
        mensagem: 'Acesso negado',
        descricao: 'Sem permissão para acessar este recurso',
        acaoSugerida: 'Verifique se existe procuração válida no e-CAC',
        httpStatus: 403,
        retryable: false,
      };
    case 404:
      return {
        categoria: 'VAL',
        mensagem: 'Recurso não encontrado',
        descricao: 'O recurso solicitado não existe',
        acaoSugerida: 'Verifique a URL e os parâmetros',
        httpStatus: 404,
        retryable: false,
      };
    case 429:
      return {
        categoria: 'SYS',
        mensagem: 'Limite de requisições excedido',
        descricao: 'Rate limit atingido',
        acaoSugerida: 'Aguarde antes de tentar novamente',
        httpStatus: 429,
        retryable: true,
      };
    case 500:
      return {
        categoria: 'SYS',
        mensagem: 'Erro interno do servidor',
        descricao: 'Erro interno do SERPRO',
        acaoSugerida: 'Tente novamente em alguns minutos',
        httpStatus: 500,
        retryable: true,
      };
    case 502:
      return {
        categoria: 'SYS',
        mensagem: 'Erro de gateway',
        descricao: 'Erro de comunicação com a RFB',
        acaoSugerida: 'Tente novamente em alguns minutos',
        httpStatus: 502,
        retryable: true,
      };
    case 503:
      return {
        categoria: 'SYS',
        mensagem: 'Serviço indisponível',
        descricao: 'Serviço temporariamente indisponível',
        acaoSugerida: 'Aguarde a disponibilidade do serviço',
        httpStatus: 503,
        retryable: true,
      };
    case 504:
      return {
        categoria: 'SYS',
        mensagem: 'Timeout do gateway',
        descricao: 'Timeout na comunicação com a RFB',
        acaoSugerida: 'Tente novamente',
        httpStatus: 504,
        retryable: true,
      };
    default:
      return {
        categoria: 'SYS',
        mensagem: `Erro HTTP ${status}`,
        descricao: 'Erro não mapeado',
        acaoSugerida: 'Entre em contato com o suporte',
        httpStatus: status,
        retryable: status >= 500,
      };
  }
}

// ============================================================================
// FUNÇÕES DE NORMALIZAÇÃO
// ============================================================================

/**
 * Extrai categoria do código de erro (ex: AUTH001 -> AUTH)
 */
function extractCategory(codigo: string): ErroCategoria {
  const match = codigo.match(/^([A-Z]+)/);
  if (match) {
    const cat = match[1] as ErroCategoria;
    if (['AUTH', 'PRO', 'VAL', 'SIT', 'PGD', 'DCT', 'SYS'].includes(cat)) {
      return cat;
    }
  }
  return 'SYS';
}

/**
 * Normaliza um código de erro SERPRO
 */
export function normalizeErrorCode(
  codigo: string,
  httpStatus: number,
  retryAfter?: number
): SerproErroNormalizado {
  const definition = ERROR_DEFINITIONS[codigo];
  
  if (definition) {
    return {
      codigo,
      categoria: extractCategory(codigo),
      mensagem: definition.mensagem,
      descricao: definition.descricao,
      acaoSugerida: definition.acaoSugerida,
      httpStatus,
      retryable: definition.retryable,
      retryAfter,
    };
  }

  // Erro não mapeado - usar default baseado no HTTP status
  const defaultError = getDefaultErrorForHttpStatus(httpStatus);
  return {
    codigo,
    ...defaultError,
    retryAfter,
  };
}

/**
 * Normaliza resposta de erro do SERPRO
 * 
 * Parseia diferentes formatos de resposta de erro:
 * - { dadosResposta: { codigoStatus: '99', mensagem }, resposta: { codigoErro, mensagemErro } }
 * - { error, error_description }
 * - { codigo, mensagem }
 */
export function normalizeSerproError(
  httpStatus: number,
  body: string | Record<string, unknown>,
  headers?: Record<string, string>
): SerproErroNormalizado {
  // Extrair Retry-After se presente
  const retryAfter = headers?.['retry-after'] 
    ? parseInt(headers['retry-after'], 10) 
    : undefined;

  // Parsear body se string
  let parsed: Record<string, unknown>;
  if (typeof body === 'string') {
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = { mensagem: body };
    }
  } else {
    parsed = body;
  }

  // Formato 1: Resposta padrão do Integra Contador
  if (parsed.dadosResposta && parsed.resposta) {
    const dadosResposta = parsed.dadosResposta as DadosResposta;
    const resposta = parsed.resposta as Record<string, unknown>;
    
    const codigoErro = (resposta.codigoErro as string) || `HTTP_${httpStatus}`;
    
    // Usar mensagemErro da resposta ou mensagem do dadosResposta
    const mensagemOriginal = (resposta.mensagemErro as string) 
      || dadosResposta.mensagem 
      || 'Erro desconhecido';

    const normalized = normalizeErrorCode(codigoErro, httpStatus, retryAfter);
    
    // Sobrescrever descrição se tiver detalhes específicos
    if (resposta.detalhes) {
      normalized.descricao = resposta.detalhes as string;
    }

    return normalized;
  }

  // Formato 2: Erro OAuth
  if (parsed.error) {
    const code = parsed.error === 'invalid_token' ? 'AUTH001' 
      : parsed.error === 'unauthorized' ? 'AUTH001'
      : `AUTH_${parsed.error}`.toUpperCase();
    
    return normalizeErrorCode(code, httpStatus, retryAfter);
  }

  // Formato 3: Erro simples
  if (parsed.codigo) {
    return normalizeErrorCode(
      parsed.codigo as string, 
      httpStatus, 
      retryAfter
    );
  }

  // Fallback: usar HTTP status
  return normalizeErrorCode(`HTTP_${httpStatus}`, httpStatus, retryAfter);
}

/**
 * Extrai informações de rate limit dos headers
 * Ref: 06-codigos-retorno.md lines 148-168
 */
export function parseRateLimitHeaders(headers: Record<string, string>): RateLimitInfo | null {
  const limit = headers['x-ratelimit-limit'];
  const remaining = headers['x-ratelimit-remaining'];
  const reset = headers['x-ratelimit-reset'];
  const retryAfter = headers['retry-after'];

  if (!limit && !remaining && !reset) {
    return null;
  }

  return {
    limit: limit ? parseInt(limit, 10) : 60,
    remaining: remaining ? parseInt(remaining, 10) : 0,
    reset: reset ? parseInt(reset, 10) : Math.floor(Date.now() / 1000) + 60,
    retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
  };
}

/**
 * Cria um SerproIntegrationError a partir da resposta HTTP
 */
export function createSerproError(
  httpStatus: number,
  body: string | Record<string, unknown>,
  headers?: Record<string, string>
): SerproIntegrationError {
  const normalized = normalizeSerproError(httpStatus, body, headers);
  return new SerproIntegrationError(normalized);
}

/**
 * Verifica se um erro é retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof SerproIntegrationError) {
    return error.retryable;
  }
  return false;
}

/**
 * Verifica se deve fazer retry baseado no codigoStatus
 * Ref: 06-codigos-retorno.md lines 66-72
 */
export function shouldRetryBasedOnStatus(codigoStatus: string): boolean {
  // 01 = Processando - deve fazer polling, não retry
  // 99 = Erro - verificar se é retryable
  // 00 = Sucesso - não retry
  return false; // Retry é baseado no código de erro específico, não no status geral
}

/**
 * Verifica se a resposta indica processamento em andamento
 */
export function isProcessing(codigoStatus: string): boolean {
  return codigoStatus === '01';
}

/**
 * Verifica se a resposta indica sucesso
 */
export function isSuccess(codigoStatus: string): boolean {
  return codigoStatus === '00';
}

/**
 * Verifica se a resposta indica erro
 */
export function isError(codigoStatus: string): boolean {
  return codigoStatus === '99';
}

