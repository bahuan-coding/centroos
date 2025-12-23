/**
 * Provenance Tracking
 * 
 * Every canonical record maintains full traceability to its source.
 * This enables:
 * - Debugging: "Where did this value come from?"
 * - Auditing: "Show me the evidence for this finding"
 * - Reproducibility: Same input file always produces same hash
 */

import * as crypto from 'crypto';

/**
 * Complete provenance information for a canonical record.
 * Tracks the exact source location and parsing context.
 */
export interface Provenance {
  /** Path to source file relative to project root */
  sourceFile: string;
  /** Line number in source file (1-indexed) */
  lineNumber?: number;
  /** Character positions for more precise location */
  position?: { start: number; end: number };
  /** Name of the parser that produced this record */
  parserName: string;
  /** Version of the parser for reproducibility */
  parserVersion: string;
  /** ISO timestamp when parsing occurred */
  parsedAt: string;
  /** SHA-256 hash of the raw content (first 16 chars) */
  rawHash: string;
  /** Warnings generated during parsing */
  warnings: string[];
}

/**
 * Builder configuration for creating provenance records.
 * Reused across all records from the same source file.
 */
export interface ProvenanceBuilder {
  /** Path to source file */
  sourceFile: string;
  /** Parser identifier */
  parserName: string;
  /** Parser version string */
  parserVersion: string;
}

/**
 * Creates a new ProvenanceBuilder for a source file.
 */
export function createProvenanceBuilder(
  sourceFile: string,
  parserName: string,
  parserVersion: string
): ProvenanceBuilder {
  return { sourceFile, parserName, parserVersion };
}

/**
 * Creates a Provenance record for a parsed item.
 * 
 * @param builder The builder with source file and parser info
 * @param rawContent The raw content that was parsed (for hashing)
 * @param lineNumber Optional line number in source file
 * @param warnings Any warnings generated during parsing
 */
export function createProvenance(
  builder: ProvenanceBuilder,
  rawContent: string,
  lineNumber?: number,
  warnings: string[] = []
): Provenance {
  return {
    sourceFile: builder.sourceFile,
    lineNumber,
    parserName: builder.parserName,
    parserVersion: builder.parserVersion,
    parsedAt: new Date().toISOString(),
    rawHash: hashContent(rawContent),
    warnings: [...warnings],
  };
}

/**
 * Creates a Provenance record with position information.
 */
export function createProvenanceWithPosition(
  builder: ProvenanceBuilder,
  rawContent: string,
  lineNumber: number,
  startPos: number,
  endPos: number,
  warnings: string[] = []
): Provenance {
  return {
    sourceFile: builder.sourceFile,
    lineNumber,
    position: { start: startPos, end: endPos },
    parserName: builder.parserName,
    parserVersion: builder.parserVersion,
    parsedAt: new Date().toISOString(),
    rawHash: hashContent(rawContent),
    warnings: [...warnings],
  };
}

/**
 * Computes a deterministic hash of content.
 * Uses SHA-256, truncated to 16 characters for readability.
 * 
 * IMPORTANT: This function is deterministic - same input always produces same output.
 */
export function hashContent(content: string): string {
  return crypto
    .createHash('sha256')
    .update(content, 'utf8')
    .digest('hex')
    .substring(0, 16);
}

/**
 * Merges multiple provenances into one.
 * Used when a canonical record is derived from multiple sources.
 */
export function mergeProvenances(provenances: Provenance[]): Provenance {
  if (provenances.length === 0) {
    throw new Error('Cannot merge empty provenance array');
  }
  
  if (provenances.length === 1) {
    return { ...provenances[0] };
  }
  
  const first = provenances[0];
  const sourceFiles = [...new Set(provenances.map(p => p.sourceFile))];
  const allWarnings = [...new Set(provenances.flatMap(p => p.warnings))];
  const combinedHash = provenances.map(p => p.rawHash).join(':');
  
  return {
    sourceFile: sourceFiles.length === 1 ? sourceFiles[0] : `[${sourceFiles.join(', ')}]`,
    lineNumber: first.lineNumber,
    parserName: first.parserName,
    parserVersion: first.parserVersion,
    parsedAt: new Date().toISOString(),
    rawHash: hashContent(combinedHash),
    warnings: allWarnings,
  };
}

/**
 * Adds a warning to an existing Provenance.
 * Returns a new Provenance object (immutable).
 */
export function addProvenanceWarning(p: Provenance, warning: string): Provenance {
  return {
    ...p,
    warnings: [...p.warnings, warning],
  };
}

/**
 * Formats provenance for human-readable display.
 * @example "rawdata/rawdata_janeiro.csv:42 (RawdataParser v1.0.0)"
 */
export function formatProvenance(p: Provenance): string {
  const location = p.lineNumber ? `:${p.lineNumber}` : '';
  return `${p.sourceFile}${location} (${p.parserName} v${p.parserVersion})`;
}

/**
 * Formats provenance as evidence string for audit findings.
 * Includes more detail than formatProvenance.
 */
export function provenanceToEvidence(p: Provenance): string {
  const parts: string[] = [];
  
  parts.push(`Source: ${p.sourceFile}`);
  
  if (p.lineNumber) {
    parts.push(`Line: ${p.lineNumber}`);
  }
  
  if (p.position) {
    parts.push(`Position: ${p.position.start}-${p.position.end}`);
  }
  
  parts.push(`Hash: ${p.rawHash}`);
  parts.push(`Parser: ${p.parserName} v${p.parserVersion}`);
  
  if (p.warnings.length > 0) {
    parts.push(`Warnings: ${p.warnings.join('; ')}`);
  }
  
  return parts.join(' | ');
}

/**
 * Creates a minimal provenance for database-sourced records.
 * Used when records come from DB rather than raw files.
 */
export function createDbProvenance(
  tableName: string,
  recordId: string,
  parserVersion: string = '1.0.0'
): Provenance {
  return {
    sourceFile: `db://${tableName}`,
    parserName: 'DatabaseLoader',
    parserVersion,
    parsedAt: new Date().toISOString(),
    rawHash: hashContent(`${tableName}:${recordId}`),
    warnings: [],
  };
}

/**
 * Checks if two provenances refer to the same source location.
 */
export function sameSourceLocation(a: Provenance, b: Provenance): boolean {
  return a.sourceFile === b.sourceFile && a.lineNumber === b.lineNumber;
}

/**
 * Extracts just the filename from a provenance source path.
 */
export function getSourceFilename(p: Provenance): string {
  const parts = p.sourceFile.split('/');
  return parts[parts.length - 1];
}
