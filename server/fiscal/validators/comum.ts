/**
 * Motor Fiscal - Validações Comuns
 * 
 * Ref: docs/spec-fiscal/03-contratos-canonicos.md
 */

import { DocumentoFiscal, TipoDocumento, ItemDocumento, Emitente, Destinatario } from '../types';
import { ERROS, FiscalError } from '../errors';

// ============================================================================
// RESULTADO DE VALIDAÇÃO
// ============================================================================

export interface ResultadoValidacao {
  valido: boolean;
  erros: FiscalError[];
}

// ============================================================================
// VALIDAÇÃO DE CPF/CNPJ
// ============================================================================

/**
 * Valida CPF
 */
export const validarCpf = (cpf: string): boolean => {
  const limpo = cpf.replace(/\D/g, '');
  
  if (limpo.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(limpo)) return false; // Todos dígitos iguais
  
  // Validação dos dígitos verificadores
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(limpo[i]) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(limpo[9])) return false;
  
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(limpo[i]) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(limpo[10])) return false;
  
  return true;
};

/**
 * Valida CNPJ
 */
export const validarCnpj = (cnpj: string): boolean => {
  const limpo = cnpj.replace(/\D/g, '');
  
  if (limpo.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(limpo)) return false; // Todos dígitos iguais
  
  // Validação dos dígitos verificadores
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let soma = 0;
  for (let i = 0; i < 12; i++) {
    soma += parseInt(limpo[i]) * pesos1[i];
  }
  let resto = soma % 11;
  const dv1 = resto < 2 ? 0 : 11 - resto;
  if (dv1 !== parseInt(limpo[12])) return false;
  
  soma = 0;
  for (let i = 0; i < 13; i++) {
    soma += parseInt(limpo[i]) * pesos2[i];
  }
  resto = soma % 11;
  const dv2 = resto < 2 ? 0 : 11 - resto;
  if (dv2 !== parseInt(limpo[13])) return false;
  
  return true;
};

/**
 * Valida CPF ou CNPJ
 */
export const validarCpfCnpj = (doc: string): boolean => {
  const limpo = doc.replace(/\D/g, '');
  if (limpo.length === 11) return validarCpf(doc);
  if (limpo.length === 14) return validarCnpj(doc);
  return false;
};

// ============================================================================
// VALIDAÇÃO DE DATA
// ============================================================================

/**
 * Valida se data é válida
 */
export const validarData = (data: Date | string): boolean => {
  const d = data instanceof Date ? data : new Date(data);
  return !isNaN(d.getTime());
};

/**
 * Valida se data não é futura
 */
export const validarDataNaoFutura = (data: Date | string): boolean => {
  const d = data instanceof Date ? data : new Date(data);
  return d <= new Date();
};

// ============================================================================
// VALIDAÇÃO DE VALORES
// ============================================================================

/**
 * Valida valor monetário (>= 0, máximo 2 casas decimais)
 */
export const validarValorMonetario = (valor: number): boolean => {
  if (valor < 0) return false;
  // Verificar se tem no máximo 2 casas decimais
  const partes = String(valor).split('.');
  if (partes[1] && partes[1].length > 2) return false;
  return true;
};

/**
 * Valida alíquota (0 a 100)
 */
export const validarAliquota = (aliquota: number): boolean => {
  return aliquota >= 0 && aliquota <= 100;
};

// ============================================================================
// VALIDAÇÃO DE CÓDIGOS
// ============================================================================

/**
 * Valida código IBGE de município (7 dígitos)
 */
export const validarCodigoMunicipio = (codigo: string): boolean => {
  const limpo = codigo.replace(/\D/g, '');
  return limpo.length === 7 && /^[1-5][0-9]{6}$/.test(limpo);
};

/**
 * Valida UF (2 letras)
 */
export const validarUF = (uf: string): boolean => {
  const ufs = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 
    'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 
    'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];
  return ufs.includes(uf.toUpperCase());
};

/**
 * Valida CEP (8 dígitos)
 */
export const validarCEP = (cep: string): boolean => {
  const limpo = cep.replace(/\D/g, '');
  return limpo.length === 8;
};

/**
 * Valida código NCM (8 dígitos)
 */
export const validarNCM = (ncm: string): boolean => {
  const limpo = ncm.replace(/\D/g, '');
  return limpo.length === 8;
};

/**
 * Valida código CFOP (4 dígitos)
 */
export const validarCFOP = (cfop: string): boolean => {
  const limpo = cfop.replace(/\D/g, '');
  return limpo.length === 4 && /^[1-7][0-9]{3}$/.test(limpo);
};

// ============================================================================
// VALIDADOR DE DOCUMENTO FISCAL
// ============================================================================

/**
 * Valida documento fiscal genérico
 */
export const validarDocumentoFiscal = (doc: DocumentoFiscal): ResultadoValidacao => {
  const erros: FiscalError[] = [];
  
  // Campos obrigatórios
  if (!doc.id) {
    erros.push(ERROS.VAL_001('id'));
  }
  
  if (!doc.tipoDocumento) {
    erros.push(ERROS.VAL_001('tipoDocumento'));
  }
  
  if (!doc.dataEmissao || !validarData(doc.dataEmissao)) {
    erros.push(ERROS.VAL_005('dataEmissao', String(doc.dataEmissao)));
  }
  
  if (!doc.competencia || !validarData(doc.competencia)) {
    erros.push(ERROS.VAL_005('competencia', String(doc.competencia)));
  }
  
  // Emitente
  const errosEmitente = validarEmitente(doc.emitente);
  erros.push(...errosEmitente);
  
  // Destinatário (se presente)
  if (doc.destinatario) {
    const errosDestinatario = validarDestinatario(doc.destinatario);
    erros.push(...errosDestinatario);
  }
  
  // Itens
  if (!doc.itens || doc.itens.length === 0) {
    erros.push(ERROS.VAL_001('itens'));
  } else {
    doc.itens.forEach((item, index) => {
      const errosItem = validarItem(item, doc.tipoDocumento, index);
      erros.push(...errosItem);
    });
  }
  
  // Totais
  if (doc.totais.valorTotal < 0) {
    erros.push(ERROS.VAL_003('totais.valorTotal', String(doc.totais.valorTotal), '>= 0'));
  }
  
  return {
    valido: erros.length === 0,
    erros,
  };
};

/**
 * Valida emitente
 */
export const validarEmitente = (emitente: Emitente): FiscalError[] => {
  const erros: FiscalError[] = [];
  
  if (!emitente.cpfCnpj) {
    erros.push(ERROS.VAL_001('emitente.cpfCnpj'));
  } else if (!validarCpfCnpj(emitente.cpfCnpj)) {
    erros.push(ERROS.VAL_004(emitente.cpfCnpj));
  }
  
  if (!emitente.razaoSocial) {
    erros.push(ERROS.VAL_001('emitente.razaoSocial'));
  }
  
  if (!emitente.endereco) {
    erros.push(ERROS.VAL_001('emitente.endereco'));
  } else {
    if (!emitente.endereco.codigoMunicipio || !validarCodigoMunicipio(emitente.endereco.codigoMunicipio)) {
      erros.push(ERROS.VAL_002('emitente.endereco.codigoMunicipio', emitente.endereco.codigoMunicipio || ''));
    }
    
    if (!emitente.endereco.uf || !validarUF(emitente.endereco.uf)) {
      erros.push(ERROS.VAL_002('emitente.endereco.uf', emitente.endereco.uf || ''));
    }
  }
  
  return erros;
};

/**
 * Valida destinatário
 */
export const validarDestinatario = (dest: Destinatario): FiscalError[] => {
  const erros: FiscalError[] = [];
  
  // CPF/CNPJ é opcional, mas se presente deve ser válido
  if (dest.cpfCnpj && !validarCpfCnpj(dest.cpfCnpj)) {
    erros.push(ERROS.VAL_004(dest.cpfCnpj));
  }
  
  return erros;
};

/**
 * Valida item do documento
 */
export const validarItem = (
  item: ItemDocumento, 
  tipo: TipoDocumento,
  index: number
): FiscalError[] => {
  const erros: FiscalError[] = [];
  const prefix = `itens[${index}]`;
  
  // Valor bruto
  if (item.valorBruto <= 0) {
    erros.push(ERROS.VAL_003(`${prefix}.valorBruto`, String(item.valorBruto), '> 0'));
  }
  
  // Serviço ou Produto
  if (tipo === 'NFSE_SP' || tipo === 'NFSE_NACIONAL') {
    // NFS-e precisa de serviço
    if (!item.servico) {
      erros.push(ERROS.VAL_001(`${prefix}.servico`));
    } else {
      if (!item.servico.codigoLC116) {
        erros.push(ERROS.VAL_001(`${prefix}.servico.codigoLC116`));
      }
      if (!item.servico.descricao) {
        erros.push(ERROS.VAL_001(`${prefix}.servico.descricao`));
      }
    }
  } else {
    // NF-e/NFC-e precisa de produto
    if (!item.produto) {
      erros.push(ERROS.VAL_001(`${prefix}.produto`));
    } else {
      if (!item.produto.ncm || !validarNCM(item.produto.ncm)) {
        erros.push(ERROS.VAL_002(`${prefix}.produto.ncm`, item.produto.ncm || ''));
      }
      if (!item.produto.cfop || !validarCFOP(item.produto.cfop)) {
        erros.push(ERROS.VAL_002(`${prefix}.produto.cfop`, item.produto.cfop || ''));
      }
    }
  }
  
  return erros;
};


