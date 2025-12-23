/**
 * Matching Module
 * 
 * Provides identity resolution and financial reconciliation capabilities.
 * 
 * @module matching
 */

// Identity Resolver - Person matching
export {
  // Types
  type ConfidenceLevel,
  type FeatureEvidence,
  type IdentityMatch,
  type IndexedPerson,
  type BlockingIndex,
  type ResolutionResult,
  
  // Functions
  buildIndex,
  findMatches,
  findBestMatch,
  scoreMatch,
  classifyConfidence,
  resolveIdentities,
} from './identity-resolver';

// Financial Matcher - Bank reconciliation
export {
  // Types
  type MatchStatus,
  type MatchEvidence,
  type Transaction,
  type BankEntry,
  type FinancialMatch,
  type TransactionIndex,
  type ReconciliationResult,
  
  // Functions
  buildTransactionIndex,
  findFinancialMatches,
  findBestFinancialMatch,
  reconcileBatch,
  detectDuplicates,
} from './financial-matcher';

