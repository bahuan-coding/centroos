/**
 * Financial Matcher - Conciliação Bancária de Alta Confiança
 * 
 * Motor de conciliação que determina com score de confiança quando uma
 * transação do rawdata corresponde a um lançamento do extrato bancário.
 * 
 * Algoritmo:
 * 1. Filter candidates by date window (±3 days) and amount
 * 2. Multi-feature scoring (amount, date, name, account)
 * 3. Integrates with Identity Resolver for name matching
 * 
 * @module matching/financial-matcher
 */

import { buildIndex, findBestMatch, type BlockingIndex } from './identity-resolver';

// =============================================================================
// TYPES
// =============================================================================

export type MatchStatus = 'matched' | 'divergent' | 'suspect' | 'no_match';

export interface MatchEvidence {
  feature: string;
  contribution: number;
  detail: string;
}

/** Simplified transaction from rawdata */
export interface Transaction {
  id: string;
  date: string;           // ISO date yyyy-mm-dd
  amountCents: number;    // Always positive
  type: 'receita' | 'despesa' | 'transferencia';
  personName?: string;
  accountRef?: 'bb' | 'cef' | 'caixa' | 'bbrf';
  description?: string;
  documentNumber?: string;
}

/** Simplified bank entry */
export interface BankEntry {
  id: string;
  date: string;           // ISO date yyyy-mm-dd
  amountCents: number;    // Always positive
  direction: 'credit' | 'debit';
  bank: 'bb' | 'cef';
  counterpartyName?: string;
  description?: string;
  documentNumber?: string;
}

export interface FinancialMatch {
  bankEntryId: string;
  transactionId: string;
  score: number;
  status: MatchStatus;
  evidence: MatchEvidence[];
  dateDiff: number;
  amountDiff: number;
}

export interface TransactionIndex {
  byDateAmount: Map<string, Transaction[]>;  // "yyyy-mm-dd|cents" → transactions
  byAmount: Map<number, Transaction[]>;       // cents → transactions
  all: Transaction[];
  personIndex?: BlockingIndex;
}

export interface ReconciliationResult {
  matched: FinancialMatch[];
  unmatched: BankEntry[];
  duplicateSuspects: FinancialMatch[];
  summary: {
    totalBankEntries: number;
    matched: number;
    unmatched: number;
    duplicateSuspects: number;
  };
}

// =============================================================================
// FEATURE WEIGHTS
// =============================================================================

const WEIGHTS = {
  amount_exact: 40,
  date_exact: 25,
  date_close_1: 20,
  date_close_2: 17,
  date_close_3: 15,
  name_match: 25,     // Max contribution from Identity Resolver
  account_match: 10,
  document_match: 10,
} as const;

const DATE_WINDOW_DAYS = 3;

const STATUS_THRESHOLDS = {
  matched: 70,
  suspect: 50,
} as const;

// =============================================================================
// DATE UTILITIES
// =============================================================================

function parseIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function dateDiffDays(dateA: string, dateB: string): number {
  const a = parseIsoDate(dateA);
  const b = parseIsoDate(dateB);
  const diffMs = Math.abs(a.getTime() - b.getTime());
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function addDays(isoDate: string, days: number): string {
  const d = parseIsoDate(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function getDateRange(centerDate: string, windowDays: number): string[] {
  const dates: string[] = [];
  for (let i = -windowDays; i <= windowDays; i++) {
    dates.push(addDays(centerDate, i));
  }
  return dates;
}

// =============================================================================
// INDEX BUILDING
// =============================================================================

export function buildTransactionIndex(
  transactions: Transaction[],
  persons?: Array<{ id: string; name: string; cpf?: string }>
): TransactionIndex {
  const byDateAmount = new Map<string, Transaction[]>();
  const byAmount = new Map<number, Transaction[]>();
  
  for (const tx of transactions) {
    // Index by date + amount
    const key = `${tx.date}|${tx.amountCents}`;
    const existing = byDateAmount.get(key) || [];
    existing.push(tx);
    byDateAmount.set(key, existing);
    
    // Index by amount only (for fuzzy date matching)
    const amountList = byAmount.get(tx.amountCents) || [];
    amountList.push(tx);
    byAmount.set(tx.amountCents, amountList);
  }
  
  // Build person index if provided
  let personIndex: BlockingIndex | undefined;
  if (persons && persons.length > 0) {
    personIndex = buildIndex(persons);
  }
  
  return { byDateAmount, byAmount, all: transactions, personIndex };
}

// =============================================================================
// CANDIDATE FILTERING
// =============================================================================

function getCandidates(
  bankEntry: BankEntry,
  index: TransactionIndex,
  windowDays: number = DATE_WINDOW_DAYS
): Transaction[] {
  const candidateSet = new Set<Transaction>();
  const targetAmount = bankEntry.amountCents;
  
  // Get all dates in window
  const dates = getDateRange(bankEntry.date, windowDays);
  
  // Find transactions with matching amount in date window
  for (const date of dates) {
    const key = `${date}|${targetAmount}`;
    const matches = index.byDateAmount.get(key) || [];
    matches.forEach(tx => candidateSet.add(tx));
  }
  
  // If no exact amount matches, try amount-only index
  if (candidateSet.size === 0) {
    const amountMatches = index.byAmount.get(targetAmount) || [];
    for (const tx of amountMatches) {
      const diff = dateDiffDays(bankEntry.date, tx.date);
      if (diff <= windowDays) {
        candidateSet.add(tx);
      }
    }
  }
  
  return Array.from(candidateSet);
}

// =============================================================================
// SCORING
// =============================================================================

function scoreMatch(
  bankEntry: BankEntry,
  transaction: Transaction,
  personIndex?: BlockingIndex
): { score: number; evidence: MatchEvidence[] } {
  const evidence: MatchEvidence[] = [];
  let totalWeight = 0;
  let weightedSum = 0;
  
  // Amount Match (exact required for financial reconciliation)
  totalWeight += WEIGHTS.amount_exact;
  const amountDiff = Math.abs(bankEntry.amountCents - transaction.amountCents);
  if (amountDiff === 0) {
    weightedSum += WEIGHTS.amount_exact;
    evidence.push({
      feature: 'amount_exact',
      contribution: WEIGHTS.amount_exact,
      detail: `Exact: ${bankEntry.amountCents / 100}`,
    });
  }
  
  // Date Match
  const dateDiff = dateDiffDays(bankEntry.date, transaction.date);
  totalWeight += WEIGHTS.date_exact;
  
  if (dateDiff === 0) {
    weightedSum += WEIGHTS.date_exact;
    evidence.push({
      feature: 'date_exact',
      contribution: WEIGHTS.date_exact,
      detail: `Same day: ${bankEntry.date}`,
    });
  } else if (dateDiff === 1) {
    weightedSum += WEIGHTS.date_close_1;
    evidence.push({
      feature: 'date_close',
      contribution: WEIGHTS.date_close_1,
      detail: `±1 day: ${bankEntry.date} vs ${transaction.date}`,
    });
  } else if (dateDiff === 2) {
    weightedSum += WEIGHTS.date_close_2;
    evidence.push({
      feature: 'date_close',
      contribution: WEIGHTS.date_close_2,
      detail: `±2 days: ${bankEntry.date} vs ${transaction.date}`,
    });
  } else if (dateDiff === 3) {
    weightedSum += WEIGHTS.date_close_3;
    evidence.push({
      feature: 'date_close',
      contribution: WEIGHTS.date_close_3,
      detail: `±3 days: ${bankEntry.date} vs ${transaction.date}`,
    });
  }
  
  // Name Match (via Identity Resolver)
  if (bankEntry.counterpartyName && transaction.personName && personIndex) {
    totalWeight += WEIGHTS.name_match;
    const nameMatch = findBestMatch(bankEntry.counterpartyName, personIndex);
    
    if (nameMatch) {
      // Check if the match corresponds to this transaction's person
      const txNameMatch = findBestMatch(transaction.personName, personIndex);
      if (txNameMatch && nameMatch.candidateId === txNameMatch.candidateId) {
        const nameContrib = (nameMatch.score / 100) * WEIGHTS.name_match;
        weightedSum += nameContrib;
        evidence.push({
          feature: 'name_match',
          contribution: Math.round(nameContrib),
          detail: `${bankEntry.counterpartyName} ≈ ${transaction.personName} (${nameMatch.score}%)`,
        });
      }
    }
  } else if (bankEntry.counterpartyName && transaction.personName) {
    // Fallback: simple comparison without index
    totalWeight += WEIGHTS.name_match;
    const bankName = bankEntry.counterpartyName.toUpperCase().replace(/\s+/g, '');
    const txName = transaction.personName.toUpperCase().replace(/\s+/g, '');
    
    if (txName.includes(bankName) || bankName.includes(txName.substring(0, 8))) {
      weightedSum += WEIGHTS.name_match * 0.6;
      evidence.push({
        feature: 'name_match',
        contribution: Math.round(WEIGHTS.name_match * 0.6),
        detail: `Partial: ${bankEntry.counterpartyName} ~ ${transaction.personName}`,
      });
    }
  }
  
  // Account Match
  if (transaction.accountRef) {
    totalWeight += WEIGHTS.account_match;
    const bankCode = bankEntry.bank;
    const txAccount = transaction.accountRef;
    
    // BB entry should match BB or BBRF account
    const accountMatches = 
      (bankCode === 'bb' && (txAccount === 'bb' || txAccount === 'bbrf')) ||
      (bankCode === 'cef' && txAccount === 'cef');
    
    if (accountMatches) {
      weightedSum += WEIGHTS.account_match;
      evidence.push({
        feature: 'account_match',
        contribution: WEIGHTS.account_match,
        detail: `${bankCode.toUpperCase()} → ${txAccount.toUpperCase()}`,
      });
    }
  }
  
  // Document Match
  if (bankEntry.documentNumber && transaction.documentNumber) {
    totalWeight += WEIGHTS.document_match;
    if (bankEntry.documentNumber === transaction.documentNumber) {
      weightedSum += WEIGHTS.document_match;
      evidence.push({
        feature: 'document_match',
        contribution: WEIGHTS.document_match,
        detail: `Doc: ${bankEntry.documentNumber}`,
      });
    }
  }
  
  const score = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;
  return { score, evidence };
}

function classifyStatus(score: number): MatchStatus {
  if (score >= STATUS_THRESHOLDS.matched) return 'matched';
  if (score >= STATUS_THRESHOLDS.suspect) return 'suspect';
  return 'no_match';
}

// =============================================================================
// FIND MATCHES
// =============================================================================

export function findFinancialMatches(
  bankEntry: BankEntry,
  index: TransactionIndex,
  options: { topK?: number; minScore?: number } = {}
): FinancialMatch[] {
  const { topK = 5, minScore = 40 } = options;
  
  const candidates = getCandidates(bankEntry, index);
  const results: FinancialMatch[] = [];
  
  for (const tx of candidates) {
    const { score, evidence } = scoreMatch(bankEntry, tx, index.personIndex);
    
    if (score >= minScore) {
      results.push({
        bankEntryId: bankEntry.id,
        transactionId: tx.id,
        score,
        status: classifyStatus(score),
        evidence,
        dateDiff: dateDiffDays(bankEntry.date, tx.date),
        amountDiff: Math.abs(bankEntry.amountCents - tx.amountCents),
      });
    }
  }
  
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}

export function findBestFinancialMatch(
  bankEntry: BankEntry,
  index: TransactionIndex
): FinancialMatch | null {
  const matches = findFinancialMatches(bankEntry, index, { topK: 1 });
  return matches.length > 0 ? matches[0] : null;
}

// =============================================================================
// BATCH RECONCILIATION
// =============================================================================

export function reconcileBatch(
  bankEntries: BankEntry[],
  transactions: Transaction[],
  persons?: Array<{ id: string; name: string; cpf?: string }>
): ReconciliationResult {
  const index = buildTransactionIndex(transactions, persons);
  
  const matched: FinancialMatch[] = [];
  const unmatched: BankEntry[] = [];
  const duplicateSuspects: FinancialMatch[] = [];
  
  // Track which transactions have been matched
  const matchedTransactionIds = new Set<string>();
  
  for (const entry of bankEntries) {
    const matches = findFinancialMatches(entry, index, { topK: 3 });
    
    if (matches.length === 0) {
      unmatched.push(entry);
      continue;
    }
    
    const bestMatch = matches[0];
    
    // Check for duplicate: transaction already matched to another bank entry
    if (matchedTransactionIds.has(bestMatch.transactionId)) {
      duplicateSuspects.push(bestMatch);
      continue;
    }
    
    if (bestMatch.status === 'matched') {
      matched.push(bestMatch);
      matchedTransactionIds.add(bestMatch.transactionId);
    } else if (bestMatch.status === 'suspect') {
      duplicateSuspects.push(bestMatch);
    } else {
      unmatched.push(entry);
    }
  }
  
  return {
    matched,
    unmatched,
    duplicateSuspects,
    summary: {
      totalBankEntries: bankEntries.length,
      matched: matched.length,
      unmatched: unmatched.length,
      duplicateSuspects: duplicateSuspects.length,
    },
  };
}

// =============================================================================
// DUPLICATE DETECTION
// =============================================================================

export function detectDuplicates(matches: FinancialMatch[]): Map<string, FinancialMatch[]> {
  const byTransaction = new Map<string, FinancialMatch[]>();
  
  for (const m of matches) {
    const existing = byTransaction.get(m.transactionId) || [];
    existing.push(m);
    byTransaction.set(m.transactionId, existing);
  }
  
  // Filter to only those with duplicates
  const duplicates = new Map<string, FinancialMatch[]>();
  for (const [txId, matchList] of byTransaction) {
    if (matchList.length > 1) {
      duplicates.set(txId, matchList);
    }
  }
  
  return duplicates;
}



