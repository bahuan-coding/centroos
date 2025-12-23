/**
 * Doação Parser - Parser Canônico para CSVs Pivotados de Contribuições
 * 
 * Parseia arquivos CSV pivotados (pessoa × mês) e converte para CanonicalTransaction[].
 * Formatos: associados_doacao.csv e nao_associados_doacao.csv
 * 
 * Estrutura pivotada:
 * - Linha 3: Headers (NOME, nº matri, ANO ANTERIOR, JAN, FEV, MAR, ...)
 * - Linha 4: Sub-headers (Data, valor) para cada mês
 * - Linha 5+: Dados (nome, matricula, [data, valor] × 12 meses)
 * 
 * @module pipeline/parsers/doacao
 */

import type { Parser, ParserOptions, LineParseResult } from './types';
import { buildParseResult } from './types';
import type {
  CanonicalTransaction,
  TransactionType,
  TransactionNature,
  ParseResult,
  Money,
} from '../../canonical';
import { createProvenanceBuilder, createProvenance, hashContent, money } from '../../canonical';
import { parsePtBrMoney } from '../normalizers/money';
import { parseDate, toIsoDate } from '../../canonical';

// =============================================================================
// CONSTANTS
// =============================================================================

const PARSER_NAME = 'DoacaoParser';
const PARSER_VERSION = '1.0.0';

/** Meses com índices de coluna (0-indexed, pares Data+Valor) */
const MONTH_COLUMNS: Record<string, number> = {
  'JAN': 4, 'FEV': 6, 'MAR': 8, 'ABR': 10, 'MAI': 12,
  'JUN': 14, 'JUL': 16, 'AGO': 18, 'SET': 20, 'OUT': 22,
  'NOV': 24, 'DEZ': 26,
};

const MONTH_NUMBERS: Record<string, number> = {
  'JAN': 1, 'FEV': 2, 'MAR': 3, 'ABR': 4, 'MAI': 5, 'JUN': 6,
  'JUL': 7, 'AGO': 8, 'SET': 9, 'OUT': 10, 'NOV': 11, 'DEZ': 12,
};

// =============================================================================
// CSV PARSING
// =============================================================================

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  
  return result;
}

// =============================================================================
// DATE PARSING (MULTI-FORMAT)
// =============================================================================

function parseDoacaoDate(raw: string, defaultYear: number, monthHint: number): Date | null {
  if (!raw || raw.trim() === '') return null;
  
  const cleaned = raw.trim();
  
  // Format: d-Mon (e.g., "4-Aug", "25-Sep")
  const abbrevMatch = cleaned.match(/^(\d{1,2})-([A-Za-z]{3})$/);
  if (abbrevMatch) {
    const [, dayStr, monthAbbr] = abbrevMatch;
    const monthMap: Record<string, number> = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11,
    };
    const month = monthMap[monthAbbr];
    if (month !== undefined) {
      return new Date(defaultYear, month, parseInt(dayStr, 10));
    }
  }
  
  // Format: m/d/yyyy or mm/dd/yyyy (US format used in rawdata)
  const usMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, monthStr, dayStr, yearStr] = usMatch;
    return new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, parseInt(dayStr, 10));
  }
  
  // Fallback: use canonical parseDate
  const result = parseDate(cleaned, true, defaultYear);
  return result.date;
}

// =============================================================================
// PERSON TYPE DETECTION
// =============================================================================

type DoacaoType = 'associado' | 'nao_associado';

function detectDoacaoType(content: string, filename?: string): DoacaoType {
  if (filename) {
    if (/nao.?associado/i.test(filename)) return 'nao_associado';
    if (/associado/i.test(filename)) return 'associado';
  }
  
  if (/CONTRIBUIÇÃO DOS NÃO ASSOCIADOS/i.test(content)) return 'nao_associado';
  if (/CONTRIBUIÇÃO DOS ASSOCIADOS/i.test(content)) return 'associado';
  
  return 'associado';
}

// =============================================================================
// LINE PARSER
// =============================================================================

interface DoacaoEntry {
  personName: string;
  matricula: string;
  date: Date;
  month: string;
  amount: Money;
}

function parsePersonRow(
  cols: string[],
  lineNumber: number,
  defaultYear: number
): DoacaoEntry[] {
  const entries: DoacaoEntry[] = [];
  
  const personName = cols[0]?.trim();
  if (!personName || /^(totais?|nome)$/i.test(personName)) return entries;
  
  const matricula = cols[1]?.trim() || '';
  
  // Iterate through month columns
  for (const [monthName, colIdx] of Object.entries(MONTH_COLUMNS)) {
    const dateCol = cols[colIdx];
    const valorCol = cols[colIdx + 1];
    
    if (!dateCol || !valorCol) continue;
    
    const dateClean = dateCol.trim();
    const valorClean = valorCol.trim();
    
    if (!dateClean || !valorClean) continue;
    
    // Parse date
    const monthNum = MONTH_NUMBERS[monthName];
    const date = parseDoacaoDate(dateClean, defaultYear, monthNum);
    if (!date) continue;
    
    // Parse valor
    const moneyResult = parsePtBrMoney(valorClean);
    if (!moneyResult.valid || !moneyResult.money || moneyResult.money.cents === 0) continue;
    
    entries.push({
      personName,
      matricula,
      date,
      month: monthName,
      amount: money(Math.abs(moneyResult.money.cents)),
    });
  }
  
  return entries;
}

function entriesToTransactions(
  entries: DoacaoEntry[],
  lineNumber: number,
  rawLine: string,
  doacaoType: DoacaoType,
  provenanceBuilder: ReturnType<typeof createProvenanceBuilder>
): LineParseResult<CanonicalTransaction>[] {
  const results: LineParseResult<CanonicalTransaction>[] = [];
  
  for (const entry of entries) {
    const type: TransactionType = 'receita';
    const nature: TransactionNature = doacaoType === 'associado' ? 'contribuicao' : 'doacao';
    
    const id = `doacao-${hashContent(`${lineNumber}:${entry.personName}:${entry.month}:${entry.amount.cents}`).slice(0, 12)}`;
    
    const provenance = createProvenance(
      provenanceBuilder,
      `${entry.personName}|${entry.month}|${entry.amount.cents}`,
      lineNumber
    );
    
    const transaction: CanonicalTransaction = {
      id,
      date: toIsoDate(entry.date),
      amount: entry.amount,
      type,
      nature,
      description: `Contribuição ${entry.month}/${entry.date.getFullYear()}`,
      personName: entry.personName,
      provenance,
    };
    
    results.push({
      record: transaction,
      lineNumber,
      rawLine,
      warnings: [],
      success: true,
    });
  }
  
  return results;
}

// =============================================================================
// EXPORTED PARSER
// =============================================================================

/**
 * Parser Canônico para CSVs pivotados de contribuições/doações.
 * Converte para CanonicalTransaction[] com provenance completo.
 */
export const DoacaoParser: Parser<CanonicalTransaction> = {
  name: PARSER_NAME,
  version: PARSER_VERSION,
  
  detect(content: string, filename?: string): number {
    let score = 0;
    
    // Check filename
    if (filename) {
      if (/doacao/i.test(filename)) score += 30;
      if (/associado/i.test(filename)) score += 25;
      if (/contribu/i.test(filename)) score += 20;
      if (/\.csv$/i.test(filename)) score += 10;
    }
    
    // Check content patterns
    if (/CONTRIBUIÇÃO DOS (NÃO )?ASSOCIADOS/i.test(content)) score += 40;
    if (/nº\s*matri/i.test(content)) score += 20;
    if (/JAN.*FEV.*MAR.*ABR.*MAI.*JUN/i.test(content)) score += 25;
    if (/Data.*valor.*Data.*valor/i.test(content)) score += 20;
    
    return Math.min(100, score);
  },
  
  parse(content: string, sourceFile: string, options: ParserOptions = {}): ParseResult<CanonicalTransaction> {
    const provenanceBuilder = createProvenanceBuilder(sourceFile, PARSER_NAME, PARSER_VERSION);
    const lines = content.trim().split('\n');
    const results: LineParseResult<CanonicalTransaction>[] = [];
    
    const doacaoType = detectDoacaoType(content, sourceFile);
    const defaultYear = options.defaultYear ?? 2025;
    
    // Skip header rows (first 4 lines typically)
    let startIdx = 0;
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      if (/^[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][A-ZÁÉÍÓÚÀÂÊÔÃÕÇa-záéíóúàâêôãõç\s]+,\d*,/.test(lines[i])) {
        startIdx = i;
        break;
      }
    }
    
    // If no data line found, try after "Data, valor" header
    if (startIdx === 0) {
      for (let i = 0; i < Math.min(10, lines.length); i++) {
        if (/Data.*valor.*Data.*valor/i.test(lines[i])) {
          startIdx = i + 1;
          break;
        }
      }
    }
    
    const maxLines = options.maxLines ?? lines.length;
    
    for (let i = startIdx; i < Math.min(lines.length, startIdx + maxLines); i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      // Skip totals line
      if (/^totais?,/i.test(line)) continue;
      
      // Skip empty name lines
      const cols = parseCSVLine(line);
      if (!cols[0]?.trim()) continue;
      
      const entries = parsePersonRow(cols, i + 1, defaultYear);
      if (entries.length > 0) {
        const txResults = entriesToTransactions(entries, i + 1, line, doacaoType, provenanceBuilder);
        results.push(...txResults);
      }
    }
    
    // Build file-level provenance
    const fileProvenance = createProvenance(provenanceBuilder, content.slice(0, 500), 1);
    fileProvenance.rawHash = hashContent(content);
    
    return buildParseResult(results, fileProvenance);
  },
};

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Parseia um CSV de doações e retorna apenas as transações.
 */
export function parseDoacoes(content: string, sourceFile: string): CanonicalTransaction[] {
  const result = DoacaoParser.parse(content, sourceFile);
  return result.records.map(r => r.record);
}

/**
 * Parseia múltiplos arquivos de doação de uma vez.
 */
export function parseDoacaoFiles(
  files: Array<{ content: string; filename: string }>
): CanonicalTransaction[] {
  const all: CanonicalTransaction[] = [];
  
  for (const file of files) {
    const txs = parseDoacoes(file.content, file.filename);
    all.push(...txs);
  }
  
  // Sort by date
  all.sort((a, b) => a.date.localeCompare(b.date));
  
  return all;
}


