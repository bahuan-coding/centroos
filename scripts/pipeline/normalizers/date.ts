/**
 * Date Normalizer Wrapper
 * 
 * Convenience wrapper around canonical/date with format detection
 * for specific use cases (rawdata, bank extracts, competência).
 * 
 * @module pipeline/normalizers/date
 */

// Re-export from canonical
export {
  parseDate,
  parsePtBrDate,
  parseUsDate,
  parseIsoDate,
  parseAbbreviatedDate,
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
} from '../../canonical';

import { parseDate, toIsoDate, isValidDate, type DateParseResult } from '../../canonical';

/** Portuguese month names */
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Parses a date from rawdata CSVs (US format preferred: mm/dd/yyyy).
 * Also handles abbreviated formats like "4-Aug".
 */
export function parseRawdataDate(raw: string, defaultYear?: number): DateParseResult {
  return parseDate(raw, true, defaultYear ?? new Date().getFullYear());
}

/**
 * Parses a date from bank extracts (pt-BR format preferred: dd/mm/yyyy).
 */
export function parseBankDate(raw: string): DateParseResult {
  return parseDate(raw, false);
}

/**
 * Creates a competência date string (first day of month) in ISO format.
 * 
 * @example
 * parseCompetencia(2025, 1) // => "2025-01-01"
 */
export function parseCompetencia(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return toIsoDate(d);
}

/**
 * Extracts year and month from a Date object.
 */
export function getCompetenciaFromDate(date: Date): { year: number; month: number } {
  if (!isValidDate(date)) {
    throw new Error('Cannot extract competência from invalid date');
  }
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
}

/**
 * Formats a competência as "Mês/Ano" (e.g., "Janeiro/2025").
 */
export function formatCompetencia(year: number, month: number): string {
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}`);
  }
  return `${MESES[month - 1]}/${year}`;
}



