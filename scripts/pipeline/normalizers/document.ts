/**
 * Document Normalizer
 * 
 * Validates and normalizes CPF/CNPJ with check digit verification.
 * 
 * @module pipeline/normalizers/document
 */

import type { CanonicalDocument, DocumentType, DocumentInvalidReason } from '../../canonical';

export interface DocumentParseResult {
  document: CanonicalDocument;
  formatted: string;
  partial: boolean;
}

/**
 * Extracts only digits from a document string.
 */
export function extractDigits(raw: string): string {
  return raw.replace(/\D/g, '');
}

/**
 * Detects if a document is partial/masked (contains * or similar).
 */
export function isPartialDocument(raw: string): boolean {
  return /[*X?]/.test(raw.toUpperCase());
}

/**
 * Detects document type by digit count.
 */
export function detectDocumentType(digits: string): DocumentType | null {
  if (digits.length === 11) return 'cpf';
  if (digits.length === 14) return 'cnpj';
  return null;
}

/**
 * Validates CPF check digits.
 * 
 * Algorithm:
 * - D1 = 11 - (sum of digits[0-8] * weights[10-2]) mod 11
 * - D2 = 11 - (sum of digits[0-9] * weights[11-2]) mod 11
 * - If result >= 10, digit = 0
 */
export function validateCPFDigits(digits: string): boolean {
  if (digits.length !== 11) return false;
  
  // Check for all same digits (invalid CPFs like 111.111.111-11)
  if (/^(\d)\1{10}$/.test(digits)) return false;
  
  const nums = digits.split('').map(d => parseInt(d, 10));
  
  // First check digit
  let sum1 = 0;
  for (let i = 0; i < 9; i++) {
    sum1 += nums[i] * (10 - i);
  }
  let d1 = 11 - (sum1 % 11);
  if (d1 >= 10) d1 = 0;
  
  if (d1 !== nums[9]) return false;
  
  // Second check digit
  let sum2 = 0;
  for (let i = 0; i < 10; i++) {
    sum2 += nums[i] * (11 - i);
  }
  let d2 = 11 - (sum2 % 11);
  if (d2 >= 10) d2 = 0;
  
  return d2 === nums[10];
}

/**
 * Validates CNPJ check digits.
 * 
 * Algorithm:
 * - Weights for D1: [5,4,3,2,9,8,7,6,5,4,3,2]
 * - Weights for D2: [6,5,4,3,2,9,8,7,6,5,4,3,2]
 * - Same mod 11 logic as CPF
 */
export function validateCNPJDigits(digits: string): boolean {
  if (digits.length !== 14) return false;
  
  // Check for all same digits
  if (/^(\d)\1{13}$/.test(digits)) return false;
  
  const nums = digits.split('').map(d => parseInt(d, 10));
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  // First check digit
  let sum1 = 0;
  for (let i = 0; i < 12; i++) {
    sum1 += nums[i] * weights1[i];
  }
  let d1 = 11 - (sum1 % 11);
  if (d1 >= 10) d1 = 0;
  
  if (d1 !== nums[12]) return false;
  
  // Second check digit
  let sum2 = 0;
  for (let i = 0; i < 13; i++) {
    sum2 += nums[i] * weights2[i];
  }
  let d2 = 11 - (sum2 % 11);
  if (d2 >= 10) d2 = 0;
  
  return d2 === nums[13];
}

/**
 * Formats CPF digits as "123.456.789-00".
 */
export function formatCPF(digits: string): string {
  if (digits.length !== 11) return digits;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Formats CNPJ digits as "12.345.678/0001-00".
 */
export function formatCNPJ(digits: string): string {
  if (digits.length !== 14) return digits;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/**
 * Parses a CPF string.
 */
export function parseCPF(raw: string): DocumentParseResult {
  const partial = isPartialDocument(raw);
  const digits = extractDigits(raw);
  
  if (partial) {
    return {
      document: { type: 'cpf', digits, valid: false, invalidReason: 'format' },
      formatted: raw,
      partial: true,
    };
  }
  
  if (digits.length !== 11) {
    return {
      document: { type: 'cpf', digits, valid: false, invalidReason: 'length' },
      formatted: digits,
      partial: false,
    };
  }
  
  if (/^(\d)\1{10}$/.test(digits)) {
    return {
      document: { type: 'cpf', digits, valid: false, invalidReason: 'all_same' },
      formatted: formatCPF(digits),
      partial: false,
    };
  }
  
  const valid = validateCPFDigits(digits);
  const invalidReason: DocumentInvalidReason | undefined = valid ? undefined : 'check_digit';
  
  return {
    document: { type: 'cpf', digits, valid, invalidReason },
    formatted: formatCPF(digits),
    partial: false,
  };
}

/**
 * Parses a CNPJ string.
 */
export function parseCNPJ(raw: string): DocumentParseResult {
  const partial = isPartialDocument(raw);
  const digits = extractDigits(raw);
  
  if (partial) {
    return {
      document: { type: 'cnpj', digits, valid: false, invalidReason: 'format' },
      formatted: raw,
      partial: true,
    };
  }
  
  if (digits.length !== 14) {
    return {
      document: { type: 'cnpj', digits, valid: false, invalidReason: 'length' },
      formatted: digits,
      partial: false,
    };
  }
  
  if (/^(\d)\1{13}$/.test(digits)) {
    return {
      document: { type: 'cnpj', digits, valid: false, invalidReason: 'all_same' },
      formatted: formatCNPJ(digits),
      partial: false,
    };
  }
  
  const valid = validateCNPJDigits(digits);
  const invalidReason: DocumentInvalidReason | undefined = valid ? undefined : 'check_digit';
  
  return {
    document: { type: 'cnpj', digits, valid, invalidReason },
    formatted: formatCNPJ(digits),
    partial: false,
  };
}

/**
 * Auto-detects and parses a document (CPF or CNPJ) from a raw string.
 */
export function parseDocument(raw: string): DocumentParseResult {
  const partial = isPartialDocument(raw);
  const digits = extractDigits(raw);
  const docType = detectDocumentType(digits);
  
  if (partial) {
    // For partial documents, try to infer type from original format
    const type: DocumentType = raw.includes('/') ? 'cnpj' : 'cpf';
    return {
      document: { type, digits, valid: false, invalidReason: 'format' },
      formatted: raw,
      partial: true,
    };
  }
  
  if (docType === 'cpf') {
    return parseCPF(raw);
  }
  
  if (docType === 'cnpj') {
    return parseCNPJ(raw);
  }
  
  // Unknown type - default to CPF
  return {
    document: { type: 'cpf', digits, valid: false, invalidReason: 'length' },
    formatted: digits,
    partial: false,
  };
}


