/**
 * Canonical Entity Types
 * 
 * These types represent the "Single Source of Truth" for all data in the system.
 * Every raw source (CSV, TXT, DB) is transformed into these canonical types.
 * 
 * Key principles:
 * - Money is always in cents (see Money type)
 * - Dates are always ISO strings
 * - Names are normalized with tokens
 * - Every record has provenance
 */

import type { Money } from './money';
import type { Provenance } from './provenance';

// =============================================================================
// DOCUMENT TYPES
// =============================================================================

/** Types of identity documents */
export type DocumentType = 'cpf' | 'cnpj';

/** Reasons why a document might be invalid */
export type DocumentInvalidReason = 'check_digit' | 'length' | 'all_same' | 'format';

/**
 * A validated and normalized identity document.
 * Digits are stored without formatting (only numbers).
 */
export interface CanonicalDocument {
  /** Type of document */
  type: DocumentType;
  /** Document number with only digits (no dots, dashes, slashes) */
  digits: string;
  /** Whether the document passed validation */
  valid: boolean;
  /** If invalid, the reason why */
  invalidReason?: DocumentInvalidReason;
}

// =============================================================================
// NAME TYPES
// =============================================================================

/**
 * A normalized name with tokenization for matching.
 * Used for fuzzy matching and deduplication.
 */
export interface NormalizedName {
  /** Original name as received from source */
  original: string;
  /** Normalized: uppercase, no accents, single spaces, trimmed */
  normalized: string;
  /** Tokens: split by space, stopwords removed */
  tokens: string[];
  /** First meaningful token (for blocking in matching) */
  firstToken: string;
  /** Last meaningful token (for blocking in matching) */
  lastToken: string;
}

// =============================================================================
// PERSON TYPES
// =============================================================================

/** Sources from which a person record can originate */
export type PersonSource = 'db' | 'rawdata' | 'doacao_csv' | 'extrato';

/**
 * A canonical person record.
 * Represents a unique individual or organization.
 */
export interface CanonicalPerson {
  /** Unique identifier (UUID or generated) */
  id: string;
  /** Normalized name with tokens */
  name: NormalizedName;
  /** Associated identity documents */
  documents: CanonicalDocument[];
  /** Where this record originated */
  source: PersonSource;
  /** Full provenance for traceability */
  provenance: Provenance;
}

// =============================================================================
// TRANSACTION TYPES
// =============================================================================

/** High-level transaction types */
export type TransactionType = 'receita' | 'despesa' | 'transferencia';

/** Nature/category of a transaction */
export type TransactionNature =
  | 'contribuicao'   // Member contributions
  | 'doacao'         // General donations
  | 'premiacao'      // SEFAZ/NFC prizes
  | 'rendimento'     // Bank interest/yields
  | 'utilidade'      // Utilities (water, power, etc.)
  | 'servico'        // Services
  | 'material'       // Materials/supplies
  | 'taxa'           // Fees
  | 'tarifa'         // Bank fees
  | 'imposto'        // Taxes
  | 'outros';        // Other

/** Financial accounts in the system */
export type AccountRef = 'caixa' | 'bb' | 'bbrf' | 'cef';

/**
 * A canonical financial transaction.
 * Represents any income or expense record.
 */
export interface CanonicalTransaction {
  /** Unique identifier */
  id: string;
  /** Transaction date in ISO format (yyyy-mm-dd) */
  date: string;
  /** Amount in cents (always positive, type indicates direction) */
  amount: Money;
  /** Transaction type */
  type: TransactionType;
  /** Nature/category */
  nature: TransactionNature;
  /** Description from source */
  description: string;
  /** Reference to CanonicalPerson.id if linked */
  personRef?: string;
  /** Original person name from source (before matching) */
  personName?: string;
  /** Which account this transaction affects */
  accountRef?: AccountRef;
  /** Document number (nota fiscal, recibo, etc.) */
  documentNumber?: string;
  /** CNPJ of counterparty if available */
  counterpartyCnpj?: string;
  /** Full provenance for traceability */
  provenance: Provenance;
}

// =============================================================================
// BANK ENTRY TYPES
// =============================================================================

/** Bank codes */
export type BankCode = 'bb' | 'caixa';

/** Direction of bank entry */
export type EntryDirection = 'credit' | 'debit';

/**
 * A canonical bank statement entry.
 * Represents a line from a bank extract (BB or CAIXA).
 */
export interface CanonicalBankEntry {
  /** Unique identifier */
  id: string;
  /** Which bank this entry is from */
  bank: BankCode;
  /** Date when transaction occurred (ISO format) */
  dateMovement: string;
  /** Date when it hit the balance, if different (BB has this) */
  dateBalance?: string;
  /** Amount in cents */
  amount: Money;
  /** Credit or debit */
  direction: EntryDirection;
  /** Original description from bank */
  description: string;
  /** Document/reference number if available */
  documentNumber?: string;
  /** Name of counterparty if available */
  counterpartyName?: string;
  /** CPF/CNPJ of counterparty if available (partial or full) */
  counterpartyDocument?: string;
  /** Full provenance for traceability */
  provenance: Provenance;
}

// =============================================================================
// MATCHING TYPES
// =============================================================================

/**
 * Evidence for how a match was determined.
 * Explains why two records were linked.
 */
export interface MatchEvidence {
  /** Rule that contributed to the match */
  rule: string;
  /** Points contributed (0-100) */
  contribution: number;
  /** Human-readable explanation */
  details: string;
}

/** Overall match status */
export type MatchStatus = 'exact' | 'high_confidence' | 'low_confidence' | 'no_match';

/**
 * Result of matching two records.
 */
export interface MatchResult {
  /** Overall status */
  status: MatchStatus;
  /** Confidence score (0-100) */
  score: number;
  /** ID of matched record if found */
  matchedId?: string;
  /** Evidence explaining the match */
  evidence: MatchEvidence[];
}

// =============================================================================
// RECONCILIATION TYPES
// =============================================================================

/** Status of financial reconciliation */
export type ReconciliationStatus =
  | 'matched'     // Successfully matched
  | 'divergent'   // Matched but values differ
  | 'missing'     // Expected but not found
  | 'duplicate'   // Appears multiple times
  | 'suspect';    // Needs manual review

/**
 * Result of reconciling transactions with bank entries.
 */
export interface ReconciliationResult {
  /** Overall status */
  status: ReconciliationStatus;
  /** Matched transactions */
  transactions: CanonicalTransaction[];
  /** Matched bank entries */
  bankEntries: CanonicalBankEntry[];
  /** Evidence for the reconciliation */
  evidence: MatchEvidence[];
}

// =============================================================================
// FINDING TYPES (FOR VALIDATORS)
// =============================================================================

/** Severity levels for audit findings */
export type FindingSeverity = 'info' | 'aviso' | 'erro' | 'critico';

/** Categories for audit findings */
export type FindingCategory =
  | 'cadastro'      // Person/registration issues
  | 'operacional'   // Operational issues
  | 'contabil'      // Accounting issues
  | 'fiscal'        // Tax/compliance issues
  | 'conciliacao';  // Reconciliation issues

/**
 * Evidence supporting an audit finding.
 * Includes provenance and match evidence.
 */
export interface Evidence {
  /** Provenance records for all involved sources */
  provenance: Provenance[];
  /** Match evidence if finding involves matching */
  matchEvidence?: MatchEvidence[];
  /** Raw excerpt from source for context */
  rawExcerpt?: string;
}

/**
 * An audit finding (issue detected by a validator).
 */
export interface Finding {
  /** Rule code (e.g., "DOA-002") */
  code: string;
  /** Severity level */
  severity: FindingSeverity;
  /** Category */
  category: FindingCategory;
  /** Type of entity involved */
  entityType: string;
  /** ID of specific entity if applicable */
  entityId?: string;
  /** Human-readable message */
  message: string;
  /** Structured details for programmatic use */
  details: Record<string, unknown>;
  /** Evidence supporting this finding */
  evidence: Evidence;
  /** Suggested action to resolve */
  suggestion?: string;
}

// =============================================================================
// DATASET TYPES
// =============================================================================

/**
 * A complete canonical dataset.
 * This is the "Single Source of Truth" for the entire system.
 */
export interface CanonicalDataset {
  /** All persons from all sources */
  persons: CanonicalPerson[];
  /** All transactions from all sources */
  transactions: CanonicalTransaction[];
  /** All bank entries from all sources */
  bankEntries: CanonicalBankEntry[];
  /** Results of reconciliation */
  reconciliation: ReconciliationResult[];
  
  // Indexes for fast lookup
  /** Persons indexed by ID */
  personById: Map<string, CanonicalPerson>;
  /** Persons indexed by normalized name (may have multiple) */
  personByNormalizedName: Map<string, CanonicalPerson[]>;
  /** Transactions indexed by date */
  transactionsByDate: Map<string, CanonicalTransaction[]>;
  /** Bank entries indexed by date */
  bankEntriesByDate: Map<string, CanonicalBankEntry[]>;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Result of parsing a single record.
 * Includes the record and any warnings.
 */
export interface ParsedRecord<T> {
  /** The parsed record */
  record: T;
  /** Warnings generated during parsing */
  warnings: string[];
  /** Line number in source file */
  lineNumber: number;
}

/**
 * Result of parsing an entire file.
 */
export interface ParseResult<T> {
  /** All successfully parsed records */
  records: ParsedRecord<T>[];
  /** File-level provenance */
  provenance: Provenance;
  /** Confidence in the parsing (0-1) */
  confidence: number;
  /** File-level warnings */
  warnings: string[];
  /** Count of records that failed to parse */
  failedCount: number;
}






