/**
 * Motor Fiscal - Máquina de Estados
 * 
 * Ref: docs/spec-fiscal/02-maquina-de-estados-unificada.md
 * 
 * Gerencia transições de estado dos documentos fiscais.
 */

import { EstadoDocumentoFiscal, TransicaoEstado, TipoDocumento } from './types';
import { ERROS } from './errors';

// ============================================================================
// TRANSIÇÕES VÁLIDAS
// ============================================================================

const TRANSICOES_VALIDAS = new Map<EstadoDocumentoFiscal, EstadoDocumentoFiscal[]>([
  [EstadoDocumentoFiscal.RASCUNHO, [
    EstadoDocumentoFiscal.VALIDADO,
  ]],
  [EstadoDocumentoFiscal.VALIDADO, [
    EstadoDocumentoFiscal.TRANSMITIDO,
    EstadoDocumentoFiscal.RASCUNHO, // Voltar para edição
  ]],
  [EstadoDocumentoFiscal.TRANSMITIDO, [
    EstadoDocumentoFiscal.AUTORIZADO,
    EstadoDocumentoFiscal.REJEITADO,
    EstadoDocumentoFiscal.DENEGADO,
  ]],
  [EstadoDocumentoFiscal.AUTORIZADO, [
    EstadoDocumentoFiscal.CANCELAMENTO_PENDENTE,
    EstadoDocumentoFiscal.CANCELADO,
    EstadoDocumentoFiscal.SUBSTITUIDO,
  ]],
  [EstadoDocumentoFiscal.CANCELAMENTO_PENDENTE, [
    EstadoDocumentoFiscal.CANCELADO,
    EstadoDocumentoFiscal.AUTORIZADO, // Se indeferido
  ]],
  // Estados finais não têm transições
  [EstadoDocumentoFiscal.REJEITADO, []],
  [EstadoDocumentoFiscal.DENEGADO, []],
  [EstadoDocumentoFiscal.CANCELADO, []],
  [EstadoDocumentoFiscal.SUBSTITUIDO, []],
  [EstadoDocumentoFiscal.INUTILIZADO, []],
]);

// Estados finais
const ESTADOS_FINAIS = new Set<EstadoDocumentoFiscal>([
  EstadoDocumentoFiscal.REJEITADO,
  EstadoDocumentoFiscal.DENEGADO,
  EstadoDocumentoFiscal.CANCELADO,
  EstadoDocumentoFiscal.SUBSTITUIDO,
  EstadoDocumentoFiscal.INUTILIZADO,
]);

// ============================================================================
// CLASSE MÁQUINA DE ESTADOS
// ============================================================================

export class MaquinaEstadoFiscal {
  private _estadoAtual: EstadoDocumentoFiscal;
  private _historico: TransicaoEstado[] = [];

  constructor(estadoInicial: EstadoDocumentoFiscal = EstadoDocumentoFiscal.RASCUNHO) {
    this._estadoAtual = estadoInicial;
  }

  get estadoAtual(): EstadoDocumentoFiscal {
    return this._estadoAtual;
  }

  get historico(): TransicaoEstado[] {
    return [...this._historico];
  }

  /**
   * Verifica se pode transitar para um estado
   */
  podeTransitar(para: EstadoDocumentoFiscal): boolean {
    const permitidos = TRANSICOES_VALIDAS.get(this._estadoAtual) || [];
    return permitidos.includes(para);
  }

  /**
   * Retorna lista de transições permitidas
   */
  getTransicoesPermitidas(): EstadoDocumentoFiscal[] {
    return TRANSICOES_VALIDAS.get(this._estadoAtual) || [];
  }

  /**
   * Verifica se está em estado final
   */
  isEstadoFinal(): boolean {
    return ESTADOS_FINAIS.has(this._estadoAtual);
  }

  /**
   * Executa transição de estado
   * 
   * @throws FiscalError se transição não for permitida
   */
  transitar(
    para: EstadoDocumentoFiscal,
    motivo: string,
    opcoes?: {
      autor?: string;
      eventoFiscal?: string;
      protocoloAutoridade?: string;
    }
  ): TransicaoEstado {
    if (!this.podeTransitar(para)) {
      throw ERROS.INT_001(
        `Transição inválida: ${this._estadoAtual} -> ${para}. ` +
        `Transições permitidas: ${this.getTransicoesPermitidas().join(', ')}`
      );
    }

    const transicao: TransicaoEstado = {
      de: this._estadoAtual,
      para,
      timestamp: new Date(),
      motivo,
      autor: opcoes?.autor,
      eventoFiscal: opcoes?.eventoFiscal,
      protocoloAutoridade: opcoes?.protocoloAutoridade,
    };

    this._historico.push(transicao);
    this._estadoAtual = para;

    return transicao;
  }

  /**
   * Força estado (para conciliação com autoridade)
   * 
   * ATENÇÃO: Usar apenas para sincronizar com autoridade fiscal
   */
  forcarEstado(novoEstado: EstadoDocumentoFiscal, motivo: string): TransicaoEstado {
    const transicao: TransicaoEstado = {
      de: this._estadoAtual,
      para: novoEstado,
      timestamp: new Date(),
      motivo: `[FORÇADO] ${motivo}`,
    };

    this._historico.push(transicao);
    this._estadoAtual = novoEstado;

    return transicao;
  }
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Verifica se transição é válida
 */
export const podeTransitar = (
  de: EstadoDocumentoFiscal,
  para: EstadoDocumentoFiscal
): boolean => {
  const permitidos = TRANSICOES_VALIDAS.get(de) || [];
  return permitidos.includes(para);
};

/**
 * Verifica se estado é final
 */
export const isEstadoFinal = (estado: EstadoDocumentoFiscal): boolean => {
  return ESTADOS_FINAIS.has(estado);
};

/**
 * Retorna próximo estado baseado em resposta da autoridade
 */
export const estadoDeResposta = (
  tipoDocumento: TipoDocumento,
  sucesso: boolean,
  codigoResposta?: string | number
): EstadoDocumentoFiscal => {
  if (sucesso) {
    return EstadoDocumentoFiscal.AUTORIZADO;
  }

  // NF-e/NFC-e: verificar cStat para denegação
  if (tipoDocumento === 'NFE' || tipoDocumento === 'NFCE') {
    const cStat = typeof codigoResposta === 'string' 
      ? parseInt(codigoResposta, 10) 
      : codigoResposta;
    
    if (cStat && cStat >= 301 && cStat <= 302) {
      return EstadoDocumentoFiscal.DENEGADO;
    }
  }

  return EstadoDocumentoFiscal.REJEITADO;
};

/**
 * Mapeia status da NFS-e SP para estado canônico
 */
export const estadoDeStatusSP = (statusNFe: 'N' | 'C'): EstadoDocumentoFiscal => {
  return statusNFe === 'C' 
    ? EstadoDocumentoFiscal.CANCELADO 
    : EstadoDocumentoFiscal.AUTORIZADO;
};

/**
 * Mapeia status da NFS-e ADN para estado canônico
 */
export const estadoDeStatusADN = (status: string): EstadoDocumentoFiscal => {
  const mapa: Record<string, EstadoDocumentoFiscal> = {
    'normal': EstadoDocumentoFiscal.AUTORIZADO,
    'cancelada': EstadoDocumentoFiscal.CANCELADO,
    'substituida': EstadoDocumentoFiscal.SUBSTITUIDO,
    'bloqueada': EstadoDocumentoFiscal.AUTORIZADO, // Bloqueio não muda estado principal
  };
  return mapa[status] || EstadoDocumentoFiscal.AUTORIZADO;
};


