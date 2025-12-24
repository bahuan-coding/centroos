/**
 * Integra Contador SERPRO - Serviço SITFIS
 * 
 * Serviço de Situação Fiscal - Consulta e emissão de relatório
 * 
 * Fluxo (Ref: 04-sitfis.md):
 * 1. SOLICITAR (SOLICITARSITFIS81) → retorna protocolo
 * 2. AGUARDAR (polling)
 * 3. EMITIR (EMITIRSITFIS81) → retorna PDF em base64
 * 
 * Status possíveis: SOLICITADO → PROCESSANDO → CONCLUIDO | ERRO
 */

import type {
  SerproConfig,
  ConsultarOptions,
  SitfisSolicitarResposta,
  SitfisEmitirResposta,
  SitfisStatus,
  ModoAcesso,
} from './types';
import { SISTEMAS, SerproIntegrationError } from './types';
import {
  consultar,
  buildSelfRequest,
  buildThirdPartyRequest,
  buildSoftwareHouseRequest,
  buildPedidoDados,
  type ConsultarResult,
} from './consultar-client';
import { getSerproConfig } from './auth';

// ============================================================================
// CONFIGURAÇÃO
// Ref: 04-sitfis.md lines 225-247
// ============================================================================

/** Intervalos de polling em ms (crescente) */
const POLLING_INTERVALS = [
  2000,   // 2 segundos
  5000,   // 5 segundos
  10000,  // 10 segundos
  30000,  // 30 segundos
];

/** Número máximo de tentativas de polling */
const MAX_POLLING_ATTEMPTS = 20;

/** Timeout total para o fluxo completo (5 minutos) */
const TOTAL_TIMEOUT_MS = 5 * 60 * 1000;

// ============================================================================
// HELPERS
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sanitizeCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

function validateCnpj(cnpj: string): void {
  const clean = sanitizeCnpj(cnpj);
  if (clean.length !== 14) {
    throw new Error('CNPJ inválido: deve conter 14 dígitos');
  }
}

// ============================================================================
// OPÇÕES DO SERVIÇO
// ============================================================================

export interface SitfisOptions {
  /** Modo de acesso: próprio, terceiros, ou software-house */
  modo?: ModoAcesso;
  /** CNPJ do procurador (obrigatório para modo terceiros/softwarehouse) */
  cnpjProcurador?: string;
  /** Token de procurador (obrigatório para modo softwarehouse) */
  autenticarProcuradorToken?: string;
  /** Usar mTLS com certificado digital */
  useMtls?: boolean;
  /** Configuração SERPRO customizada */
  config?: SerproConfig;
  /** Callback para progresso do polling */
  onProgress?: (status: SitfisStatus, tentativa: number, maxTentativas: number) => void;
}

// ============================================================================
// RESULTADO DO SERVIÇO
// ============================================================================

export interface SitfisResult {
  /** Sucesso da operação */
  success: boolean;
  /** Protocolo da solicitação */
  protocolo?: string;
  /** Status final */
  status: SitfisStatus;
  /** Data/hora da solicitação */
  dataHoraSolicitacao?: string;
  /** Data/hora da conclusão */
  dataHoraConclusao?: string;
  /** Relatório em PDF base64 (quando CONCLUIDO) */
  relatorioBase64?: string;
  /** Tempo estimado em segundos (quando PROCESSANDO) */
  tempoEstimado?: number;
  /** Erro (se houver) */
  error?: SerproIntegrationError;
  /** Mensagem informativa */
  mensagem?: string;
}

// ============================================================================
// FUNÇÕES PRINCIPAIS
// ============================================================================

/**
 * Solicita relatório de situação fiscal
 * 
 * Ref: 04-sitfis.md lines 37-124
 * 
 * @param cnpjContribuinte - CNPJ do contribuinte a consultar
 * @param options - Opções de execução
 * @returns Protocolo e status inicial
 */
export async function solicitarSitfis(
  cnpjContribuinte: string,
  options: SitfisOptions = {}
): Promise<SitfisResult> {
  const {
    modo = 'proprio',
    cnpjProcurador,
    autenticarProcuradorToken,
    useMtls,
    config,
  } = options;

  validateCnpj(cnpjContribuinte);
  const cnpjClean = sanitizeCnpj(cnpjContribuinte);

  console.log(`[SITFIS] Solicitando situação fiscal para CNPJ: ${cnpjClean.substring(0, 8)}...`);

  // Obter CNPJ do contratante
  const cfg = config || getSerproConfig();
  const cnpjContratante = cfg.cnpjContratante || cnpjClean;

  // Construir pedidoDados
  const pedidoDados = buildPedidoDados(
    SISTEMAS.SITFIS.id,
    SISTEMAS.SITFIS.servicos.SOLICITAR,
    {} // dados vazios para solicitar
  );

  // Construir requisição baseada no modo
  let request;
  switch (modo) {
    case 'proprio':
      request = buildSelfRequest(cnpjClean, pedidoDados);
      break;
    case 'terceiros':
      if (!cnpjProcurador) {
        throw new Error('cnpjProcurador é obrigatório para modo terceiros');
      }
      request = buildThirdPartyRequest(cnpjProcurador, cnpjClean, pedidoDados);
      break;
    case 'softwarehouse':
      if (!cnpjProcurador) {
        throw new Error('cnpjProcurador é obrigatório para modo softwarehouse');
      }
      request = buildSoftwareHouseRequest(cnpjContratante, cnpjProcurador, cnpjClean, pedidoDados);
      break;
  }

  // Executar requisição
  const consultarOptions: ConsultarOptions = {
    modo,
    autenticarProcuradorToken,
    useMtls,
    config,
  };

  const result = await consultar<SitfisSolicitarResposta>(request, consultarOptions);

  if (!result.success || result.error) {
    return {
      success: false,
      status: 'ERRO',
      error: result.error,
      mensagem: result.error?.mensagem || 'Erro ao solicitar situação fiscal',
    };
  }

  const resposta = result.data!;

  console.log(`[SITFIS] Solicitação criada - Protocolo: ${resposta.protocolo}`);

  return {
    success: true,
    protocolo: resposta.protocolo,
    status: resposta.status || 'SOLICITADO',
    dataHoraSolicitacao: resposta.dataHoraSolicitacao,
    mensagem: result.mensagem,
  };
}

/**
 * Emite (obtém) relatório de situação fiscal
 * 
 * Ref: 04-sitfis.md lines 128-201
 * 
 * @param protocolo - Protocolo retornado pela solicitação
 * @param cnpjContribuinte - CNPJ do contribuinte
 * @param options - Opções de execução
 * @returns Status e PDF (se disponível)
 */
export async function emitirSitfis(
  protocolo: string,
  cnpjContribuinte: string,
  options: SitfisOptions = {}
): Promise<SitfisResult> {
  const {
    modo = 'proprio',
    cnpjProcurador,
    autenticarProcuradorToken,
    useMtls,
    config,
  } = options;

  validateCnpj(cnpjContribuinte);
  const cnpjClean = sanitizeCnpj(cnpjContribuinte);

  console.log(`[SITFIS] Emitindo relatório - Protocolo: ${protocolo}`);

  // Obter CNPJ do contratante
  const cfg = config || getSerproConfig();
  const cnpjContratante = cfg.cnpjContratante || cnpjClean;

  // Construir pedidoDados com protocolo
  const pedidoDados = buildPedidoDados(
    SISTEMAS.SITFIS.id,
    SISTEMAS.SITFIS.servicos.EMITIR,
    { protocolo }
  );

  // Construir requisição baseada no modo
  let request;
  switch (modo) {
    case 'proprio':
      request = buildSelfRequest(cnpjClean, pedidoDados);
      break;
    case 'terceiros':
      if (!cnpjProcurador) {
        throw new Error('cnpjProcurador é obrigatório para modo terceiros');
      }
      request = buildThirdPartyRequest(cnpjProcurador, cnpjClean, pedidoDados);
      break;
    case 'softwarehouse':
      if (!cnpjProcurador) {
        throw new Error('cnpjProcurador é obrigatório para modo softwarehouse');
      }
      request = buildSoftwareHouseRequest(cnpjContratante, cnpjProcurador, cnpjClean, pedidoDados);
      break;
  }

  // Executar requisição
  const consultarOptions: ConsultarOptions = {
    modo,
    autenticarProcuradorToken,
    useMtls,
    config,
  };

  const result = await consultar<SitfisEmitirResposta>(request, consultarOptions);

  if (!result.success || result.error) {
    return {
      success: false,
      protocolo,
      status: 'ERRO',
      error: result.error,
      mensagem: result.error?.mensagem || 'Erro ao emitir relatório',
    };
  }

  const resposta = result.data!;

  // Verificar status
  if (result.processing || resposta.status === 'PROCESSANDO') {
    return {
      success: true,
      protocolo,
      status: 'PROCESSANDO',
      tempoEstimado: resposta.tempoEstimado,
      mensagem: result.mensagem || 'Relatório em processamento',
    };
  }

  if (resposta.status === 'CONCLUIDO') {
    console.log(`[SITFIS] Relatório disponível - Protocolo: ${protocolo}`);
    return {
      success: true,
      protocolo,
      status: 'CONCLUIDO',
      dataHoraSolicitacao: resposta.dataHoraSolicitacao,
      dataHoraConclusao: resposta.dataHoraConclusao,
      relatorioBase64: resposta.relatorioBase64,
      mensagem: result.mensagem || 'Relatório disponível',
    };
  }

  // Outros status (SOLICITADO ou ERRO)
  return {
    success: resposta.status !== 'ERRO',
    protocolo,
    status: resposta.status,
    mensagem: result.mensagem,
  };
}

/**
 * Consulta situação fiscal completa (solicitar + polling + emitir)
 * 
 * Executa o fluxo completo:
 * 1. Solicita o relatório
 * 2. Aguarda processamento com polling
 * 3. Retorna o PDF quando disponível
 * 
 * @param cnpjContribuinte - CNPJ do contribuinte
 * @param options - Opções de execução
 * @returns Resultado com PDF ou erro
 */
export async function consultarSitfis(
  cnpjContribuinte: string,
  options: SitfisOptions = {}
): Promise<SitfisResult> {
  const { onProgress } = options;
  const startTime = Date.now();

  // 1. Solicitar
  const solicitacao = await solicitarSitfis(cnpjContribuinte, options);

  if (!solicitacao.success || !solicitacao.protocolo) {
    return solicitacao;
  }

  const protocolo = solicitacao.protocolo;
  onProgress?.('SOLICITADO', 0, MAX_POLLING_ATTEMPTS);

  // 2. Polling
  let tentativa = 0;
  let pollingIntervalIndex = 0;

  while (tentativa < MAX_POLLING_ATTEMPTS) {
    // Verificar timeout total
    if (Date.now() - startTime > TOTAL_TIMEOUT_MS) {
      console.warn(`[SITFIS] Timeout total atingido para protocolo: ${protocolo}`);
      return {
        success: false,
        protocolo,
        status: 'PROCESSANDO',
        mensagem: `Timeout após ${TOTAL_TIMEOUT_MS / 1000}s. Use o protocolo ${protocolo} para consultar o resultado posteriormente.`,
      };
    }

    // Calcular intervalo de espera
    const interval = POLLING_INTERVALS[Math.min(pollingIntervalIndex, POLLING_INTERVALS.length - 1)];
    
    console.log(`[SITFIS] Aguardando ${interval / 1000}s antes da tentativa ${tentativa + 1}...`);
    await sleep(interval);

    tentativa++;
    pollingIntervalIndex++;

    // Consultar status
    const emissao = await emitirSitfis(protocolo, cnpjContribuinte, options);
    onProgress?.(emissao.status, tentativa, MAX_POLLING_ATTEMPTS);

    // Se concluído ou erro, retornar
    if (emissao.status === 'CONCLUIDO' || emissao.status === 'ERRO') {
      return emissao;
    }

    // Se ainda processando, continuar polling
    if (emissao.tempoEstimado && emissao.tempoEstimado > interval / 1000) {
      // Ajustar intervalo baseado no tempo estimado
      const adjustedInterval = Math.min(emissao.tempoEstimado * 1000, 60000);
      POLLING_INTERVALS[pollingIntervalIndex] = adjustedInterval;
    }
  }

  // Esgotou tentativas
  console.warn(`[SITFIS] Máximo de tentativas atingido para protocolo: ${protocolo}`);
  return {
    success: false,
    protocolo,
    status: 'PROCESSANDO',
    mensagem: `Máximo de ${MAX_POLLING_ATTEMPTS} tentativas atingido. Use o protocolo ${protocolo} para consultar o resultado posteriormente.`,
  };
}

/**
 * Verifica status de uma solicitação existente
 * 
 * Útil para retomar uma consulta que demorou muito
 * 
 * @param protocolo - Protocolo da solicitação
 * @param cnpjContribuinte - CNPJ do contribuinte
 * @param options - Opções de execução
 */
export async function verificarStatusSitfis(
  protocolo: string,
  cnpjContribuinte: string,
  options: SitfisOptions = {}
): Promise<SitfisResult> {
  return emitirSitfis(protocolo, cnpjContribuinte, options);
}

/**
 * Converte PDF base64 para Buffer
 */
export function pdfBase64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, 'base64');
}

/**
 * Gera nome de arquivo para o PDF
 */
export function generatePdfFilename(cnpj: string, protocolo: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `sitfis_${sanitizeCnpj(cnpj)}_${protocolo}_${date}.pdf`;
}

