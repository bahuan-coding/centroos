/**
 * RPS (Recibo Provisório de Serviços) Signature for NFSe Paulistana
 * 
 * The São Paulo NFSe system requires a separate PKCS#1 signature
 * for each RPS when submitting invoices. This is different from
 * the XMLDSig signature on the overall XML document.
 * 
 * The RPS signature is calculated over a concatenated string of
 * specific fields in a fixed format (86 or 101 characters).
 */

import forge from 'node-forge';

export interface RPSData {
  /** Inscrição Municipal do prestador (CCM) - 8 caracteres */
  inscricaoMunicipal: string;
  /** Série do RPS - 5 caracteres */
  serieRPS: string;
  /** Número do RPS - 12 caracteres */
  numeroRPS: string;
  /** Data de emissão - formato AAAAMMDD - 8 caracteres */
  dataEmissao: string;
  /** Tributação: T=Tributada, F=Fora SP, A=Isento, B=Imune, M=Suspenso, N=Não incidente, X=Exportação - 1 caractere */
  tributacao: 'T' | 'F' | 'A' | 'B' | 'M' | 'N' | 'X';
  /** Situação: N=Normal, C=Cancelada - 1 caractere */
  situacao: 'N' | 'C';
  /** ISS Retido: S=Sim, N=Não - 1 caractere */
  issRetido: 'S' | 'N';
  /** Valor dos serviços em centavos - 15 caracteres (zeros à esquerda) */
  valorServicos: number;
  /** Valor das deduções em centavos - 15 caracteres (zeros à esquerda) */
  valorDeducoes: number;
  /** Código do serviço municipal - 5 caracteres */
  codigoServico: string;
  /** CPF/CNPJ do tomador (zeros à esquerda) - 14 caracteres */
  cpfCnpjTomador: string;
  /** Dados do intermediário (opcional) - se presente, adiciona 15 caracteres */
  intermediario?: {
    /** CPF/CNPJ do intermediário - 14 caracteres */
    cpfCnpj: string;
    /** Possui indicativo de ISS Retido pelo intermediário - 1 caractere (S/N) */
    issRetidoIntermediario: 'S' | 'N';
  };
}

/**
 * Pad string to the left with zeros
 */
function padLeft(value: string | number, length: number, char: string = '0'): string {
  const str = String(value);
  return str.length >= length ? str.substring(0, length) : char.repeat(length - str.length) + str;
}

/**
 * Pad string to the right with spaces
 */
function padRight(value: string, length: number, char: string = ' '): string {
  return value.length >= length ? value.substring(0, length) : value + char.repeat(length - value.length);
}

/**
 * Build the RPS signature string (86 or 101 characters)
 * 
 * Layout:
 * - Posição 1-8: Inscrição Municipal (8 caracteres, alinhado à direita)
 * - Posição 9-13: Série RPS (5 caracteres, completar com espaços à direita)
 * - Posição 14-25: Número RPS (12 caracteres, zeros à esquerda)
 * - Posição 26-33: Data Emissão (8 caracteres, AAAAMMDD)
 * - Posição 34: Tributação (1 caractere)
 * - Posição 35: Situação (1 caractere)
 * - Posição 36: ISS Retido (1 caractere)
 * - Posição 37-51: Valor Serviços (15 caracteres, centavos, zeros à esquerda)
 * - Posição 52-66: Valor Deduções (15 caracteres, centavos, zeros à esquerda)
 * - Posição 67-71: Código Serviço (5 caracteres)
 * - Posição 72-85: CPF/CNPJ Tomador (14 caracteres, zeros à esquerda)
 * - Posição 86: Indicador CPF/CNPJ (1 para CPF, 2 para CNPJ)
 * 
 * Se houver intermediário (+15 caracteres):
 * - Posição 87-100: CPF/CNPJ Intermediário (14 caracteres)
 * - Posição 101: ISS Retido Intermediário (1 caractere)
 */
export function buildRPSSignatureString(rps: RPSData): string {
  // Clean CPF/CNPJ (remove formatting)
  const cpfCnpjClean = rps.cpfCnpjTomador.replace(/\D/g, '');
  
  // Indicator: 1=CPF, 2=CNPJ, 3=Not informed
  let indicadorTomador = '3';
  if (cpfCnpjClean.length === 11) {
    indicadorTomador = '1';
  } else if (cpfCnpjClean.length === 14) {
    indicadorTomador = '2';
  }
  
  let signatureString = '';
  
  // 1-8: Inscrição Municipal (padded left with zeros)
  signatureString += padLeft(rps.inscricaoMunicipal.replace(/\D/g, ''), 8);
  
  // 9-13: Série RPS (padded right with spaces)
  signatureString += padRight(rps.serieRPS, 5);
  
  // 14-25: Número RPS (padded left with zeros)
  signatureString += padLeft(rps.numeroRPS, 12);
  
  // 26-33: Data Emissão (AAAAMMDD)
  signatureString += rps.dataEmissao.replace(/\D/g, '').substring(0, 8);
  
  // 34: Tributação
  signatureString += rps.tributacao;
  
  // 35: Situação
  signatureString += rps.situacao;
  
  // 36: ISS Retido
  signatureString += rps.issRetido;
  
  // 37-51: Valor Serviços (em centavos, 15 dígitos)
  signatureString += padLeft(Math.round(rps.valorServicos * 100), 15);
  
  // 52-66: Valor Deduções (em centavos, 15 dígitos)
  signatureString += padLeft(Math.round(rps.valorDeducoes * 100), 15);
  
  // 67-71: Código Serviço (5 caracteres)
  signatureString += padLeft(rps.codigoServico.replace(/\D/g, ''), 5);
  
  // 72: Indicador de CPF/CNPJ do Tomador (1 dígito)
  // Per manual page 44: comes BEFORE the CPF/CNPJ
  signatureString += indicadorTomador;
  
  // 73-86: CPF/CNPJ Tomador (14 caracteres)
  // If indicator is 3 (not informed), use 14 zeros
  signatureString += padLeft(indicadorTomador === '3' ? '0' : cpfCnpjClean, 14);
  
  // Total: 86 characters (per manual NFe_Web_Service-4.md page 44)
  
  // Intermediário (opcional - adds 16 more characters if present)
  if (rps.intermediario) {
    const intermediarioCpfCnpj = rps.intermediario.cpfCnpj.replace(/\D/g, '');
    
    // Indicador de CPF/CNPJ do Intermediário (1 dígito)
    let indicadorIntermediario = '3';
    if (intermediarioCpfCnpj.length === 11) {
      indicadorIntermediario = '1';
    } else if (intermediarioCpfCnpj.length === 14) {
      indicadorIntermediario = '2';
    }
    signatureString += indicadorIntermediario;
    
    // CPF/CNPJ Intermediário (14 caracteres)
    signatureString += padLeft(indicadorIntermediario === '3' ? '0' : intermediarioCpfCnpj, 14);
    
    // ISS Retido Intermediário (1 caractere)
    signatureString += rps.intermediario.issRetidoIntermediario;
  }
  
  return signatureString;
}

/**
 * Sign the RPS string using PKCS#1 RSA-SHA1
 * 
 * @param rpsString - The concatenated RPS string (86 or 101 chars)
 * @param privateKey - The private key from the digital certificate
 * @returns Base64-encoded signature
 */
export function signRPSString(rpsString: string, privateKey: forge.pki.PrivateKey): string {
  // Create SHA-1 hash of the RPS string (ASCII encoding)
  const md = forge.md.sha1.create();
  md.update(rpsString, 'utf8');
  
  // Sign with RSA-SHA1 (PKCS#1 v1.5)
  const signature = privateKey.sign(md);
  
  // Return as Base64
  return forge.util.encode64(signature);
}

/**
 * Create complete RPS signature from RPS data
 * 
 * @param rps - The RPS data object
 * @param privateKey - The private key from the digital certificate
 * @returns Base64-encoded signature
 */
export function signRPS(rps: RPSData, privateKey: forge.pki.PrivateKey): string {
  const rpsString = buildRPSSignatureString(rps);
  return signRPSString(rpsString, privateKey);
}

/**
 * Parse a date string (various formats) to AAAAMMDD format
 */
export function formatDateForRPS(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Convert monetary value (in reais) to integer centavos
 */
export function valorToCentavos(valor: number): number {
  return Math.round(valor * 100);
}

