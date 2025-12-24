/**
 * Motor Fiscal - Adaptador NFS-e SP
 * 
 * Ref: docs/spec-fiscal/07-plano-implementacao.md (seção 5.2 - Migração)
 * 
 * Camada de compatibilidade para migrar integração existente para o novo core.
 * Permite feature flag e shadow mode para migração segura.
 */

import {
  DocumentoFiscal,
  EstadoDocumentoFiscal,
  TipoDocumento,
  ResultadoEmissao,
  ResultadoCancelamento,
  ItemDocumento,
  Emitente,
  Destinatario,
  Tributos,
  Totais,
  TribISSQN,
  TipoRetISSQN,
  RegimeTributario,
  OpSimplesNacional,
} from '../types';
import { MaquinaEstadoFiscal, estadoDeStatusSP } from '../estado-machine';
import { FiscalLogger, registrarAuditoria, gerarHash } from '../auditoria';
import { gerarIdNFSeSP, gerarCorrelationId, comIdempotencia } from '../idempotencia';
import { validarDocumentoNFSeSP } from '../validators/nfse-sp';
import { FiscalError, ERROS, mapearErroSP } from '../errors';

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export interface FeatureFlagsNFSeSP {
  /** Usar novo core para emissão */
  usarNovoCore: boolean;
  
  /** Shadow mode: executa ambos e compara, mas retorna resultado do legado */
  shadowMode: boolean;
  
  /** Log detalhado de comparação no shadow mode */
  logComparacao: boolean;
}

let featureFlags: FeatureFlagsNFSeSP = {
  usarNovoCore: false,
  shadowMode: false,
  logComparacao: true,
};

export const setFeatureFlags = (flags: Partial<FeatureFlagsNFSeSP>): void => {
  featureFlags = { ...featureFlags, ...flags };
};

export const getFeatureFlags = (): FeatureFlagsNFSeSP => ({ ...featureFlags });

// ============================================================================
// TIPOS LEGADOS (interface antiga do sistema)
// ============================================================================

export interface EmissaoRPSParamsLegado {
  serieRPS: string;
  numeroRPS: number;
  dataEmissao: string;
  tipoTributacao: 'T' | 'F' | 'A' | 'B' | 'M' | 'N' | 'X';
  codigoServico: string;
  aliquota: number;
  valorServicos: number;
  valorDeducoes?: number;
  issRetido: boolean;
  discriminacao: string;
  tomador: {
    cpfCnpj: string;
    razaoSocial?: string;
    email?: string;
    endereco?: {
      logradouro?: string;
      numero?: string;
      bairro?: string;
      cidade?: string;
      uf?: string;
      cep?: string;
    };
  };
}

export interface EmissaoRPSResultLegado {
  sucesso: boolean;
  numeroNFe?: string;
  codigoVerificacao?: string;
  dataEmissao?: string;
  linkNFe?: string;
  erro?: string;
  codigoErro?: string;
}

// ============================================================================
// CONVERSOR LEGADO -> CANÔNICO
// ============================================================================

/**
 * Converte params legados para DocumentoFiscal canônico
 */
export const converterParaCanonical = (
  params: EmissaoRPSParamsLegado,
  ccm: string,
  orgId: string
): DocumentoFiscal => {
  const idIdempotencia = gerarIdNFSeSP(ccm, params.serieRPS, params.numeroRPS);
  const agora = new Date();
  
  const emitente: Emitente = {
    cpfCnpj: '', // Preenchido pelo sistema
    inscricaoMunicipal: ccm,
    razaoSocial: '', // Preenchido pelo sistema
    endereco: {
      logradouro: '',
      numero: '',
      bairro: '',
      codigoMunicipio: '3550308', // São Paulo
      uf: 'SP',
      cep: '',
    },
    regimeTributario: RegimeTributario.SIMPLES_NACIONAL,
    simplesNacional: OpSimplesNacional.NAO_OPTANTE,
  };
  
  const destinatario: Destinatario | undefined = params.tomador.cpfCnpj ? {
    cpfCnpj: params.tomador.cpfCnpj,
    razaoSocial: params.tomador.razaoSocial,
    email: params.tomador.email,
    endereco: params.tomador.endereco ? {
      logradouro: params.tomador.endereco.logradouro || '',
      numero: params.tomador.endereco.numero || '',
      bairro: params.tomador.endereco.bairro || '',
      codigoMunicipio: '',
      nomeMunicipio: params.tomador.endereco.cidade,
      uf: params.tomador.endereco.uf || '',
      cep: params.tomador.endereco.cep || '',
    } : undefined,
    isConsumidorFinal: true,
  } : undefined;
  
  const tributos: Tributos = {
    iss: {
      tributacao: mapearTributacao(params.tipoTributacao),
      aliquota: params.aliquota,
      baseCalculo: params.valorServicos - (params.valorDeducoes || 0),
      valorISS: (params.valorServicos - (params.valorDeducoes || 0)) * params.aliquota / 100,
      tipoRetencao: params.issRetido ? TipoRetISSQN.RETIDO_TOMADOR : TipoRetISSQN.NAO_RETIDO,
    },
  };
  
  const itens: ItemDocumento[] = [{
    numero: 1,
    servico: {
      codigoLC116: params.codigoServico,
      codigoTribMunicipal: params.codigoServico,
      descricao: params.discriminacao.substring(0, 200),
      localPrestacao: '3550308',
    },
    valorBruto: params.valorServicos,
    valorDesconto: 0,
    valorLiquido: params.valorServicos - (params.valorDeducoes || 0),
    tributosItem: {
      iss: tributos.iss,
    },
  }];
  
  const totais: Totais = {
    valorServicos: params.valorServicos,
    valorProdutos: 0,
    valorDesconto: 0,
    valorDeducoes: params.valorDeducoes || 0,
    baseCalculoISS: params.valorServicos - (params.valorDeducoes || 0),
    baseCalculoICMS: 0,
    valorISS: tributos.iss!.valorISS,
    valorICMS: 0,
    valorIPI: 0,
    valorPIS: 0,
    valorCOFINS: 0,
    valorRetencoesTotal: params.issRetido ? tributos.iss!.valorISS : 0,
    valorLiquido: params.valorServicos - (params.valorDeducoes || 0),
    valorTotal: params.valorServicos,
  };
  
  return {
    id: crypto.randomUUID(),
    idIdempotencia,
    tipoDocumento: 'NFSE_SP',
    estado: EstadoDocumentoFiscal.RASCUNHO,
    serie: params.serieRPS,
    numero: String(params.numeroRPS),
    dataEmissao: new Date(params.dataEmissao),
    competencia: new Date(params.dataEmissao),
    emitente,
    destinatario,
    itens,
    totais,
    tributos,
    informacoesComplementares: params.discriminacao,
    ambiente: process.env.NFSE_AMBIENTE === 'producao' ? 'PRODUCAO' : 'HOMOLOGACAO',
    orgId,
    criadoEm: agora,
    atualizadoEm: agora,
    versao: 1,
  };
};

const mapearTributacao = (tipo: string): TribISSQN => {
  const mapa: Record<string, TribISSQN> = {
    'T': TribISSQN.TRIBUTAVEL,
    'F': TribISSQN.IMUNE,
    'X': TribISSQN.NAO_INCIDENTE,
  };
  return mapa[tipo] || TribISSQN.TRIBUTAVEL;
};

// ============================================================================
// CONVERSOR CANÔNICO -> LEGADO
// ============================================================================

/**
 * Converte resultado canônico para formato legado
 */
export const converterParaLegado = (resultado: ResultadoEmissao): EmissaoRPSResultLegado => {
  if (!resultado.sucesso) {
    return {
      sucesso: false,
      erro: resultado.erro?.mensagemUsuario || 'Erro desconhecido',
      codigoErro: resultado.erro?.codigo,
    };
  }
  
  return {
    sucesso: true,
    numeroNFe: resultado.documento?.numero,
    codigoVerificacao: resultado.documento?.codigoVerificacao,
    dataEmissao: resultado.documento?.dataAutorizacao?.toISOString(),
    linkNFe: resultado.documento?.numero 
      ? `https://nfe.prefeitura.sp.gov.br/contribuinte/notaprint.aspx?nf=${resultado.documento.numero}`
      : undefined,
  };
};

// ============================================================================
// ADAPTADOR PRINCIPAL
// ============================================================================

/**
 * Adaptador que permite usar nova API ou legada via feature flag
 */
export class NFSeSPAdapter {
  private ccm: string;
  private orgId: string;
  private logger: FiscalLogger;

  constructor(ccm: string, orgId: string) {
    this.ccm = ccm;
    this.orgId = orgId;
    this.logger = new FiscalLogger(gerarCorrelationId());
    this.logger.setContext({
      tipoDocumento: 'NFSE_SP',
      orgId,
    });
  }

  /**
   * Emite RPS usando adaptador
   */
  async emitirRPS(params: EmissaoRPSParamsLegado): Promise<EmissaoRPSResultLegado> {
    const flags = getFeatureFlags();
    
    // Shadow mode: executa ambos
    if (flags.shadowMode) {
      return this.executarShadowMode(params);
    }
    
    // Novo core
    if (flags.usarNovoCore) {
      return this.emitirViaNovoCore(params);
    }
    
    // Legado (passthrough)
    return this.emitirViaLegado(params);
  }

  /**
   * Emissão via novo core unificado
   */
  private async emitirViaNovoCore(params: EmissaoRPSParamsLegado): Promise<EmissaoRPSResultLegado> {
    const doc = converterParaCanonical(params, this.ccm, this.orgId);
    
    // Validar
    const validacao = validarDocumentoNFSeSP(doc);
    if (!validacao.valido) {
      return {
        sucesso: false,
        erro: validacao.erros.map(e => e.mensagemUsuario).join('; '),
        codigoErro: validacao.erros[0]?.codigo,
      };
    }
    
    // TODO: Chamar serviço de emissão via core
    // Por enquanto, retorna erro indicando que não está implementado
    return {
      sucesso: false,
      erro: 'Emissão via novo core ainda não implementada',
      codigoErro: 'NOT_IMPLEMENTED',
    };
  }

  /**
   * Emissão via integração legada
   */
  private async emitirViaLegado(params: EmissaoRPSParamsLegado): Promise<EmissaoRPSResultLegado> {
    // Importar dinamicamente para evitar dependência circular
    const { emitirRPS } = await import('../../integrations/fiscal/nfse-sp');
    
    try {
      const resultado = await emitirRPS({
        serieRPS: params.serieRPS,
        numeroRPS: params.numeroRPS,
        dataEmissao: new Date(params.dataEmissao), // Converter string para Date
        tributacao: params.tipoTributacao,
        codigoServico: params.codigoServico,
        aliquota: params.aliquota,
        valorServicos: params.valorServicos,
        valorDeducoes: params.valorDeducoes,
        issRetido: params.issRetido,
        discriminacao: params.discriminacao,
        tomador: {
          cpfCnpj: params.tomador.cpfCnpj,
          razaoSocial: params.tomador.razaoSocial,
          email: params.tomador.email,
        },
      });
      
      // Mapear resultado para formato legado
      return {
        sucesso: resultado.sucesso,
        numeroNFe: resultado.numeroNFe,
        codigoVerificacao: resultado.codigoVerificacao,
        dataEmissao: resultado.dataEmissaoNFe,
        linkNFe: resultado.numeroNFe 
          ? `https://nfe.prefeitura.sp.gov.br/contribuinte/notaprint.aspx?nf=${resultado.numeroNFe}` 
          : undefined,
        erro: resultado.sucesso ? undefined : resultado.mensagem,
        codigoErro: resultado.sucesso ? undefined : 'SP_ERROR',
      };
    } catch (error: any) {
      return {
        sucesso: false,
        erro: error.message,
        codigoErro: 'LEGACY_ERROR',
      };
    }
  }

  /**
   * Shadow mode: executa ambos e compara
   */
  private async executarShadowMode(params: EmissaoRPSParamsLegado): Promise<EmissaoRPSResultLegado> {
    const flags = getFeatureFlags();
    
    // Executar legado (resultado oficial)
    const resultadoLegado = await this.emitirViaLegado(params);
    
    // Executar novo core em paralelo (apenas para comparação)
    try {
      const resultadoNovo = await this.emitirViaNovoCore(params);
      
      if (flags.logComparacao) {
        this.compararResultados(resultadoLegado, resultadoNovo);
      }
    } catch (error: any) {
      this.logger.warn('shadow_mode_erro_novo_core', {
        erro: { codigo: 'SHADOW_ERROR', categoria: 'INTERNO', mensagem: error.message },
      });
    }
    
    // Sempre retorna resultado do legado no shadow mode
    return resultadoLegado;
  }

  /**
   * Compara resultados e loga diferenças
   */
  private compararResultados(
    legado: EmissaoRPSResultLegado, 
    novo: EmissaoRPSResultLegado
  ): void {
    const diferencas: string[] = [];
    
    if (legado.sucesso !== novo.sucesso) {
      diferencas.push(`sucesso: legado=${legado.sucesso}, novo=${novo.sucesso}`);
    }
    
    if (legado.numeroNFe !== novo.numeroNFe) {
      diferencas.push(`numeroNFe: legado=${legado.numeroNFe}, novo=${novo.numeroNFe}`);
    }
    
    if (legado.codigoVerificacao !== novo.codigoVerificacao) {
      diferencas.push(`codigoVerificacao: legado=${legado.codigoVerificacao}, novo=${novo.codigoVerificacao}`);
    }
    
    if (diferencas.length > 0) {
      this.logger.warn('shadow_mode_diferencas', {
        status: 'error',
      });
      console.warn('[SHADOW MODE] Diferenças encontradas:', diferencas);
    } else {
      this.logger.info('shadow_mode_ok', {
        status: 'success',
      });
    }
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Cria instância do adaptador
 */
export const criarNFSeSPAdapter = (ccm: string, orgId: string): NFSeSPAdapter => {
  return new NFSeSPAdapter(ccm, orgId);
};

