/**
 * Motor Fiscal - Validador NFS-e SP
 * 
 * Ref: docs/spec-fiscal/03-contratos-canonicos.md (seção 10)
 * Ref: docs/nfse-sp/schemasv02/nfse/TiposNFe_v01.xsd
 */

import { DocumentoFiscal, ItemDocumento } from '../types';
import { ERROS, FiscalError } from '../errors';
import { ResultadoValidacao, validarDocumentoFiscal } from './comum';

// ============================================================================
// VALIDAÇÃO ESPECÍFICA NFS-e SP
// ============================================================================

/**
 * Códigos de serviço válidos em São Paulo (amostra)
 * Ref: Tabela de códigos de serviço do município de SP
 */
const CODIGOS_SERVICO_SP = new Set([
  '01015', '01023', '01031', '01040', '01058', '01066', '01074', '01082',
  '02011', '02020', '02038', '02054', '02062', '02089', '02097', '02101',
  '03018', '03026', '03034', '03042', '03050', '03069', '03077', '03085',
  '04014', '04022', '04030', '04049', '04057', '04065', '04073', '04081',
  '05010', '05029', '05037', '05045', '05053', '05061', '05070', '05088',
  '06017', '06025', '06033', '06041', '06050', '06068', '06076', '06084',
  '07016', '07024', '07032', '07040', '07059', '07067', '07075', '07083',
  '08012', '08020', '08039', '08047', '08055', '08063', '08071', '08080',
  '09019', '09027', '09035', '09043', '09051', '09060', '09078', '09086',
  '10014', '10022', '10030', '10049', '10057', '10065', '10073', '10081',
  '11010', '11029', '11037', '11045', '11053', '11061', '11070', '11088',
  '12018', '12026', '12034', '12042', '12050', '12069', '12077', '12085',
  '13015', '13023', '13031', '13040', '13058', '13066', '13074', '13082',
  '14013', '14021', '14030', '14048', '14056', '14064', '14072', '14080',
  '15017', '15025', '15033', '15041', '15050', '15068', '15076', '15084',
  '16012', '16020', '16039', '16047', '16055', '16063', '16071', '16080',
  '17019', '17027', '17035', '17043', '17051', '17060', '17078', '17086',
  // ... adicionar mais conforme necessário
]);

/**
 * Tipos de tributação válidos
 */
export type TipoTributacaoSP = 'T' | 'F' | 'A' | 'B' | 'M' | 'N' | 'X';

const TRIBUTACOES_VALIDAS = new Set<TipoTributacaoSP>(['T', 'F', 'A', 'B', 'M', 'N', 'X']);

// ============================================================================
// VALIDADOR
// ============================================================================

export interface DadosRPSSP {
  serieRPS: string;
  numeroRPS: number;
  dataEmissao: Date;
  tributacao: TipoTributacaoSP;
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
  };
}

/**
 * Valida dados do RPS para NFS-e SP
 */
export const validarRPSSP = (dados: DadosRPSSP): ResultadoValidacao => {
  const erros: FiscalError[] = [];
  
  // Série (máximo 5 caracteres)
  if (!dados.serieRPS) {
    erros.push(ERROS.VAL_001('serieRPS'));
  } else if (dados.serieRPS.length > 5) {
    erros.push(ERROS.VAL_003('serieRPS', dados.serieRPS, 'máximo 5 caracteres'));
  }
  
  // Número RPS (máximo 12 dígitos)
  if (!dados.numeroRPS || dados.numeroRPS <= 0) {
    erros.push(ERROS.VAL_001('numeroRPS'));
  } else if (dados.numeroRPS > 999999999999) {
    erros.push(ERROS.VAL_003('numeroRPS', String(dados.numeroRPS), 'máximo 12 dígitos'));
  }
  
  // Data de emissão
  if (!dados.dataEmissao) {
    erros.push(ERROS.VAL_001('dataEmissao'));
  }
  
  // Tipo de tributação
  if (!dados.tributacao || !TRIBUTACOES_VALIDAS.has(dados.tributacao)) {
    erros.push(ERROS.VAL_002('tributacao', dados.tributacao || ''));
  }
  
  // Código de serviço
  if (!dados.codigoServico) {
    erros.push(ERROS.VAL_001('codigoServico'));
  } else if (!CODIGOS_SERVICO_SP.has(dados.codigoServico)) {
    // Warning: código pode não estar na lista (a lista é parcial)
    // TODO: Buscar lista completa da prefeitura
  }
  
  // Alíquota (0 a 5% para SP na maioria dos casos)
  if (dados.aliquota < 0 || dados.aliquota > 100) {
    erros.push(ERROS.VAL_003('aliquota', String(dados.aliquota), '0 a 100'));
  }
  
  // Valor dos serviços
  if (!dados.valorServicos || dados.valorServicos <= 0) {
    erros.push(ERROS.VAL_003('valorServicos', String(dados.valorServicos), '> 0'));
  }
  
  // Discriminação (máximo 2000 caracteres)
  if (!dados.discriminacao) {
    erros.push(ERROS.VAL_001('discriminacao'));
  } else if (dados.discriminacao.length > 2000) {
    erros.push(ERROS.VAL_003('discriminacao', `${dados.discriminacao.length} chars`, 'máximo 2000'));
  }
  
  // Tomador
  if (!dados.tomador.cpfCnpj) {
    // Tomador pode ser anônimo em alguns casos
  } else {
    const cpfCnpjLimpo = dados.tomador.cpfCnpj.replace(/\D/g, '');
    if (cpfCnpjLimpo.length !== 11 && cpfCnpjLimpo.length !== 14) {
      erros.push(ERROS.VAL_004(dados.tomador.cpfCnpj));
    }
  }
  
  return {
    valido: erros.length === 0,
    erros,
  };
};

/**
 * Valida documento fiscal para NFS-e SP
 */
export const validarDocumentoNFSeSP = (doc: DocumentoFiscal): ResultadoValidacao => {
  // Validação genérica primeiro
  const resultadoBase = validarDocumentoFiscal(doc);
  const erros = [...resultadoBase.erros];
  
  // Validações específicas SP
  
  // Inscrição municipal obrigatória para emitente
  if (!doc.emitente.inscricaoMunicipal) {
    erros.push(ERROS.VAL_001('emitente.inscricaoMunicipal'));
  }
  
  // Verificar se é município de SP
  if (doc.emitente.endereco.codigoMunicipio !== '3550308') {
    erros.push(ERROS.VAL_002(
      'emitente.endereco.codigoMunicipio',
      doc.emitente.endereco.codigoMunicipio
    ));
  }
  
  // Itens devem ter serviço
  doc.itens.forEach((item, index) => {
    if (!item.servico) {
      erros.push(ERROS.VAL_001(`itens[${index}].servico`));
    }
  });
  
  return {
    valido: erros.length === 0,
    erros,
  };
};

/**
 * Converte código LC 116 para código municipal SP
 * Exemplo: "01.08" -> "01082"
 */
export const converterCodigoLC116ParaSP = (codigoLC116: string): string => {
  // Remove pontos e formata
  const limpo = codigoLC116.replace(/\./g, '');
  // Adiciona dígito verificador (simplificado)
  // TODO: Implementar lógica real de conversão
  return limpo.padStart(5, '0');
};

/**
 * Valida se código de serviço é válido em SP
 */
export const isCodigoServicoValidoSP = (codigo: string): boolean => {
  return CODIGOS_SERVICO_SP.has(codigo);
};

