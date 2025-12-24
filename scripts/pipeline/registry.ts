/**
 * Source Registry - Auto-Detecção de Formato por Score
 * 
 * Detecta automaticamente qual parser usar para um arquivo baseado em:
 * - Nome do arquivo (patterns)
 * - Conteúdo (headers, estrutura)
 * - Score de confiança de cada parser
 * 
 * @module pipeline/registry
 */

import type { Parser } from './parsers/types';
import type { CanonicalTransaction, CanonicalBankEntry } from '../canonical';

// Import all parsers
import { RawdataParser } from './parsers/rawdata';
import { BBExtratoParser } from './parsers/bb-extrato';
import { CEFExtratoParser } from './parsers/cef-extrato';
import { DoacaoParser } from './parsers/doacao';

// =============================================================================
// TYPES
// =============================================================================

/** Tipos de saída suportados */
export type OutputType = 'transaction' | 'bank_entry';

/** Resultado da detecção */
export interface DetectionResult {
  /** Parser detectado */
  parser: Parser<CanonicalTransaction | CanonicalBankEntry>;
  /** Score de confiança (0-100) */
  score: number;
  /** Tipo de saída */
  outputType: OutputType;
  /** Nome do parser */
  parserName: string;
}

/** Registro de um parser */
interface ParserRegistryEntry {
  parser: Parser<CanonicalTransaction | CanonicalBankEntry>;
  outputType: OutputType;
}

// =============================================================================
// REGISTRY
// =============================================================================

/** Todos os parsers registrados */
const PARSERS: ParserRegistryEntry[] = [
  { parser: RawdataParser, outputType: 'transaction' },
  { parser: BBExtratoParser, outputType: 'bank_entry' },
  { parser: CEFExtratoParser, outputType: 'bank_entry' },
  { parser: DoacaoParser, outputType: 'transaction' },
];

// =============================================================================
// DETECTION
// =============================================================================

/**
 * Detecta o melhor parser para um arquivo.
 * 
 * @param content Conteúdo do arquivo
 * @param filename Nome do arquivo (opcional, melhora detecção)
 * @returns DetectionResult com parser, score e tipo
 */
export function detectParser(content: string, filename?: string): DetectionResult | null {
  let bestMatch: DetectionResult | null = null;
  let bestScore = 0;
  
  for (const entry of PARSERS) {
    const score = entry.parser.detect(content, filename);
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        parser: entry.parser,
        score,
        outputType: entry.outputType,
        parserName: entry.parser.name,
      };
    }
  }
  
  // Minimum threshold
  if (bestMatch && bestScore < 20) {
    return null;
  }
  
  return bestMatch;
}

/**
 * Detecta todos os parsers compatíveis ordenados por score.
 * 
 * @param content Conteúdo do arquivo
 * @param filename Nome do arquivo (opcional)
 * @returns Array de DetectionResult ordenado por score (maior primeiro)
 */
export function detectAllParsers(content: string, filename?: string): DetectionResult[] {
  const results: DetectionResult[] = [];
  
  for (const entry of PARSERS) {
    const score = entry.parser.detect(content, filename);
    
    if (score > 0) {
      results.push({
        parser: entry.parser,
        score,
        outputType: entry.outputType,
        parserName: entry.parser.name,
      });
    }
  }
  
  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  
  return results;
}

// =============================================================================
// PARSING
// =============================================================================

/** Resultado genérico de parsing */
export interface ParsedSource {
  /** Tipo de saída */
  outputType: OutputType;
  /** Parser usado */
  parserName: string;
  /** Score de detecção */
  detectionScore: number;
  /** Transações (se outputType === 'transaction') */
  transactions?: CanonicalTransaction[];
  /** Entradas bancárias (se outputType === 'bank_entry') */
  bankEntries?: CanonicalBankEntry[];
  /** Warnings do parsing */
  warnings: string[];
  /** Contagem de registros com falha */
  failedCount: number;
  /** Confiança do parsing (0-1) */
  confidence: number;
}

/**
 * Parseia um arquivo automaticamente detectando o formato.
 * 
 * @param content Conteúdo do arquivo
 * @param sourceFile Caminho do arquivo (para provenance)
 * @param filename Nome do arquivo (opcional, para detecção)
 * @returns ParsedSource com dados parseados ou null se não detectar formato
 */
export function parseSource(
  content: string,
  sourceFile: string,
  filename?: string
): ParsedSource | null {
  const detection = detectParser(content, filename ?? sourceFile);
  
  if (!detection) {
    return null;
  }
  
  const result = detection.parser.parse(content, sourceFile);
  
  const parsed: ParsedSource = {
    outputType: detection.outputType,
    parserName: detection.parserName,
    detectionScore: detection.score,
    warnings: result.warnings,
    failedCount: result.failedCount,
    confidence: result.confidence,
  };
  
  if (detection.outputType === 'transaction') {
    parsed.transactions = result.records.map(r => r.record as CanonicalTransaction);
  } else {
    parsed.bankEntries = result.records.map(r => r.record as CanonicalBankEntry);
  }
  
  return parsed;
}

// =============================================================================
// BATCH PROCESSING
// =============================================================================

/** Entrada para processamento em lote */
export interface SourceFile {
  content: string;
  filename: string;
  path?: string;
}

/** Resultado do processamento em lote */
export interface BatchResult {
  /** Todas as transações parseadas */
  transactions: CanonicalTransaction[];
  /** Todas as entradas bancárias parseadas */
  bankEntries: CanonicalBankEntry[];
  /** Arquivos processados com sucesso */
  processed: Array<{ filename: string; parserName: string; count: number }>;
  /** Arquivos não reconhecidos */
  unrecognized: string[];
  /** Warnings gerais */
  warnings: string[];
}

/**
 * Processa múltiplos arquivos automaticamente.
 * 
 * @param files Array de arquivos para processar
 * @returns BatchResult com todos os dados consolidados
 */
export function parseSourceBatch(files: SourceFile[]): BatchResult {
  const result: BatchResult = {
    transactions: [],
    bankEntries: [],
    processed: [],
    unrecognized: [],
    warnings: [],
  };
  
  for (const file of files) {
    const sourcePath = file.path ?? file.filename;
    const parsed = parseSource(file.content, sourcePath, file.filename);
    
    if (!parsed) {
      result.unrecognized.push(file.filename);
      continue;
    }
    
    let count = 0;
    
    if (parsed.transactions) {
      result.transactions.push(...parsed.transactions);
      count = parsed.transactions.length;
    }
    
    if (parsed.bankEntries) {
      result.bankEntries.push(...parsed.bankEntries);
      count = parsed.bankEntries.length;
    }
    
    result.processed.push({
      filename: file.filename,
      parserName: parsed.parserName,
      count,
    });
    
    if (parsed.warnings.length > 0) {
      result.warnings.push(`${file.filename}: ${parsed.warnings.join('; ')}`);
    }
  }
  
  // Sort results by date
  result.transactions.sort((a, b) => a.date.localeCompare(b.date));
  result.bankEntries.sort((a, b) => a.dateMovement.localeCompare(b.dateMovement));
  
  return result;
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

/** Lista todos os parsers registrados */
export function listParsers(): Array<{ name: string; version: string; outputType: OutputType }> {
  return PARSERS.map(p => ({
    name: p.parser.name,
    version: p.parser.version,
    outputType: p.outputType,
  }));
}

/** Obtém um parser por nome */
export function getParserByName(name: string): Parser<CanonicalTransaction | CanonicalBankEntry> | null {
  const entry = PARSERS.find(p => p.parser.name === name);
  return entry?.parser ?? null;
}









