/**
 * Name Normalizer
 * 
 * Normalizes Brazilian names for fuzzy matching and deduplication.
 * Handles accents, stopwords, and common aliases.
 * 
 * @module pipeline/normalizers/name
 */

import type { NormalizedName } from '../../canonical';

export interface NameNormalizerConfig {
  stopwords: string[];
  aliasMap: Map<string, string>;
}

/** Common Brazilian name stopwords */
export const DEFAULT_STOPWORDS = [
  'DE', 'DA', 'DO', 'DOS', 'DAS', 'E', 'O', 'A', 'OS', 'AS'
];

/** Common Brazilian nickname → formal name mappings */
export const DEFAULT_ALIASES = new Map([
  ['ZE', 'JOSE'],
  ['BETO', 'ALBERTO'],
  ['NEGA', 'BENEDITA'],
  ['DUDU', 'EDUARDO'],
  ['CHICO', 'FRANCISCO'],
  ['MANE', 'MANUEL'],
  ['TIAO', 'SEBASTIAO'],
  ['ZECA', 'JOSE'],
  ['KIKO', 'FRANCISCO'],
  ['LILI', 'ELIZABETH'],
  ['GABI', 'GABRIELA'],
  ['DUDA', 'EDUARDO'],
  ['RAFA', 'RAFAEL'],
  ['NANDO', 'FERNANDO'],
  ['LEO', 'LEONARDO'],
]);

/**
 * Removes accents from a string using Unicode NFD normalization.
 * á→a, ç→c, ñ→n, etc.
 */
export function removeAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Collapses multiple whitespace characters into single spaces and trims.
 */
export function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Tokenizes a normalized name string, removing stopwords.
 */
export function tokenizeName(normalized: string, stopwords: string[]): string[] {
  const stopSet = new Set(stopwords);
  return normalized
    .split(' ')
    .filter(token => token.length > 0 && !stopSet.has(token));
}

/**
 * Applies alias mapping to tokens (e.g., ZE → JOSE).
 */
export function applyAliases(tokens: string[], aliasMap: Map<string, string>): string[] {
  return tokens.map(token => aliasMap.get(token) ?? token);
}

/**
 * Extracts first and last meaningful tokens for blocking in matching.
 */
export function extractFirstLastTokens(tokens: string[]): { first: string; last: string } {
  if (tokens.length === 0) {
    return { first: '', last: '' };
  }
  return {
    first: tokens[0],
    last: tokens[tokens.length - 1],
  };
}

/**
 * Main entry point: normalizes a Brazilian name for matching.
 * 
 * Algorithm:
 * 1. Trim and collapse whitespace
 * 2. Uppercase
 * 3. Remove accents (NFD normalization)
 * 4. Remove parentheses content as separate tokens
 * 5. Tokenize and remove stopwords
 * 6. Apply aliases
 * 
 * @example
 * normalizeName("Maria de Fátima (Lili)")
 * // => { normalized: "MARIA FATIMA ELIZABETH", tokens: ["MARIA", "FATIMA", "ELIZABETH"], ... }
 */
export function normalizeName(
  raw: string,
  config?: Partial<NameNormalizerConfig>
): NormalizedName {
  const stopwords = config?.stopwords ?? DEFAULT_STOPWORDS;
  const aliasMap = config?.aliasMap ?? DEFAULT_ALIASES;
  
  if (!raw || raw.trim().length === 0) {
    return {
      original: raw ?? '',
      normalized: '',
      tokens: [],
      firstToken: '',
      lastToken: '',
    };
  }
  
  // Step 1: Trim and collapse whitespace
  let cleaned = normalizeWhitespace(raw);
  
  // Step 2: Handle parentheses - extract content as additional tokens
  cleaned = cleaned.replace(/[()]/g, ' ');
  cleaned = normalizeWhitespace(cleaned);
  
  // Step 3: Uppercase
  cleaned = cleaned.toUpperCase();
  
  // Step 4: Remove accents
  cleaned = removeAccents(cleaned);
  
  // Step 5: Tokenize and remove stopwords
  let tokens = tokenizeName(cleaned, stopwords);
  
  // Step 6: Apply aliases
  tokens = applyAliases(tokens, aliasMap);
  
  // Build normalized string from tokens
  const normalized = tokens.join(' ');
  const { first, last } = extractFirstLastTokens(tokens);
  
  return {
    original: raw,
    normalized,
    tokens,
    firstToken: first,
    lastToken: last,
  };
}


