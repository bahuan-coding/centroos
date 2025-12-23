/**
 * Money Parser
 * 
 * Parses Brazilian money format strings into cents-based Money.
 * Handles all variations found in rawdata and bank extracts.
 * 
 * CRITICAL: Never uses parseFloat for final conversion.
 * 
 * @module pipeline/normalizers/money
 */

import type { Money } from '../../canonical';

export interface MoneyParseResult {
  money: Money | null;
  raw: string;
  valid: boolean;
  warnings: string[];
  sign: 'positive' | 'negative' | 'unknown';
}

/**
 * Detects the sign of a money string from prefix/suffix indicators.
 */
export function detectMoneySign(raw: string): 'positive' | 'negative' | 'unknown' {
  const cleaned = raw.trim();
  
  // Negative indicators
  if (cleaned.startsWith('-')) return 'negative';
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) return 'negative';
  if (/\bD\s*$/.test(cleaned)) return 'negative'; // Debit suffix
  
  // Positive indicators
  if (cleaned.startsWith('+')) return 'positive';
  if (/\bC\s*$/.test(cleaned)) return 'positive'; // Credit suffix
  
  return 'unknown';
}

/**
 * Cleans a money string: removes R$, quotes, currency symbols, spaces.
 */
export function cleanMoneyString(raw: string): string {
  let s = raw.trim();
  
  // Remove quotes
  s = s.replace(/^["']|["']$/g, '');
  s = s.trim();
  
  // Remove R$ and currency symbols
  s = s.replace(/R\$\s*/gi, '');
  s = s.replace(/[$€£¥]/g, '');
  
  // Remove D/C suffix (bank direction)
  s = s.replace(/\s*[DC]\s*$/i, '');
  
  // Remove parentheses (negative indicator)
  s = s.replace(/^\(|\)$/g, '');
  
  // Remove leading +/-
  s = s.replace(/^[+-]\s*/, '');
  
  // Trim internal spaces
  s = s.replace(/\s+/g, '');
  
  return s;
}

/**
 * Detects the decimal separator in a cleaned money string.
 * 
 * Rules:
 * - If last separator is "," and 2 digits follow → decimal is ","
 * - If last separator is "." and 2 digits follow → decimal is "."
 */
export function detectDecimalSeparator(cleaned: string): '.' | ',' | null {
  // Match patterns like "1.234,56" or "1,234.56" or "100.00" or "100,00"
  const commaMatch = cleaned.match(/,(\d{1,2})$/);
  const dotMatch = cleaned.match(/\.(\d{1,2})$/);
  
  if (commaMatch && dotMatch) {
    // Both present - last one is the decimal separator
    const commaPos = cleaned.lastIndexOf(',');
    const dotPos = cleaned.lastIndexOf('.');
    return commaPos > dotPos ? ',' : '.';
  }
  
  if (commaMatch) return ',';
  if (dotMatch) return '.';
  
  // No decimal separator found - could be whole number
  return null;
}

/**
 * Parses a cleaned money string to cents (integer).
 * CRITICAL: Does NOT use parseFloat to avoid floating point errors.
 */
export function parseToInteger(cleaned: string, decimalSep: '.' | ',' | null): number {
  if (!cleaned || cleaned === '') return 0;
  
  // Remove thousand separators
  let normalized: string;
  
  if (decimalSep === ',') {
    // pt-BR format: 1.234,56 → remove dots, replace comma with nothing
    normalized = cleaned.replace(/\./g, '');
    const parts = normalized.split(',');
    if (parts.length === 2) {
      const intPart = parseInt(parts[0] || '0', 10);
      let decPart = parts[1];
      // Pad or truncate to 2 digits
      if (decPart.length === 1) decPart = decPart + '0';
      if (decPart.length > 2) decPart = decPart.slice(0, 2);
      const decValue = parseInt(decPart, 10);
      return intPart * 100 + decValue;
    }
    return parseInt(normalized, 10) * 100;
  }
  
  if (decimalSep === '.') {
    // US format or plain: 1,234.56 → remove commas
    normalized = cleaned.replace(/,/g, '');
    const parts = normalized.split('.');
    if (parts.length === 2) {
      const intPart = parseInt(parts[0] || '0', 10);
      let decPart = parts[1];
      if (decPart.length === 1) decPart = decPart + '0';
      if (decPart.length > 2) decPart = decPart.slice(0, 2);
      const decValue = parseInt(decPart, 10);
      return intPart * 100 + decValue;
    }
    return parseInt(normalized, 10) * 100;
  }
  
  // No decimal separator - treat as whole reais
  normalized = cleaned.replace(/[.,]/g, '');
  return parseInt(normalized, 10) * 100;
}

/**
 * Main money parser for pt-BR format strings.
 * 
 * Handles:
 * - "1.234,56" (pt-BR format)
 * - "1,234.56" (US/mixed format)
 * - "-100.00" (negative with minus)
 * - "(100.00)" (negative with parentheses)
 * - "R$ 1.234,56" (with currency)
 * - "150,00 C" / "618,86 D" (bank credit/debit)
 * - Quoted values from CSV
 */
export function parsePtBrMoney(raw: string): MoneyParseResult {
  const warnings: string[] = [];
  
  if (!raw || raw.trim() === '') {
    return { money: null, raw, valid: false, warnings: ['empty'], sign: 'unknown' };
  }
  
  const sign = detectMoneySign(raw);
  const cleaned = cleanMoneyString(raw);
  
  if (!cleaned || !/\d/.test(cleaned)) {
    return { money: null, raw, valid: false, warnings: ['no_digits'], sign };
  }
  
  // Check for excessive decimal places
  const decMatch = cleaned.match(/[.,](\d+)$/);
  if (decMatch && decMatch[1].length > 2) {
    warnings.push(`Truncated to 2 decimal places from ${decMatch[1].length}`);
  }
  
  const decimalSep = detectDecimalSeparator(cleaned);
  const cents = parseToInteger(cleaned, decimalSep);
  
  if (isNaN(cents)) {
    return { money: null, raw, valid: false, warnings: ['parse_error'], sign };
  }
  
  const finalCents = sign === 'negative' ? -Math.abs(cents) : Math.abs(cents);
  
  return {
    money: { cents: finalCents, currency: 'BRL' },
    raw,
    valid: true,
    warnings,
    sign: sign === 'unknown' ? (cents >= 0 ? 'positive' : 'negative') : sign,
  };
}

/**
 * Parses money with explicit direction (for bank extracts).
 * 
 * @param raw Money string
 * @param direction Optional 'D' (debit/negative) or 'C' (credit/positive)
 */
export function parseMoneyWithDirection(raw: string, direction?: 'D' | 'C'): MoneyParseResult {
  const result = parsePtBrMoney(raw);
  
  if (!result.valid || !result.money) return result;
  
  if (direction === 'D') {
    result.money.cents = -Math.abs(result.money.cents);
    result.sign = 'negative';
  } else if (direction === 'C') {
    result.money.cents = Math.abs(result.money.cents);
    result.sign = 'positive';
  }
  
  return result;
}



