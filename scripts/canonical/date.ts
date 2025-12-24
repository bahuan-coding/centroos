/**
 * Date Normalization Utilities
 * 
 * Handles parsing of various date formats found in Brazilian financial documents:
 * - pt-BR: "dd/mm/yyyy" (most common in Brazil)
 * - US: "mm/dd/yyyy" (used in some Excel exports)
 * - ISO: "yyyy-mm-dd" (database format)
 * - Abbreviated: "4-Aug", "15-Jan-2025"
 * 
 * All dates are normalized to ISO format for storage.
 */

/** Result of parsing a date string */
export interface DateParseResult {
  /** Parsed date, or null if parsing failed */
  date: Date | null;
  /** Detected format */
  format: 'pt-br' | 'us' | 'iso' | 'abbreviated' | 'unknown';
  /** Original input string */
  raw: string;
  /** Whether parsing was successful */
  valid: boolean;
  /** Warning message if any issue was detected */
  warning?: string;
}

/** Month abbreviations in English (as used in Excel exports) */
const MONTH_ABBR: Record<string, number> = {
  'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
  'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11,
};

/** Month abbreviations in Portuguese */
const MONTH_ABBR_PT: Record<string, number> = {
  'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3, 'mai': 4, 'jun': 5,
  'jul': 6, 'ago': 7, 'set': 8, 'out': 9, 'nov': 10, 'dez': 11,
};

/**
 * Checks if a Date object is valid (not Invalid Date).
 */
export function isValidDate(d: Date): boolean {
  return d instanceof Date && !isNaN(d.getTime());
}

/**
 * Parses a pt-BR date string (dd/mm/yyyy or dd-mm-yyyy).
 * @returns Date object or null if invalid
 */
export function parsePtBrDate(raw: string): Date | null {
  if (!raw) return null;
  
  const cleaned = raw.trim();
  // Match dd/mm/yyyy or dd-mm-yyyy
  const match = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!match) return null;
  
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // JS months are 0-indexed
  let year = parseInt(match[3], 10);
  
  // Handle 2-digit years
  if (year < 100) {
    year = year < 50 ? 2000 + year : 1900 + year;
  }
  
  const date = new Date(year, month, day);
  
  // Validate the date is real (e.g., not 31/02)
  if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
    return null;
  }
  
  return date;
}

/**
 * Parses a US date string (mm/dd/yyyy or m/d/yyyy).
 * This format is commonly found in Excel exports.
 * @returns Date object or null if invalid
 */
export function parseUsDate(raw: string): Date | null {
  if (!raw) return null;
  
  const cleaned = raw.trim();
  // Match mm/dd/yyyy or m/d/yyyy
  const match = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!match) return null;
  
  const month = parseInt(match[1], 10) - 1; // JS months are 0-indexed
  const day = parseInt(match[2], 10);
  let year = parseInt(match[3], 10);
  
  // Handle 2-digit years
  if (year < 100) {
    year = year < 50 ? 2000 + year : 1900 + year;
  }
  
  const date = new Date(year, month, day);
  
  // Validate the date is real
  if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
    return null;
  }
  
  return date;
}

/**
 * Parses an ISO date string (yyyy-mm-dd).
 * @returns Date object or null if invalid
 */
export function parseIsoDate(raw: string): Date | null {
  if (!raw) return null;
  
  const cleaned = raw.trim();
  // Match yyyy-mm-dd
  const match = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  
  const date = new Date(year, month, day);
  
  // Validate the date is real
  if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
    return null;
  }
  
  return date;
}

/**
 * Parses abbreviated date formats like "4-Aug" or "15-Jan-2025".
 * Assumes current year if year is not provided.
 * @returns Date object or null if invalid
 */
export function parseAbbreviatedDate(raw: string, defaultYear?: number): Date | null {
  if (!raw) return null;
  
  const cleaned = raw.trim().toLowerCase();
  
  // Match patterns like "4-Aug", "15-Jan", "4-Aug-2025", "15-Jan-25"
  const match = cleaned.match(/^(\d{1,2})-([a-z]{3})(?:-(\d{2,4}))?$/);
  if (!match) return null;
  
  const day = parseInt(match[1], 10);
  const monthAbbr = match[2];
  let year = match[3] ? parseInt(match[3], 10) : (defaultYear ?? new Date().getFullYear());
  
  // Handle 2-digit years
  if (year < 100) {
    year = year < 50 ? 2000 + year : 1900 + year;
  }
  
  // Try English first, then Portuguese
  let month = MONTH_ABBR[monthAbbr];
  if (month === undefined) {
    month = MONTH_ABBR_PT[monthAbbr];
  }
  if (month === undefined) return null;
  
  const date = new Date(year, month, day);
  
  // Validate
  if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
    return null;
  }
  
  return date;
}

/**
 * Main date parser that tries all formats.
 * Priority: ISO > pt-BR > abbreviated > US (US last because it's ambiguous)
 * 
 * @param raw The date string to parse
 * @param preferUsFormat If true, tries US format before pt-BR (for rawdata CSVs)
 * @param defaultYear Year to use for abbreviated dates without year
 */
export function parseDate(
  raw: string,
  preferUsFormat: boolean = false,
  defaultYear?: number
): DateParseResult {
  if (!raw || !raw.trim()) {
    return { date: null, format: 'unknown', raw, valid: false };
  }
  
  const trimmed = raw.trim();
  let warning: string | undefined;
  
  // 1. Try ISO format first (unambiguous)
  const isoDate = parseIsoDate(trimmed);
  if (isoDate) {
    return { date: isoDate, format: 'iso', raw, valid: true };
  }
  
  // 2. Try abbreviated format (unambiguous due to month names)
  const abbrDate = parseAbbreviatedDate(trimmed, defaultYear);
  if (abbrDate) {
    return { date: abbrDate, format: 'abbreviated', raw, valid: true };
  }
  
  // 3. Try numeric formats (ambiguous between pt-BR and US)
  if (preferUsFormat) {
    // Try US first (mm/dd/yyyy)
    const usDate = parseUsDate(trimmed);
    if (usDate) {
      // Check for suspicious year (typo)
      if (usDate.getFullYear() < 2020 && usDate.getFullYear() > 2000) {
        warning = `Year ${usDate.getFullYear()} may be a typo`;
      }
      return { date: usDate, format: 'us', raw, valid: true, warning };
    }
    
    // Then pt-BR
    const ptDate = parsePtBrDate(trimmed);
    if (ptDate) {
      if (ptDate.getFullYear() < 2020 && ptDate.getFullYear() > 2000) {
        warning = `Year ${ptDate.getFullYear()} may be a typo`;
      }
      return { date: ptDate, format: 'pt-br', raw, valid: true, warning };
    }
  } else {
    // Try pt-BR first (dd/mm/yyyy)
    const ptDate = parsePtBrDate(trimmed);
    if (ptDate) {
      if (ptDate.getFullYear() < 2020 && ptDate.getFullYear() > 2000) {
        warning = `Year ${ptDate.getFullYear()} may be a typo`;
      }
      return { date: ptDate, format: 'pt-br', raw, valid: true, warning };
    }
    
    // Then US
    const usDate = parseUsDate(trimmed);
    if (usDate) {
      if (usDate.getFullYear() < 2020 && usDate.getFullYear() > 2000) {
        warning = `Year ${usDate.getFullYear()} may be a typo`;
      }
      return { date: usDate, format: 'us', raw, valid: true, warning };
    }
  }
  
  return { date: null, format: 'unknown', raw, valid: false };
}

/**
 * Converts a Date to ISO date string (yyyy-mm-dd).
 * This is the canonical format for storage.
 */
export function toIsoDate(d: Date): string {
  if (!isValidDate(d)) {
    throw new Error('Cannot convert invalid date to ISO');
  }
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Converts a Date to full ISO datetime string with timezone.
 */
export function toIsoDateTime(d: Date): string {
  if (!isValidDate(d)) {
    throw new Error('Cannot convert invalid date to ISO');
  }
  return d.toISOString();
}

/**
 * Formats a Date in pt-BR format (dd/mm/yyyy).
 */
export function formatPtBrDate(d: Date): string {
  if (!isValidDate(d)) {
    throw new Error('Cannot format invalid date');
  }
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
}

/**
 * Calculates the difference in days between two dates.
 * Returns positive if a is after b, negative if before.
 */
export function dateDiffDays(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  // Use UTC to avoid DST issues
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utcA - utcB) / msPerDay);
}

/**
 * Checks if a date falls within a range (inclusive).
 */
export function isDateInRange(d: Date, start: Date, end: Date): boolean {
  const time = d.getTime();
  return time >= start.getTime() && time <= end.getTime();
}

/**
 * Gets the first day of a month.
 */
export function firstDayOfMonth(year: number, month: number): Date {
  return new Date(year, month - 1, 1);
}

/**
 * Gets the last day of a month.
 */
export function lastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0);
}

/**
 * Extracts month number (1-12) from a Date.
 */
export function getMonth(d: Date): number {
  return d.getMonth() + 1;
}

/**
 * Extracts year from a Date.
 */
export function getYear(d: Date): number {
  return d.getFullYear();
}






