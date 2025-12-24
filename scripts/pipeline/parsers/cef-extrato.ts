/**
 * CEF Extrato Parser - Parser Canônico para Extratos CSV da Caixa Econômica Federal
 * 
 * Parseia arquivos CSV de extrato da CAIXA e converte para CanonicalBankEntry[].
 * Formato CSV com colunas: data_hora, nr_doc, historico, favorecido, cpf_cnpj_mascarado, valor, deb_cred, saldo, saldo_dc
 * 
 * @module pipeline/parsers/cef-extrato
 */

import type { Parser, ParserOptions, LineParseResult } from './types';
import { buildParseResult } from './types';
import type {
  CanonicalBankEntry,
  EntryDirection,
  ParseResult,
  Money,
} from '../../canonical';
import { createProvenanceBuilder, createProvenance, hashContent, money } from '../../canonical';
import { parsePtBrMoney } from '../normalizers/money';
import { toIsoDate } from '../normalizers/date';

// =============================================================================
// CONSTANTS
// =============================================================================

const PARSER_NAME = 'CEFExtratoParser';
const PARSER_VERSION = '1.0.0';

/** Headers esperados no CSV */
const EXPECTED_HEADERS = ['data_hora', 'nr_doc', 'historico', 'favorecido', 'cpf_cnpj_mascarado', 'valor', 'deb_cred'];

/** Patterns para ignorar (saldo do dia) */
const SKIP_PATTERNS = /^saldo\s*dia$/i;

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
// DATE PARSING
// =============================================================================

function parseCEFDateTime(raw: string): Date | null {
  // Format: dd/mm/yyyy HH:MM:SS
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  
  const [, day, month, year, hour, min, sec] = match;
  return new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10),
    parseInt(hour, 10),
    parseInt(min, 10),
    parseInt(sec, 10)
  );
}

// =============================================================================
// DOCUMENT PARSING
// =============================================================================

function extractMaskedDocument(masked: string): string | null {
  if (!masked || masked.trim() === '') return null;
  
  // Extract digits from masked format like **091.781/0*** or ***.898.414***
  const digits = masked.replace(/[^0-9]/g, '');
  return digits.length >= 6 ? digits : null;
}

// =============================================================================
// LINE PARSER
// =============================================================================

function parseLineToCEF(
  cols: string[],
  lineNumber: number,
  rawLine: string,
  provenanceBuilder: ReturnType<typeof createProvenanceBuilder>
): LineParseResult<CanonicalBankEntry> {
  const warnings: string[] = [];
  
  // Expected columns: data_hora, nr_doc, historico, favorecido, cpf_cnpj_mascarado, valor, deb_cred, saldo, saldo_dc
  const [dataHora, nrDoc, historico, favorecido, cpfCnpjMascarado, valorRaw, debCred] = cols;
  
  // Skip saldo lines
  if (SKIP_PATTERNS.test(historico || '')) {
    return {
      record: null,
      lineNumber,
      rawLine,
      warnings,
      success: false,
      error: 'Linha de saldo',
    };
  }
  
  // Parse date
  const date = parseCEFDateTime(dataHora);
  if (!date) {
    return {
      record: null,
      lineNumber,
      rawLine,
      warnings,
      success: false,
      error: `Data inválida: ${dataHora}`,
    };
  }
  
  // Parse valor
  const moneyResult = parsePtBrMoney(valorRaw);
  if (!moneyResult.valid || !moneyResult.money || moneyResult.money.cents === 0) {
    return {
      record: null,
      lineNumber,
      rawLine,
      warnings,
      success: false,
      error: `Valor inválido ou zero: ${valorRaw}`,
    };
  }
  
  const direction: EntryDirection = debCred?.toUpperCase() === 'D' ? 'debit' : 'credit';
  const amount: Money = money(Math.abs(moneyResult.money.cents));
  
  // Extract counterparty info
  const counterpartyName = favorecido?.trim() || undefined;
  const counterpartyDocument = extractMaskedDocument(cpfCnpjMascarado) || undefined;
  
  // Generate ID
  const id = `cef-${hashContent(`${lineNumber}:${rawLine}`).slice(0, 12)}`;
  
  // Create provenance
  const provenance = createProvenance(provenanceBuilder, rawLine, lineNumber, warnings);
  
  const entry: CanonicalBankEntry = {
    id,
    bank: 'caixa',
    dateMovement: toIsoDate(date),
    amount,
    direction,
    description: historico || '',
    documentNumber: nrDoc || undefined,
    counterpartyName,
    counterpartyDocument,
    provenance,
  };
  
  return {
    record: entry,
    lineNumber,
    rawLine,
    warnings,
    success: true,
  };
}

// =============================================================================
// EXPORTED PARSER
// =============================================================================

/**
 * Parser Canônico para extratos CSV da Caixa Econômica Federal.
 * Converte para CanonicalBankEntry[] com provenance completo.
 */
export const CEFExtratoParser: Parser<CanonicalBankEntry> = {
  name: PARSER_NAME,
  version: PARSER_VERSION,
  
  detect(content: string, filename?: string): number {
    let score = 0;
    
    // Check filename
    if (filename) {
      if (/caixa/i.test(filename)) score += 30;
      if (/cef/i.test(filename)) score += 25;
      if (/extrato/i.test(filename)) score += 15;
      if (/\.csv$/i.test(filename)) score += 10;
    }
    
    const lines = content.split('\n');
    const firstLine = lines[0]?.toLowerCase() || '';
    
    // Check for expected headers
    if (firstLine.includes('data_hora') && firstLine.includes('deb_cred')) score += 40;
    if (firstLine.includes('cpf_cnpj_mascarado')) score += 20;
    if (firstLine.includes('favorecido')) score += 15;
    
    // Check for CEF-specific patterns
    if (lines.some(l => /SALDO\s*DIA/i.test(l))) score += 15;
    if (lines.some(l => /DEB\s*PIX\s*CHAVE/i.test(l))) score += 15;
    if (lines.some(l => /TAR\s*PIX/i.test(l))) score += 10;
    if (lines.some(l => /PREMIACAO.*Sefaz/i.test(l))) score += 15;
    
    return Math.min(100, score);
  },
  
  parse(content: string, sourceFile: string, options: ParserOptions = {}): ParseResult<CanonicalBankEntry> {
    const provenanceBuilder = createProvenanceBuilder(sourceFile, PARSER_NAME, PARSER_VERSION);
    const lines = content.trim().split('\n');
    const results: LineParseResult<CanonicalBankEntry>[] = [];
    
    // Skip header line
    const startIdx = lines[0]?.includes('data_hora') ? 1 : 0;
    const maxLines = options.maxLines ?? lines.length;
    
    for (let i = startIdx; i < Math.min(lines.length, startIdx + maxLines); i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const cols = parseCSVLine(line);
      const result = parseLineToCEF(cols, i + 1, line, provenanceBuilder);
      results.push(result);
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
 * Parseia um extrato CEF e retorna apenas as entradas.
 */
export function parseCEFExtrato(content: string, sourceFile: string): CanonicalBankEntry[] {
  const result = CEFExtratoParser.parse(content, sourceFile);
  return result.records.map(r => r.record);
}









