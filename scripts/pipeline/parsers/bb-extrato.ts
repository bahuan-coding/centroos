/**
 * BB Extrato Parser - Parser Canônico para Extratos TXT do Banco do Brasil
 * 
 * Parseia arquivos TXT de extrato do BB e converte para CanonicalBankEntry[].
 * Formato multi-linha: data, agencia, lote, historico, documento, valor, detalhe.
 * 
 * @module pipeline/parsers/bb-extrato
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
import { parseBankDate, toIsoDate } from '../normalizers/date';

// =============================================================================
// CONSTANTS
// =============================================================================

const PARSER_NAME = 'BBExtratoParser';
const PARSER_VERSION = '1.0.0';

/** Patterns para ignorar (saldo, transferências internas) */
const SKIP_PATTERNS = [
  /saldo\s*anterior/i,
  /^000\s*saldo/i,
  /999\s*s\s*a\s*l\s*d\s*o/i,
  /^351\s*bb\s*rende\s*f[áa]cil/i,
  /^798\s*bb\s*rende\s*f[áa]cil/i,
  /^rende\s*facil$/i,
];

/** Regex para data no formato dd/mm/yyyy */
const DATE_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/** Regex para valor com direção (150,00 C ou 211,85 D) */
const VALOR_REGEX = /([\d.,]+)\s*([CD])$/i;

/** Regex para linha de detalhe (01/11 14:16 00034832610449 EDNA S TENO) */
const DETALHE_REGEX = /^(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})\s+(\d+)\s+(.+)$/;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function shouldSkipHistorico(historico: string): boolean {
  return SKIP_PATTERNS.some(p => p.test(historico));
}

function extractCounterpartyInfo(detalheLine: string): {
  dateTime: string | null;
  document: string | null;
  name: string | null;
} {
  const match = detalheLine.match(DETALHE_REGEX);
  if (!match) {
    return { dateTime: null, document: null, name: null };
  }
  
  const [, day, month, hour, min, doc, name] = match;
  return {
    dateTime: `${day}/${month} ${hour}:${min}`,
    document: doc.length >= 11 ? doc : null,
    name: name.trim() || null,
  };
}

function parseMovementDate(
  detalheLine: string,
  balanceteYear: number
): Date | null {
  const match = detalheLine.match(/^(\d{2})\/(\d{2})/);
  if (!match) return null;
  
  const [, day, month] = match;
  return new Date(balanceteYear, parseInt(month, 10) - 1, parseInt(day, 10));
}

// =============================================================================
// BLOCK PARSER
// =============================================================================

interface BBBlock {
  lineStart: number;
  dataBalancete: Date;
  agOrigem: string;
  lote: string;
  historico: string;
  documento: string;
  valorRaw: string;
  detalheLine: string;
}

function parseBlock(
  lines: string[],
  startIdx: number
): { block: BBBlock | null; nextIdx: number } {
  const line = lines[startIdx]?.trim();
  if (!line) return { block: null, nextIdx: startIdx + 1 };
  
  const dateMatch = line.match(DATE_REGEX);
  if (!dateMatch) return { block: null, nextIdx: startIdx + 1 };
  
  const [, day, month, year] = dateMatch;
  const dataBalancete = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  
  let i = startIdx + 1;
  const agOrigem = lines[i]?.trim() || '';
  i++;
  const lote = lines[i]?.trim() || '';
  i++;
  const historico = lines[i]?.trim() || '';
  i++;
  const documento = lines[i]?.trim() || '';
  i++;
  const valorRaw = lines[i]?.trim() || '';
  i++;
  
  // Check for optional detail line
  let detalheLine = '';
  if (i < lines.length && /^\d{2}\/\d{2}\s+\d{2}:\d{2}/.test(lines[i])) {
    detalheLine = lines[i].trim();
    i++;
  }
  
  return {
    block: {
      lineStart: startIdx + 1, // 1-indexed
      dataBalancete,
      agOrigem,
      lote,
      historico,
      documento,
      valorRaw,
      detalheLine,
    },
    nextIdx: i,
  };
}

// =============================================================================
// MAIN PARSER
// =============================================================================

function parseBlockToEntry(
  block: BBBlock,
  rawLines: string[],
  provenanceBuilder: ReturnType<typeof createProvenanceBuilder>
): LineParseResult<CanonicalBankEntry> {
  const warnings: string[] = [];
  const rawContent = rawLines.slice(block.lineStart - 1, block.lineStart + 6).join('\n');
  
  // Skip saldo/rende facil
  if (shouldSkipHistorico(block.historico)) {
    return {
      record: null,
      lineNumber: block.lineStart,
      rawLine: rawContent,
      warnings,
      success: false,
      error: 'Linha de saldo/transferencia interna',
    };
  }
  
  // Parse valor
  const valorMatch = block.valorRaw.match(VALOR_REGEX);
  if (!valorMatch) {
    return {
      record: null,
      lineNumber: block.lineStart,
      rawLine: rawContent,
      warnings,
      success: false,
      error: `Valor inválido: ${block.valorRaw}`,
    };
  }
  
  const [, valorStr, direcaoChar] = valorMatch;
  const moneyResult = parsePtBrMoney(valorStr);
  
  if (!moneyResult.valid || !moneyResult.money) {
    return {
      record: null,
      lineNumber: block.lineStart,
      rawLine: rawContent,
      warnings,
      success: false,
      error: `Falha ao parsear valor: ${valorStr}`,
    };
  }
  
  const direction: EntryDirection = direcaoChar.toUpperCase() === 'D' ? 'debit' : 'credit';
  const amount: Money = money(Math.abs(moneyResult.money.cents));
  
  // Parse dates
  const balanceteYear = block.dataBalancete.getFullYear();
  const dateBalance = toIsoDate(block.dataBalancete);
  
  let dateMovement = dateBalance;
  if (block.detalheLine) {
    const movDate = parseMovementDate(block.detalheLine, balanceteYear);
    if (movDate) {
      dateMovement = toIsoDate(movDate);
    }
  }
  
  // Extract counterparty
  const counterparty = extractCounterpartyInfo(block.detalheLine);
  
  // Generate ID
  const id = `bb-${hashContent(`${block.lineStart}:${rawContent}`).slice(0, 12)}`;
  
  // Create provenance
  const provenance = createProvenance(provenanceBuilder, rawContent, block.lineStart, warnings);
  
  const entry: CanonicalBankEntry = {
    id,
    bank: 'bb',
    dateMovement,
    dateBalance,
    amount,
    direction,
    description: block.historico,
    documentNumber: block.documento || undefined,
    counterpartyName: counterparty.name || undefined,
    counterpartyDocument: counterparty.document || undefined,
    provenance,
  };
  
  return {
    record: entry,
    lineNumber: block.lineStart,
    rawLine: rawContent,
    warnings,
    success: true,
  };
}

// =============================================================================
// EXPORTED PARSER
// =============================================================================

/**
 * Parser Canônico para extratos TXT do Banco do Brasil.
 * Converte para CanonicalBankEntry[] com provenance completo.
 */
export const BBExtratoParser: Parser<CanonicalBankEntry> = {
  name: PARSER_NAME,
  version: PARSER_VERSION,
  
  detect(content: string, filename?: string): number {
    let score = 0;
    
    // Check filename
    if (filename) {
      if (/banco.?do.?brasil/i.test(filename)) score += 30;
      if (/bb.*extrato/i.test(filename)) score += 30;
      if (/\.txt$/i.test(filename)) score += 10;
    }
    
    // Check content patterns
    const lines = content.split('\n');
    
    // Look for BB-specific patterns
    if (lines.some(l => /821\s*Pix\s*-\s*Recebido/i.test(l))) score += 25;
    if (lines.some(l => /144\s*Pix\s*-\s*Enviado/i.test(l))) score += 20;
    if (lines.some(l => /BB\s*Rende\s*F[áa]cil/i.test(l))) score += 20;
    if (lines.some(l => /Tarifa\s*Pix/i.test(l))) score += 15;
    if (lines.some(l => /Ag[êe]ncia.*Conta\s*corrente/i.test(l))) score += 15;
    
    // Check for multi-line date pattern
    const hasDateLines = lines.filter(l => DATE_REGEX.test(l.trim())).length;
    if (hasDateLines >= 5) score += 20;
    
    return Math.min(100, score);
  },
  
  parse(content: string, sourceFile: string, options: ParserOptions = {}): ParseResult<CanonicalBankEntry> {
    const provenanceBuilder = createProvenanceBuilder(sourceFile, PARSER_NAME, PARSER_VERSION);
    const lines = content.split('\n');
    const results: LineParseResult<CanonicalBankEntry>[] = [];
    
    let i = 0;
    const maxLines = options.maxLines ?? lines.length;
    
    while (i < lines.length && results.length < maxLines) {
      const { block, nextIdx } = parseBlock(lines, i);
      
      if (block) {
        const result = parseBlockToEntry(block, lines, provenanceBuilder);
        results.push(result);
      }
      
      i = nextIdx;
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
 * Parseia um extrato BB e retorna apenas as entradas.
 */
export function parseBBExtrato(content: string, sourceFile: string): CanonicalBankEntry[] {
  const result = BBExtratoParser.parse(content, sourceFile);
  return result.records.map(r => r.record);
}







