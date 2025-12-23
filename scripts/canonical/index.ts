/**
 * Canonical Core Module
 * 
 * This module provides the foundational types and utilities for the
 * "Single Source of Truth" data pipeline.
 * 
 * @module canonical
 * 
 * @example
 * ```typescript
 * import {
 *   // Money utilities
 *   money, fromReais, toReais, formatMoney, addMoney, ZERO_BRL,
 *   type Money,
 *   
 *   // Date utilities
 *   parseDate, toIsoDate, formatPtBrDate,
 *   type DateParseResult,
 *   
 *   // Provenance tracking
 *   createProvenance, createProvenanceBuilder, formatProvenance,
 *   type Provenance, type ProvenanceBuilder,
 *   
 *   // Canonical types
 *   type CanonicalPerson,
 *   type CanonicalTransaction,
 *   type CanonicalBankEntry,
 *   type Finding,
 * } from './canonical';
 * ```
 */

// =============================================================================
// MONEY - Cents-based monetary values
// =============================================================================
export {
  // Types
  type Money,
  
  // Constants
  ZERO_BRL,
  
  // Factory functions
  money,
  fromReais,
  
  // Conversion
  toReais,
  
  // Arithmetic
  addMoney,
  subtractMoney,
  negateMoney,
  absMoney,
  sumMoney,
  multiplyMoney,
  divideMoney,
  
  // Comparison
  compareMoney,
  moneyEquals,
  isZero,
  isPositive,
  isNegative,
  minMoney,
  maxMoney,
  
  // Formatting
  formatMoney,
  formatMoneyShort,
} from './money';

// =============================================================================
// DATE - Date parsing and normalization
// =============================================================================
export {
  // Types
  type DateParseResult,
  
  // Parsing
  parseDate,
  parsePtBrDate,
  parseUsDate,
  parseIsoDate,
  parseAbbreviatedDate,
  
  // Conversion
  toIsoDate,
  toIsoDateTime,
  
  // Formatting
  formatPtBrDate,
  
  // Validation
  isValidDate,
  isDateInRange,
  
  // Utilities
  dateDiffDays,
  firstDayOfMonth,
  lastDayOfMonth,
  getMonth,
  getYear,
} from './date';

// =============================================================================
// PROVENANCE - Source tracking
// =============================================================================
export {
  // Types
  type Provenance,
  type ProvenanceBuilder,
  
  // Factory functions
  createProvenance,
  createProvenanceBuilder,
  createProvenanceWithPosition,
  createDbProvenance,
  
  // Utilities
  hashContent,
  mergeProvenances,
  addProvenanceWarning,
  sameSourceLocation,
  getSourceFilename,
  
  // Formatting
  formatProvenance,
  provenanceToEvidence,
} from './provenance';

// =============================================================================
// TYPES - Canonical entity types
// =============================================================================
export {
  // Document types
  type DocumentType,
  type DocumentInvalidReason,
  type CanonicalDocument,
  
  // Name types
  type NormalizedName,
  
  // Person types
  type PersonSource,
  type CanonicalPerson,
  
  // Transaction types
  type TransactionType,
  type TransactionNature,
  type AccountRef,
  type CanonicalTransaction,
  
  // Bank entry types
  type BankCode,
  type EntryDirection,
  type CanonicalBankEntry,
  
  // Matching types
  type MatchEvidence,
  type MatchStatus,
  type MatchResult,
  
  // Reconciliation types
  type ReconciliationStatus,
  type ReconciliationResult,
  
  // Finding types
  type FindingSeverity,
  type FindingCategory,
  type Evidence,
  type Finding,
  
  // Dataset types
  type CanonicalDataset,
  
  // Utility types
  type ParsedRecord,
  type ParseResult,
} from './types';


