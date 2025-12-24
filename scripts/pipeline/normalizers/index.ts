/**
 * Normalizers Module
 * 
 * Pure functions that transform raw input strings into normalized canonical formats.
 * No state, no side effects, no external dependencies.
 * 
 * @module pipeline/normalizers
 */

// Name normalization
export {
  normalizeName,
  removeAccents,
  normalizeWhitespace,
  tokenizeName,
  applyAliases,
  extractFirstLastTokens,
  DEFAULT_STOPWORDS,
  DEFAULT_ALIASES,
  type NameNormalizerConfig,
} from './name';

// Document normalization
export {
  parseDocument,
  parseCPF,
  parseCNPJ,
  extractDigits,
  isPartialDocument,
  detectDocumentType,
  validateCPFDigits,
  validateCNPJDigits,
  formatCPF,
  formatCNPJ,
  type DocumentParseResult,
} from './document';

// Money parsing
export {
  parsePtBrMoney,
  parseMoneyWithDirection,
  detectMoneySign,
  cleanMoneyString,
  detectDecimalSeparator,
  parseToInteger,
  type MoneyParseResult,
} from './money';

// Date utilities
export {
  parseDate,
  parsePtBrDate,
  parseUsDate,
  parseIsoDate,
  parseAbbreviatedDate,
  parseRawdataDate,
  parseBankDate,
  parseCompetencia,
  getCompetenciaFromDate,
  formatCompetencia,
  toIsoDate,
  toIsoDateTime,
  formatPtBrDate,
  dateDiffDays,
  isValidDate,
  isDateInRange,
  firstDayOfMonth,
  lastDayOfMonth,
  getMonth,
  getYear,
  type DateParseResult,
} from './date';






