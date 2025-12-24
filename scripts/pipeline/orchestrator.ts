/**
 * Pipeline Orchestrator - Full End-to-End Data Processing Pipeline
 * 
 * Integrates all pipeline modules:
 * - Source Registry (auto-detection)
 * - Parsers (Rawdata, BB, CEF, Doação)
 * - Dataset Builder (consolidation)
 * - Identity Resolver (person linking)
 * - Financial Matcher (reconciliation)
 * 
 * @module pipeline/orchestrator
 */

import * as fs from 'fs';
import * as path from 'path';
import type { CanonicalTransaction, CanonicalBankEntry, CanonicalPerson } from '../canonical';
import { parseSourceBatch, type SourceFile, type BatchResult } from './registry';
import { DatasetBuilder, type ExtendedDataset } from './dataset-builder';
import {
  reconcileBatch,
  type Transaction,
  type BankEntry,
  type ReconciliationResult,
} from '../matching/financial-matcher';

// =============================================================================
// TYPES
// =============================================================================

export interface PipelineOptions {
  /** Default year for date parsing */
  year?: number;
  /** Directory containing raw files */
  rawdataDir?: string;
  /** File patterns to include (glob-like) */
  includePatterns?: RegExp[];
  /** File patterns to exclude */
  excludePatterns?: RegExp[];
  /** Enable verbose logging */
  verbose?: boolean;
}

export interface PipelineStats {
  filesProcessed: number;
  filesUnrecognized: number;
  transactions: number;
  bankEntries: number;
  personsLinked: number;
  personsUnlinked: number;
  reconciled: {
    matched: number;
    unmatched: number;
    suspect: number;
  };
  duration: {
    parse: number;
    link: number;
    reconcile: number;
    total: number;
  };
}

export interface PipelineResult {
  dataset: ExtendedDataset;
  reconciliation: ReconciliationResult | null;
  stats: PipelineStats;
  warnings: string[];
}

// =============================================================================
// PIPELINE ORCHESTRATOR
// =============================================================================

export class PipelineOrchestrator {
  private options: PipelineOptions = {};
  private files: SourceFile[] = [];
  private batchResult: BatchResult | null = null;
  private datasetBuilder: DatasetBuilder | null = null;
  private dataset: ExtendedDataset | null = null;
  private reconciliation: ReconciliationResult | null = null;
  private warnings: string[] = [];
  private timings: { parse: number; link: number; reconcile: number } = { parse: 0, link: 0, reconcile: 0 };
  private startTime: number = 0;

  // ===========================================================================
  // CONFIGURATION
  // ===========================================================================

  /**
   * Configure pipeline options.
   */
  configure(options: PipelineOptions): this {
    this.options = { ...this.options, ...options };
    return this;
  }

  // ===========================================================================
  // FILE LOADING
  // ===========================================================================

  /**
   * Load all files from a directory.
   */
  async loadDirectory(dir: string): Promise<this> {
    const resolvedDir = path.resolve(dir);
    
    if (!fs.existsSync(resolvedDir)) {
      throw new Error(`Directory not found: ${resolvedDir}`);
    }
    
    const entries = fs.readdirSync(resolvedDir, { withFileTypes: true });
    const files: SourceFile[] = [];
    
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      
      const filename = entry.name;
      const filepath = path.join(resolvedDir, filename);
      
      // Skip non-data files
      if (!/\.(csv|txt)$/i.test(filename)) continue;
      
      // Apply exclude patterns
      if (this.options.excludePatterns?.some(p => p.test(filename))) continue;
      
      // Apply include patterns (if specified)
      if (this.options.includePatterns?.length) {
        if (!this.options.includePatterns.some(p => p.test(filename))) continue;
      }
      
      const content = fs.readFileSync(filepath, 'utf-8');
      files.push({ content, filename, path: filepath });
    }
    
    this.files = files;
    
    if (this.options.verbose) {
      console.log(`📁 Loaded ${files.length} files from ${dir}`);
    }
    
    return this;
  }

  /**
   * Load specific files.
   */
  loadFiles(files: SourceFile[]): this {
    this.files = files;
    return this;
  }

  // ===========================================================================
  // PARSING
  // ===========================================================================

  /**
   * Parse all loaded files using Source Registry.
   */
  parse(): this {
    const start = performance.now();
    
    this.batchResult = parseSourceBatch(this.files);
    
    this.timings.parse = performance.now() - start;
    
    if (this.batchResult.unrecognized.length > 0) {
      this.warnings.push(`${this.batchResult.unrecognized.length} files not recognized`);
    }
    
    if (this.options.verbose) {
      console.log(`📄 Parsed: ${this.batchResult.transactions.length} transactions, ${this.batchResult.bankEntries.length} bank entries`);
      if (this.batchResult.unrecognized.length > 0) {
        console.log(`⚠️  Unrecognized: ${this.batchResult.unrecognized.join(', ')}`);
      }
    }
    
    return this;
  }

  // ===========================================================================
  // DATASET BUILDING
  // ===========================================================================

  /**
   * Build consolidated dataset from parsed data.
   */
  buildDataset(): this {
    if (!this.batchResult) {
      throw new Error('Must call parse() before buildDataset()');
    }
    
    this.datasetBuilder = new DatasetBuilder()
      .addTransactions(this.batchResult.transactions)
      .addBankEntries(this.batchResult.bankEntries);
    
    return this;
  }

  /**
   * Add persons to the dataset (for linking).
   */
  addPersons(persons: CanonicalPerson[]): this {
    if (!this.datasetBuilder) {
      throw new Error('Must call buildDataset() before addPersons()');
    }
    
    this.datasetBuilder.addPersons(persons);
    return this;
  }

  // ===========================================================================
  // PERSON LINKING
  // ===========================================================================

  /**
   * Link persons to transactions using Identity Resolver.
   */
  linkPersons(): this {
    const start = performance.now();
    
    if (!this.datasetBuilder) {
      throw new Error('Must call buildDataset() before linkPersons()');
    }
    
    this.datasetBuilder
      .linkPersonsToTransactions()
      .linkPersonsToBankEntries();
    
    this.timings.link = performance.now() - start;
    
    return this;
  }

  // ===========================================================================
  // RECONCILIATION
  // ===========================================================================

  /**
   * Reconcile transactions with bank entries using Financial Matcher.
   */
  reconcile(): this {
    const start = performance.now();
    
    if (!this.batchResult) {
      throw new Error('Must call parse() before reconcile()');
    }
    
    // Convert to Financial Matcher types
    const transactions: Transaction[] = this.batchResult.transactions.map(tx => ({
      id: tx.id,
      date: tx.date,
      amountCents: tx.amount.cents,
      type: tx.type,
      personName: tx.personName,
      accountRef: tx.accountRef,
      description: tx.description,
      documentNumber: tx.documentNumber,
    }));
    
    const bankEntries: BankEntry[] = this.batchResult.bankEntries.map(e => ({
      id: e.id,
      date: e.dateMovement,
      amountCents: e.amount.cents,
      direction: e.direction,
      bank: e.bank,
      counterpartyName: e.counterpartyName,
      description: e.description,
      documentNumber: e.documentNumber,
    }));
    
    this.reconciliation = reconcileBatch(bankEntries, transactions);
    
    this.timings.reconcile = performance.now() - start;
    
    if (this.options.verbose) {
      const r = this.reconciliation.summary;
      console.log(`🔗 Reconciled: ${r.matched} matched, ${r.unmatched} unmatched, ${r.duplicateSuspects} suspects`);
    }
    
    return this;
  }

  // ===========================================================================
  // FINALIZE
  // ===========================================================================

  /**
   * Finalize and build the dataset.
   */
  finalize(): this {
    if (!this.datasetBuilder) {
      throw new Error('Must call buildDataset() before finalize()');
    }
    
    this.dataset = this.datasetBuilder.build();
    return this;
  }

  // ===========================================================================
  // RUN (FULL PIPELINE)
  // ===========================================================================

  /**
   * Run the full pipeline end-to-end.
   */
  async run(): Promise<PipelineResult> {
    this.startTime = performance.now();
    
    // Auto-load from directory if configured
    if (this.options.rawdataDir && this.files.length === 0) {
      await this.loadDirectory(this.options.rawdataDir);
    }
    
    if (this.files.length === 0) {
      throw new Error('No files loaded. Call loadDirectory() or loadFiles() first.');
    }
    
    // Execute pipeline
    this.parse()
      .buildDataset()
      .linkPersons()
      .reconcile()
      .finalize();
    
    const totalDuration = performance.now() - this.startTime;
    
    return {
      dataset: this.dataset!,
      reconciliation: this.reconciliation,
      stats: this.getStats(totalDuration),
      warnings: this.warnings,
    };
  }

  // ===========================================================================
  // GETTERS
  // ===========================================================================

  getDataset(): ExtendedDataset {
    if (!this.dataset) {
      throw new Error('Pipeline not finalized. Call run() or finalize() first.');
    }
    return this.dataset;
  }

  getReconciliation(): ReconciliationResult | null {
    return this.reconciliation;
  }

  getBatchResult(): BatchResult | null {
    return this.batchResult;
  }

  private getStats(totalDuration: number): PipelineStats {
    const dsStats = this.datasetBuilder?.getStats();
    const reconSummary = this.reconciliation?.summary;
    
    return {
      filesProcessed: this.batchResult?.processed.length ?? 0,
      filesUnrecognized: this.batchResult?.unrecognized.length ?? 0,
      transactions: dsStats?.transactionCount ?? 0,
      bankEntries: dsStats?.bankEntryCount ?? 0,
      personsLinked: dsStats?.linkedTransactions ?? 0,
      personsUnlinked: dsStats?.unlinkedTransactions ?? 0,
      reconciled: {
        matched: reconSummary?.matched ?? 0,
        unmatched: reconSummary?.unmatched ?? 0,
        suspect: reconSummary?.duplicateSuspects ?? 0,
      },
      duration: {
        parse: Math.round(this.timings.parse),
        link: Math.round(this.timings.link),
        reconcile: Math.round(this.timings.reconcile),
        total: Math.round(totalDuration),
      },
    };
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Quick run pipeline on a directory.
 */
export async function runPipeline(
  rawdataDir: string,
  options: Omit<PipelineOptions, 'rawdataDir'> = {}
): Promise<PipelineResult> {
  return new PipelineOrchestrator()
    .configure({ ...options, rawdataDir })
    .run();
}

/**
 * Quick run pipeline on specific files.
 */
export async function runPipelineOnFiles(
  files: SourceFile[],
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  return new PipelineOrchestrator()
    .configure(options)
    .loadFiles(files)
    .run();
}









