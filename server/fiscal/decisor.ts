/**
 * Motor Fiscal - Decisor Fiscal
 * 
 * Ref: docs/spec-fiscal/01-decisor-fiscal.md
 * 
 * Determina qual documento fiscal emitir baseado em regras determinísticas.
 */

import { DecisaoFiscalInput, DecisaoFiscalOutput, TipoDocumento } from './types';
import { ERROS } from './errors';

// ============================================================================
// CACHE DE MUNICIPIOS CONVENIADOS
// ============================================================================

// Municípios conveniados ao SN NFS-e (cache local)
// TODO: Implementar atualização via API de parâmetros
const MUNICIPIOS_CONVENIADOS = new Set<string>([
  // Adicionar códigos IBGE conforme convênio
  // Exemplo: '3106200' (Belo Horizonte)
]);

/**
 * Verifica se município está conveniado ao Sistema Nacional NFS-e
 */
export const isMunicipioConveniado = async (codigoMunicipio: string): Promise<boolean> => {
  // TODO: Consultar API de parâmetros quando disponível
  return MUNICIPIOS_CONVENIADOS.has(codigoMunicipio);
};

/**
 * Adiciona município à lista de conveniados (para testes/cache)
 */
export const adicionarMunicipioConveniado = (codigoMunicipio: string): void => {
  MUNICIPIOS_CONVENIADOS.add(codigoMunicipio);
};

// ============================================================================
// REGRAS
// ============================================================================

const REGRAS = {
  // Serviços
  'R-SVC-01': 'Serviço prestado em São Paulo capital -> NFSE_SP',
  'R-SVC-02': 'Serviço em município conveniado ao SN NFS-e -> NFSE_NACIONAL',
  'R-SVC-03': 'Serviço em município não conveniado -> ERRO',
  
  // Mercadorias
  'R-MER-01': 'Destinatário não-consumidor final (B2B) -> NFE',
  'R-MER-02': 'Destinatário PJ não-consumidor final -> NFE',
  'R-MER-03': 'Destinatário estrangeiro (exportação) -> NFE',
  'R-MER-04': 'Venda presencial ao consumidor final -> NFCE',
  'R-MER-05': 'Venda não-presencial ao consumidor final -> NFE',
  'R-MER-06': 'Valor acima do limite estadual NFC-e -> NFE',
  
  // Misto
  'R-MIX-01': 'Operação mista (mercadoria + serviço) -> NFE',
};

// Código IBGE de São Paulo capital
const CODIGO_SAO_PAULO = '3550308';

// ============================================================================
// DECISOR PRINCIPAL
// ============================================================================

/**
 * Decide qual documento fiscal emitir
 * 
 * @param input - Dados da operação
 * @returns Tipo de documento e regras aplicadas
 * @throws FiscalError se não for possível determinar
 */
export const decidirDocumentoFiscal = async (input: DecisaoFiscalInput): Promise<DecisaoFiscalOutput> => {
  const regrasAplicadas: string[] = [];

  // -------------------------------------------------------------------------
  // 1. SERVIÇO PURO
  // -------------------------------------------------------------------------
  if (input.tipoOperacao === 'SERVICO') {
    // São Paulo capital -> NFSE_SP
    if (input.emitente.codigoMunicipio === CODIGO_SAO_PAULO) {
      regrasAplicadas.push('R-SVC-01');
      return {
        tipoDocumento: 'NFSE_SP',
        motivo: REGRAS['R-SVC-01'],
        regras: regrasAplicadas,
      };
    }

    // Município conveniado ao SN NFS-e
    const conveniado = await isMunicipioConveniado(input.emitente.codigoMunicipio);
    if (conveniado) {
      regrasAplicadas.push('R-SVC-02');
      return {
        tipoDocumento: 'NFSE_NACIONAL',
        motivo: REGRAS['R-SVC-02'],
        regras: regrasAplicadas,
      };
    }

    // Não suportado
    regrasAplicadas.push('R-SVC-03');
    throw ERROS.AZN_003(input.emitente.codigoMunicipio);
  }

  // -------------------------------------------------------------------------
  // 2. MERCADORIA
  // -------------------------------------------------------------------------
  if (input.tipoOperacao === 'MERCADORIA') {
    // Exportação
    if (input.destinatario.tipo === 'ESTRANGEIRO') {
      regrasAplicadas.push('R-MER-03');
      return {
        tipoDocumento: 'NFE',
        motivo: REGRAS['R-MER-03'],
        regras: regrasAplicadas,
      };
    }

    // B2B (não consumidor final)
    if (!input.destinatario.isConsumidorFinal) {
      regrasAplicadas.push('R-MER-01');
      return {
        tipoDocumento: 'NFE',
        motivo: REGRAS['R-MER-01'],
        regras: regrasAplicadas,
      };
    }

    // Consumidor final
    if (input.destinatario.isConsumidorFinal) {
      // Venda presencial = NFC-e
      if (input.localVenda === 'PRESENCIAL') {
        regrasAplicadas.push('R-MER-04');
        return {
          tipoDocumento: 'NFCE',
          motivo: REGRAS['R-MER-04'],
          regras: regrasAplicadas,
        };
      }

      // Venda não-presencial = NF-e
      regrasAplicadas.push('R-MER-05');
      return {
        tipoDocumento: 'NFE',
        motivo: REGRAS['R-MER-05'],
        regras: regrasAplicadas,
      };
    }
  }

  // -------------------------------------------------------------------------
  // 3. MISTO (mercadoria + serviço)
  // -------------------------------------------------------------------------
  if (input.tipoOperacao === 'MISTO') {
    regrasAplicadas.push('R-MIX-01');
    return {
      tipoDocumento: 'NFE',
      motivo: REGRAS['R-MIX-01'],
      regras: regrasAplicadas,
    };
  }

  // Fallback (não deveria chegar aqui)
  throw ERROS.INT_001('Tipo de operação não reconhecido');
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Verifica se tipo de documento é NFS-e
 */
export const isNFSe = (tipo: TipoDocumento): boolean => {
  return tipo === 'NFSE_SP' || tipo === 'NFSE_NACIONAL';
};

/**
 * Verifica se tipo de documento é NF-e ou NFC-e
 */
export const isNFe = (tipo: TipoDocumento): boolean => {
  return tipo === 'NFE' || tipo === 'NFCE';
};

/**
 * Retorna modelo fiscal (55 ou 65) para NF-e/NFC-e
 */
export const getModeloFiscal = (tipo: TipoDocumento): number | null => {
  if (tipo === 'NFE') return 55;
  if (tipo === 'NFCE') return 65;
  return null;
};


