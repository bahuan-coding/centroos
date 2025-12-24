/**
 * Dataset Builder - Consolidador de Dados Canônicos
 * 
 * Construtor que agrega dados de múltiplas fontes em um único CanonicalDataset
 * com indexes otimizados para queries e matching.
 * 
 * Features:
 * - Aceita dados já parseados (não faz parsing)
 * - Constrói indexes para lookup rápido
 * - Integra com Identity Resolver para linking de pessoas
 * 
 * @module pipeline/dataset-builder
 */

import type {
  CanonicalPerson,
  CanonicalTransaction,
  CanonicalBankEntry,
  CanonicalDataset,
  ReconciliationResult,
  BankCode,
} from '../canonical';
import { buildIndex, findBestMatch, type BlockingIndex } from '../matching/identity-resolver';

// =============================================================================
// EXTENDED DATASET TYPE
// =============================================================================

/** Extended dataset with additional indexes */
export interface ExtendedDataset extends CanonicalDataset {
  /** Persons indexed by CPF */
  personByCpf: Map<string, CanonicalPerson>;
  /** Transactions indexed by person ID */
  transactionsByPerson: Map<string, CanonicalTransaction[]>;
  /** Bank entries indexed by bank code */
  bankEntriesByBank: Map<BankCode, CanonicalBankEntry[]>;
}

/** Statistics about the dataset */
export interface DatasetStats {
  personCount: number;
  transactionCount: number;
  bankEntryCount: number;
  linkedTransactions: number;
  unlinkedTransactions: number;
  dateRange: { min: string; max: string } | null;
}

// =============================================================================
// DATASET BUILDER CLASS
// =============================================================================

export class DatasetBuilder {
  private persons: CanonicalPerson[] = [];
  private transactions: CanonicalTransaction[] = [];
  private bankEntries: CanonicalBankEntry[] = [];
  private reconciliation: ReconciliationResult[] = [];
  
  private personIndex: BlockingIndex | null = null;
  private personIndexDirty = true;

  // =========================================================================
  // ADD DATA
  // =========================================================================

  /** Add transactions to the dataset */
  addTransactions(txs: CanonicalTransaction[]): this {
    this.transactions.push(...txs);
    return this;
  }

  /** Add bank entries to the dataset */
  addBankEntries(entries: CanonicalBankEntry[]): this {
    this.bankEntries.push(...entries);
    return this;
  }

  /** Add persons to the dataset */
  addPersons(persons: CanonicalPerson[]): this {
    this.persons.push(...persons);
    this.personIndexDirty = true;
    return this;
  }

  /** Add reconciliation results */
  addReconciliation(results: ReconciliationResult[]): this {
    this.reconciliation.push(...results);
    return this;
  }

  // =========================================================================
  // PERSON LINKING
  // =========================================================================

  /** Rebuild person index (called automatically when needed) */
  private rebuildPersonIndex(): void {
    if (!this.personIndexDirty && this.personIndex) return;
    
    const indexData = this.persons.map(p => ({
      id: p.id,
      name: p.name.original,
      cpf: p.documents.find(d => d.type === 'cpf')?.digits,
    }));
    
    this.personIndex = buildIndex(indexData);
    this.personIndexDirty = false;
  }

  /**
   * Link transactions to persons using Identity Resolver.
   * For each transaction with personName but no personRef,
   * attempts to find a matching person and sets personRef.
   */
  linkPersonsToTransactions(): this {
    if (this.persons.length === 0) return this;
    
    this.rebuildPersonIndex();
    if (!this.personIndex) return this;
    
    for (const tx of this.transactions) {
      // Skip if already linked or no person name
      if (tx.personRef || !tx.personName) continue;
      
      const match = findBestMatch(tx.personName, this.personIndex);
      
      // Only link if confidence is at least 'low'
      if (match && match.confidence !== 'none') {
        (tx as { personRef?: string }).personRef = match.candidateId;
      }
    }
    
    return this;
  }

  /**
   * Link bank entries to persons using Identity Resolver.
   * Adds personRef to bank entries based on counterpartyName.
   */
  linkPersonsToBankEntries(): this {
    if (this.persons.length === 0) return this;
    
    this.rebuildPersonIndex();
    if (!this.personIndex) return this;
    
    for (const entry of this.bankEntries) {
      if (!entry.counterpartyName) continue;
      
      const match = findBestMatch(entry.counterpartyName, this.personIndex);
      
      if (match && match.confidence !== 'none') {
        // Store in a custom field (extend type if needed)
        (entry as { personRef?: string }).personRef = match.candidateId;
      }
    }
    
    return this;
  }

  // =========================================================================
  // BUILD
  // =========================================================================

  /** Build the final CanonicalDataset with all indexes */
  build(): ExtendedDataset {
    // Build person indexes
    const personById = new Map<string, CanonicalPerson>();
    const personByNormalizedName = new Map<string, CanonicalPerson[]>();
    const personByCpf = new Map<string, CanonicalPerson>();
    
    for (const p of this.persons) {
      personById.set(p.id, p);
      
      // Index by normalized name
      const normName = p.name.normalized;
      const existing = personByNormalizedName.get(normName) || [];
      existing.push(p);
      personByNormalizedName.set(normName, existing);
      
      // Index by CPF
      const cpfDoc = p.documents.find(d => d.type === 'cpf' && d.valid);
      if (cpfDoc) {
        personByCpf.set(cpfDoc.digits, p);
      }
    }
    
    // Build transaction indexes
    const transactionsByDate = new Map<string, CanonicalTransaction[]>();
    const transactionsByPerson = new Map<string, CanonicalTransaction[]>();
    
    for (const tx of this.transactions) {
      // By date
      const dateList = transactionsByDate.get(tx.date) || [];
      dateList.push(tx);
      transactionsByDate.set(tx.date, dateList);
      
      // By person
      if (tx.personRef) {
        const personList = transactionsByPerson.get(tx.personRef) || [];
        personList.push(tx);
        transactionsByPerson.set(tx.personRef, personList);
      }
    }
    
    // Build bank entry indexes
    const bankEntriesByDate = new Map<string, CanonicalBankEntry[]>();
    const bankEntriesByBank = new Map<BankCode, CanonicalBankEntry[]>();
    
    for (const entry of this.bankEntries) {
      // By date
      const dateList = bankEntriesByDate.get(entry.dateMovement) || [];
      dateList.push(entry);
      bankEntriesByDate.set(entry.dateMovement, dateList);
      
      // By bank
      const bankList = bankEntriesByBank.get(entry.bank) || [];
      bankList.push(entry);
      bankEntriesByBank.set(entry.bank, bankList);
    }
    
    return {
      persons: [...this.persons],
      transactions: [...this.transactions],
      bankEntries: [...this.bankEntries],
      reconciliation: [...this.reconciliation],
      personById,
      personByNormalizedName,
      personByCpf,
      transactionsByDate,
      transactionsByPerson,
      bankEntriesByDate,
      bankEntriesByBank,
    };
  }

  // =========================================================================
  // STATISTICS
  // =========================================================================

  /** Get statistics about the current dataset */
  getStats(): DatasetStats {
    const linkedTxs = this.transactions.filter(tx => tx.personRef).length;
    
    // Find date range
    const allDates = [
      ...this.transactions.map(tx => tx.date),
      ...this.bankEntries.map(e => e.dateMovement),
    ].filter(d => d);
    
    let dateRange: { min: string; max: string } | null = null;
    if (allDates.length > 0) {
      allDates.sort();
      dateRange = { min: allDates[0], max: allDates[allDates.length - 1] };
    }
    
    return {
      personCount: this.persons.length,
      transactionCount: this.transactions.length,
      bankEntryCount: this.bankEntries.length,
      linkedTransactions: linkedTxs,
      unlinkedTransactions: this.transactions.length - linkedTxs,
      dateRange,
    };
  }

  /** Clear all data */
  clear(): this {
    this.persons = [];
    this.transactions = [];
    this.bankEntries = [];
    this.reconciliation = [];
    this.personIndex = null;
    this.personIndexDirty = true;
    return this;
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/** Create a new DatasetBuilder */
export function createDatasetBuilder(): DatasetBuilder {
  return new DatasetBuilder();
}

/** Quick build from arrays */
export function buildDataset(
  persons: CanonicalPerson[],
  transactions: CanonicalTransaction[],
  bankEntries: CanonicalBankEntry[] = []
): ExtendedDataset {
  return new DatasetBuilder()
    .addPersons(persons)
    .addTransactions(transactions)
    .addBankEntries(bankEntries)
    .linkPersonsToTransactions()
    .build();
}









