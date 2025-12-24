/**
 * Integra Contador SERPRO - Serviço de Procurações
 * 
 * Consulta e gestão de procurações eletrônicas recebidas
 * 
 * Referência: docs/integra-contador/05-procuracoes.md
 */

import type {
  SerproConfig,
  ConsultarOptions,
  Procuracao,
  ConsultarProcuracoesResposta,
  AutenticaProcuradorResposta,
} from './types';
import { SISTEMAS, CODIGOS_PROCURACAO, SerproIntegrationError } from './types';
import {
  consultar,
  buildSelfRequest,
  buildPedidoDados,
} from './consultar-client';
import { getSerproConfig } from './auth';

// ============================================================================
// TIPOS
// ============================================================================

export interface ProcuracaoComAlerta extends Procuracao {
  /** Dias restantes até expiração */
  diasRestantes: number;
  /** Se está próxima de expirar (< 30 dias) */
  proximaExpiracao: boolean;
  /** Se está expirada */
  expirada: boolean;
}

export interface ConsultarProcuracoesResult {
  /** Sucesso da operação */
  success: boolean;
  /** Lista de procurações */
  procuracoes: ProcuracaoComAlerta[];
  /** Erro (se houver) */
  error?: SerproIntegrationError;
  /** Mensagem informativa */
  mensagem?: string;
}

export interface AutenticarProcuradorResult {
  /** Sucesso da operação */
  success: boolean;
  /** Token para usar nas requisições */
  token?: string;
  /** Erro (se houver) */
  error?: SerproIntegrationError;
  /** Mensagem informativa */
  mensagem?: string;
}

export interface VerificarProcuracaoResult {
  /** Se tem procuração válida */
  temProcuracao: boolean;
  /** Se o serviço específico está autorizado */
  servicoAutorizado: boolean;
  /** Procuração encontrada (se houver) */
  procuracao?: ProcuracaoComAlerta;
  /** Mensagem explicativa */
  mensagem: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function sanitizeCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

function validateCnpj(cnpj: string): void {
  const clean = sanitizeCnpj(cnpj);
  if (clean.length !== 14) {
    throw new Error('CNPJ inválido: deve conter 14 dígitos');
  }
}

/**
 * Calcula dias restantes até uma data
 */
function calcularDiasRestantes(dataFim: string): number {
  const fim = new Date(dataFim);
  const hoje = new Date();
  const diff = fim.getTime() - hoje.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Enriquece procuração com alertas
 */
function enriquecerProcuracao(procuracao: Procuracao): ProcuracaoComAlerta {
  const diasRestantes = calcularDiasRestantes(procuracao.dataFim);
  const expirada = diasRestantes < 0;
  const proximaExpiracao = !expirada && diasRestantes <= 30;

  return {
    ...procuracao,
    diasRestantes: Math.max(0, diasRestantes),
    proximaExpiracao,
    expirada,
    // Atualizar status se expirada
    status: expirada ? 'EXPIRADA' : procuracao.status,
  };
}

// ============================================================================
// FUNÇÕES PRINCIPAIS
// ============================================================================

/**
 * Consulta procurações eletrônicas recebidas
 * 
 * Ref: 05-procuracoes.md lines 186-225
 * 
 * @param options - Opções de execução
 * @returns Lista de procurações com alertas
 */
export async function consultarProcuracoes(
  options: {
    useMtls?: boolean;
    config?: SerproConfig;
  } = {}
): Promise<ConsultarProcuracoesResult> {
  const { useMtls, config } = options;

  const cfg = config || getSerproConfig();
  const cnpjContratante = cfg.cnpjContratante;

  if (!cnpjContratante) {
    throw new Error('CNPJ do contratante não configurado (PAYCUBED_CNPJ)');
  }

  console.log(`[Procurações] Consultando procurações recebidas...`);

  // Construir requisição
  const pedidoDados = buildPedidoDados(
    SISTEMAS.PROCURACOES.id,
    SISTEMAS.PROCURACOES.servicos.CONSULTAR,
    {}
  );

  const request = buildSelfRequest(cnpjContratante, pedidoDados);

  // Executar
  const consultarOptions: ConsultarOptions = {
    modo: 'proprio',
    useMtls,
    config,
  };

  const result = await consultar<ConsultarProcuracoesResposta>(request, consultarOptions);

  if (!result.success || result.error) {
    return {
      success: false,
      procuracoes: [],
      error: result.error,
      mensagem: result.error?.mensagem || 'Erro ao consultar procurações',
    };
  }

  const resposta = result.data!;
  const procuracoes = (resposta.procuracoes || []).map(enriquecerProcuracao);

  console.log(`[Procurações] ${procuracoes.length} procuração(ões) encontrada(s)`);

  // Alertar procurações próximas de expirar
  const proximasExpiracao = procuracoes.filter(p => p.proximaExpiracao);
  if (proximasExpiracao.length > 0) {
    console.warn(`[Procurações] ⚠️ ${proximasExpiracao.length} procuração(ões) expirando em breve`);
  }

  return {
    success: true,
    procuracoes,
    mensagem: result.mensagem,
  };
}

/**
 * Verifica se existe procuração válida para um contribuinte e serviço
 * 
 * @param cnpjContribuinte - CNPJ do contribuinte (outorgante)
 * @param codigoServico - Código do serviço a verificar (ex: 59 para SITFIS)
 * @param options - Opções de execução
 */
export async function verificarProcuracao(
  cnpjContribuinte: string,
  codigoServico: number,
  options: {
    useMtls?: boolean;
    config?: SerproConfig;
  } = {}
): Promise<VerificarProcuracaoResult> {
  validateCnpj(cnpjContribuinte);
  const cnpjClean = sanitizeCnpj(cnpjContribuinte);

  const resultado = await consultarProcuracoes(options);

  if (!resultado.success) {
    return {
      temProcuracao: false,
      servicoAutorizado: false,
      mensagem: resultado.error?.mensagem || 'Erro ao verificar procurações',
    };
  }

  // Procurar procuração do contribuinte
  const procuracao = resultado.procuracoes.find(
    p => sanitizeCnpj(p.outorgante.numero) === cnpjClean
  );

  if (!procuracao) {
    return {
      temProcuracao: false,
      servicoAutorizado: false,
      mensagem: `Não existe procuração do CNPJ ${cnpjClean}. Solicite ao contribuinte que cadastre no e-CAC.`,
    };
  }

  // Verificar se não está expirada
  if (procuracao.expirada || procuracao.status !== 'ATIVA') {
    return {
      temProcuracao: true,
      servicoAutorizado: false,
      procuracao,
      mensagem: `Procuração expirada em ${procuracao.dataFim}. Solicite renovação no e-CAC.`,
    };
  }

  // Verificar se o serviço está autorizado
  const servicoAutorizado = procuracao.servicos.includes(codigoServico);

  if (!servicoAutorizado) {
    const servicoNome = Object.entries(CODIGOS_PROCURACAO)
      .find(([_, cod]) => cod === codigoServico)?.[0] || String(codigoServico);

    return {
      temProcuracao: true,
      servicoAutorizado: false,
      procuracao,
      mensagem: `Serviço ${servicoNome} (código ${codigoServico}) não autorizado na procuração. Solicite inclusão no e-CAC.`,
    };
  }

  // Alerta se próxima de expirar
  let mensagem = 'Procuração válida e serviço autorizado.';
  if (procuracao.proximaExpiracao) {
    mensagem += ` ⚠️ Atenção: expira em ${procuracao.diasRestantes} dias.`;
  }

  return {
    temProcuracao: true,
    servicoAutorizado: true,
    procuracao,
    mensagem,
  };
}

/**
 * Autentica procurador via XML assinado
 * 
 * Usado quando software-house atua em nome de um procurador (contador)
 * 
 * Ref: 05-procuracoes.md lines 99-173
 * 
 * @param xmlAssinado - XML assinado digitalmente pelo procurador
 * @param options - Opções de execução
 */
export async function autenticarProcurador(
  xmlAssinado: string,
  options: {
    useMtls?: boolean;
    config?: SerproConfig;
  } = {}
): Promise<AutenticarProcuradorResult> {
  const { useMtls, config } = options;

  const cfg = config || getSerproConfig();
  const cnpjContratante = cfg.cnpjContratante;

  if (!cnpjContratante) {
    throw new Error('CNPJ do contratante não configurado (PAYCUBED_CNPJ)');
  }

  console.log(`[Procurações] Autenticando procurador via XML assinado...`);

  // Construir requisição
  const pedidoDados = buildPedidoDados(
    SISTEMAS.AUTENTICAPROCURADOR.id,
    SISTEMAS.AUTENTICAPROCURADOR.servicos.ENVIOXML,
    { xmlAssinado }
  );

  const request = buildSelfRequest(cnpjContratante, pedidoDados);

  // Executar
  const consultarOptions: ConsultarOptions = {
    modo: 'proprio',
    useMtls,
    config,
  };

  const result = await consultar<AutenticaProcuradorResposta>(request, consultarOptions);

  if (!result.success || result.error) {
    return {
      success: false,
      error: result.error,
      mensagem: result.error?.mensagem || 'Erro ao autenticar procurador',
    };
  }

  const resposta = result.data!;
  const token = resposta.autenticar_procurador_token;

  if (!token) {
    return {
      success: false,
      mensagem: 'Token de procurador não retornado',
    };
  }

  console.log(`[Procurações] Procurador autenticado com sucesso`);

  return {
    success: true,
    token,
    mensagem: result.mensagem,
  };
}

/**
 * Lista procurações próximas de expirar
 * 
 * @param diasAlerta - Dias de antecedência para alertar (default: 30)
 * @param options - Opções de execução
 */
export async function listarProcuracoesExpirando(
  diasAlerta: number = 30,
  options: {
    useMtls?: boolean;
    config?: SerproConfig;
  } = {}
): Promise<{
  success: boolean;
  procuracoes: ProcuracaoComAlerta[];
  error?: SerproIntegrationError;
}> {
  const resultado = await consultarProcuracoes(options);

  if (!resultado.success) {
    return {
      success: false,
      procuracoes: [],
      error: resultado.error,
    };
  }

  const expirando = resultado.procuracoes.filter(
    p => p.diasRestantes <= diasAlerta && !p.expirada
  );

  return {
    success: true,
    procuracoes: expirando,
  };
}

/**
 * Obtém descrição legível do código de serviço
 */
export function getServicoNome(codigo: number): string {
  const entry = Object.entries(CODIGOS_PROCURACAO).find(([_, cod]) => cod === codigo);
  return entry ? entry[0] : `Serviço ${codigo}`;
}

/**
 * Lista todos os códigos de procuração disponíveis
 */
export function listarCodigosProcuracao(): Array<{ codigo: number; nome: string }> {
  return Object.entries(CODIGOS_PROCURACAO).map(([nome, codigo]) => ({
    codigo,
    nome,
  }));
}

