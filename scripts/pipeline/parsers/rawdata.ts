/**
 * Rawdata Parser - Parser Canônico Ultra-Inteligente para CSVs Mensais
 * 
 * Parseia os arquivos rawdata_*.csv e converte para CanonicalTransaction[].
 * Usa Column Inference Engine para auto-corrigir colunas deslocadas.
 * 
 * Formato esperado:
 * - Linhas 1-4: Headers/metadata
 * - Linha 5: Saldo anterior
 * - Linha 6+: Transações
 * 
 * Colunas: Data, Dcto, CNPJ, Fornecedor/Contribuição, Descrição, CAIXA, B.BRASIL, BB R.Fácil, C.ECONÔMICA
 * 
 * @module pipeline/parsers/rawdata
 */

import type { Parser, ParserOptions, LineParseResult } from './types';
import { buildParseResult } from './types';
import type {
  CanonicalTransaction,
  TransactionType,
  TransactionNature,
  AccountRef,
  ParseResult,
  Money,
} from '../../canonical';
import { createProvenanceBuilder, createProvenance, hashContent, money } from '../../canonical';
import { parsePtBrMoney } from '../normalizers/money';
import { parseRawdataDate, toIsoDate } from '../normalizers/date';
import { parseCNPJ, parseCPF } from '../normalizers/document';
import { inferRow, shouldSkipLine, inferFieldType } from './column-inference';

// =============================================================================
// CONSTANTS
// =============================================================================

const PARSER_NAME = 'RawdataParser';
const PARSER_VERSION = '2.0.0';  // Upgraded with Column Inference

/** Palavras que indicam saldo/totais (ignorar) */
const SKIP_PATTERNS = /^(saldo|total|subtotal)/i;

// =============================================================================
// CSV PARSING UTILITIES
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
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result;
}

// =============================================================================
// TRANSACTION CLASSIFICATION (ENHANCED)
// =============================================================================

interface ClassificationResult {
  type: TransactionType;
  nature: TransactionNature;
}

function classifyTransaction(descricao: string, fornecedor: string): ClassificationResult {
  const desc = descricao.toLowerCase();
  const fornec = fornecedor.toLowerCase();
  const combined = `${desc} ${fornec}`;
  
  // Contribuições de associados (várias variações)
  if (/contribui[çc][ãa]o\s*(de\s*)?(associado|assoc)/i.test(combined)) {
    return { type: 'receita', nature: 'contribuicao' };
  }
  
  // Contribuições de não-associados
  if (/contribui[çc][ãa]o\s*(de\s*)?(n[ãa]o|nao)\s*associado/i.test(combined)) {
    return { type: 'receita', nature: 'doacao' };
  }
  
  // Transferências internas BB Rende Fácil
  if (/bb\s*rend[ae]?\s*f[áa]cil|renda\s*f[áa]cil/i.test(combined)) {
    return { type: 'transferencia', nature: 'outros' };
  }
  
  // Rendimentos
  if (/rendimento|aplica[çc][ãa]o/i.test(combined)) {
    return { type: 'receita', nature: 'rendimento' };
  }
  
  // Premiação SEFAZ
  if (/premia[çc][ãa]o|sefaz/i.test(combined)) {
    return { type: 'receita', nature: 'premiacao' };
  }
  
  // Tarifas bancárias
  if (/tarifa|cesta\s*servi[çc]o/i.test(combined)) {
    return { type: 'despesa', nature: 'tarifa' };
  }
  
  // Impostos
  if (/imposto|ir\s*fonte|iss\s|inss/i.test(combined)) {
    return { type: 'despesa', nature: 'imposto' };
  }
  
  // Utilidades (energia, água, internet, telefone)
  if (/energia|equatorial|eletric/i.test(combined)) {
    return { type: 'despesa', nature: 'utilidade' };
  }
  if (/internet|telefone|telecom|claro|vivo|tim|oi\s/i.test(combined)) {
    return { type: 'despesa', nature: 'utilidade' };
  }
  if (/[áa]gua|esgoto|brk|saneamento|casal/i.test(combined)) {
    return { type: 'despesa', nature: 'utilidade' };
  }
  if (/g[áa]s|botij[ãa]o|glp/i.test(combined)) {
    return { type: 'despesa', nature: 'utilidade' };
  }
  
  // Materiais e aquisições
  if (/limpeza|material|aquisi[çc][ãa]o|compra/i.test(combined)) {
    return { type: 'despesa', nature: 'material' };
  }
  
  // Serviços
  if (/servi[çc]o|prestado|eletricista|pedreiro|pintor/i.test(combined)) {
    return { type: 'despesa', nature: 'servico' };
  }
  
  // Taxas institucionais (federação, conselho)
  if (/mensalidade|federa[çc][ãa]o|conselho|filiacao/i.test(combined)) {
    return { type: 'despesa', nature: 'taxa' };
  }
  
  // Gasolina/combustível
  if (/gasolina|combust[íi]vel|etanol|posto/i.test(combined)) {
    return { type: 'despesa', nature: 'material' };
  }
  
  // Pães/alimentação
  if (/p[ãa]es|padaria|aliment/i.test(combined)) {
    return { type: 'despesa', nature: 'material' };
  }
  
  // Devolução/estorno (verifica contexto para tipo)
  if (/devolu[çc][ãa]o|estorno|retorno/i.test(combined)) {
    return { type: 'despesa', nature: 'outros' };
  }
  
  // Crédito indevido
  if (/cr[ée]dito\s*indevido/i.test(combined)) {
    return { type: 'receita', nature: 'outros' };
  }
  
  // Default: despesa outros
  return { type: 'despesa', nature: 'outros' };
}

// =============================================================================
// ACCOUNT DETECTION (ENHANCED WITH INFERENCE)
// =============================================================================

interface AccountAmount {
  account: AccountRef;
  amount: Money;
}

function detectAccountAndAmount(cols: string[], inferredRow?: ReturnType<typeof inferRow>): AccountAmount | null {
  // Cols 5-8: CAIXA, B.BRASIL, BB R.Fácil, C.ECONÔMICA (posições ideais)
  const accounts: { col: number; ref: AccountRef }[] = [
    { col: 5, ref: 'caixa' },
    { col: 6, ref: 'bb' },
    { col: 7, ref: 'bbrf' },
    { col: 8, ref: 'cef' },
  ];
  
  // Tenta com colunas inferidas primeiro
  if (inferredRow) {
    const inferredAccounts = [
      { field: inferredRow.valorCaixa, ref: 'caixa' as AccountRef },
      { field: inferredRow.valorBB, ref: 'bb' as AccountRef },
      { field: inferredRow.valorBBRF, ref: 'bbrf' as AccountRef },
      { field: inferredRow.valorCEF, ref: 'cef' as AccountRef },
    ];
    
    for (const { field, ref } of inferredAccounts) {
      if (field && field.value) {
        const parsed = parsePtBrMoney(field.value);
        if (parsed.valid && parsed.money && parsed.money.cents !== 0) {
          return { account: ref, amount: parsed.money };
        }
      }
    }
  }
  
  // Fallback: tenta colunas diretas
  for (const { col, ref } of accounts) {
    const raw = cols[col];
    if (!raw || raw.trim() === '') continue;
    
    const parsed = parsePtBrMoney(raw);
    if (parsed.valid && parsed.money && parsed.money.cents !== 0) {
      return { account: ref, amount: parsed.money };
    }
  }
  
  // ULTRA FALLBACK: procura valor monetário em QUALQUER coluna >= 5
  // Isso captura linhas com colunas deslocadas
  for (let i = 5; i < cols.length; i++) {
    const raw = cols[i];
    if (!raw || raw.trim() === '') continue;
    
    const parsed = parsePtBrMoney(raw);
    if (parsed.valid && parsed.money && parsed.money.cents !== 0) {
      // Infere conta baseado na posição relativa
      // Se há muitas colunas vazias antes, provavelmente é CEF (última conta)
      const nonEmptyAfter5 = cols.slice(5).filter(c => c.trim()).length;
      let ref: AccountRef = 'cef';  // Default to CEF for late columns
      
      if (i === 5 || (i === 6 && nonEmptyAfter5 === 1)) ref = 'caixa';
      else if (i === 6) ref = 'bb';
      else if (i === 7) ref = 'bbrf';
      else ref = 'cef';
      
      return { account: ref, amount: parsed.money };
    }
  }
  
  return null;
}

// =============================================================================
// DOCUMENT PARSING (CPF OR CNPJ)
// =============================================================================

function parseDocument(raw: string): { digits: string; type: 'cpf' | 'cnpj' | 'unknown'; valid: boolean } {
  if (!raw || !/\d/.test(raw)) {
    return { digits: '', type: 'unknown', valid: false };
  }
  
  const digits = raw.replace(/\D/g, '');
  
  // CNPJ: 14 dígitos
  if (digits.length === 14) {
    const result = parseCNPJ(raw);
    return { digits: result.document.digits, type: 'cnpj', valid: result.document.valid };
  }
  
  // CPF: 11 dígitos
  if (digits.length === 11) {
    const result = parseCPF(raw);
    return { digits: result.document.digits, type: 'cpf', valid: result.document.valid };
  }
  
  // Parcial (8+ dígitos)
  if (digits.length >= 8) {
    return { digits, type: digits.length > 11 ? 'cnpj' : 'cpf', valid: false };
  }
  
  return { digits, type: 'unknown', valid: false };
}

// =============================================================================
// SMART LINE PARSER
// =============================================================================

function parseLineSmart(
  cols: string[],
  lineNumber: number,
  rawLine: string,
  options: ParserOptions,
  provenanceBuilder: ReturnType<typeof createProvenanceBuilder>
): LineParseResult<CanonicalTransaction> {
  const warnings: string[] = [];
  
  // Skip lines that should be ignored
  if (shouldSkipLine(cols)) {
    return {
      record: null,
      lineNumber,
      rawLine,
      warnings,
      success: false,
      error: 'Linha de saldo/total/header',
    };
  }
  
  // Use column inference to realign if needed
  const inferred = inferRow(cols);
  
  if (inferred.wasRealigned) {
    warnings.push(...inferred.warnings);
  }
  
  // Extract date
  const dataStr = inferred.data?.value || cols[0];
  if (!dataStr) {
    return {
      record: null,
      lineNumber,
      rawLine,
      warnings,
      success: false,
      error: 'Linha sem data',
    };
  }
  
  // Check for skip patterns
  if (SKIP_PATTERNS.test(dataStr)) {
    return {
      record: null,
      lineNumber,
      rawLine,
      warnings,
      success: false,
      error: 'Linha de saldo/total',
    };
  }
  
  const dateResult = parseRawdataDate(dataStr, options.defaultYear);
  if (!dateResult.date) {
    return {
      record: null,
      lineNumber,
      rawLine,
      warnings,
      success: false,
      error: `Data inválida: ${dataStr}`,
    };
  }
  
  if (dateResult.warning) {
    warnings.push(dateResult.warning);
  }
  
  // Detect account and amount using inference
  const accountAmount = detectAccountAndAmount(cols, inferred);
  if (!accountAmount) {
    // Tenta encontrar qualquer valor monetário na linha
    for (let i = 0; i < cols.length; i++) {
      const { type } = inferFieldType(cols[i]);
      if (type === 'money') {
        const parsed = parsePtBrMoney(cols[i]);
        if (parsed.valid && parsed.money && parsed.money.cents !== 0) {
          // Infere conta baseado na posição
          const accountRef: AccountRef = i >= 8 ? 'cef' : i >= 7 ? 'bbrf' : i >= 6 ? 'bb' : 'caixa';
          warnings.push(`Valor encontrado na coluna ${i}, inferido como ${accountRef}`);
          // Continue with this value
          const altResult = parseLineSmart(
            [...cols.slice(0, 5), ...Array(4).fill('').map((_, idx) => idx + 5 === i ? cols[i] : '')],
            lineNumber,
            rawLine,
            options,
            provenanceBuilder
          );
          if (altResult.success) {
            altResult.warnings.push(...warnings);
            return altResult;
          }
        }
      }
    }
    
    return {
      record: null,
      lineNumber,
      rawLine,
      warnings,
      success: false,
      error: 'Nenhum valor encontrado nas colunas de conta',
    };
  }
  
  // Extract fields using inference or fallback
  const documento = inferred.documento?.value || cols[1] || '';
  const cnpjCpfRaw = inferred.cnpjCpf?.value || cols[2] || '';
  const fornecedor = inferred.fornecedor?.value || cols[3] || '';
  const descricao = inferred.descricao?.value || cols[4] || '';
  
  // Parse document (CPF or CNPJ)
  let counterpartyCnpj: string | undefined;
  if (cnpjCpfRaw) {
    const docResult = parseDocument(cnpjCpfRaw);
    if (docResult.digits.length >= 8) {
      counterpartyCnpj = docResult.digits;
      if (!docResult.valid) {
        warnings.push(`${docResult.type.toUpperCase()} parcial/inválido: ${cnpjCpfRaw}`);
      }
    }
  }
  
  // Classify transaction
  const classification = classifyTransaction(descricao, fornecedor);
  
  // Determine type based on value sign
  const isNegative = accountAmount.amount.cents < 0;
  let finalType = classification.type;
  
  // Override type if value sign contradicts
  if (finalType === 'receita' && isNegative) {
    warnings.push('Receita com valor negativo - reclassificando como despesa');
    finalType = 'despesa';
  }
  
  // Create provenance for this line
  const provenance = createProvenance(provenanceBuilder, rawLine, lineNumber, warnings);
  
  // Generate unique ID
  const id = `raw-${hashContent(`${lineNumber}:${rawLine}`).slice(0, 12)}`;
  
  const transaction: CanonicalTransaction = {
    id,
    date: toIsoDate(dateResult.date),
    amount: money(Math.abs(accountAmount.amount.cents)),
    type: finalType,
    nature: classification.nature,
    description: descricao || fornecedor || 'Sem descrição',
    personName: fornecedor || undefined,
    accountRef: accountAmount.account,
    documentNumber: documento || undefined,
    counterpartyCnpj,
    provenance,
  };
  
  return {
    record: transaction,
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
 * Parser Ultra-Inteligente para arquivos rawdata CSV mensais.
 * Converte para CanonicalTransaction[] com auto-correção de colunas.
 */
export const RawdataParser: Parser<CanonicalTransaction> = {
  name: PARSER_NAME,
  version: PARSER_VERSION,
  
  detect(content: string, filename?: string): number {
    let score = 0;
    
    // Check filename pattern
    if (filename) {
      if (/rawdata[_-]?\w*\.csv$/i.test(filename)) {
        score += 40;
      }
    }
    
    // Check for expected header structure
    const lines = content.split('\n');
    
    // Look for DISPONIBILIDADE header
    if (lines.some(l => l.includes('DISPONIBILIDADE'))) {
      score += 20;
    }
    
    // Look for column headers
    if (lines.some(l => /Data.*Dcto.*CNPJ.*Fornecedor.*Descri/i.test(l))) {
      score += 30;
    }
    
    // Look for account columns
    if (lines.some(l => /CAIXA.*B\.?BRASIL.*BB\s*R\.?F[áa]cil.*C\.?ECON/i.test(l))) {
      score += 20;
    }
    
    return Math.min(100, score);
  },
  
  parse(content: string, sourceFile: string, options: ParserOptions = {}): ParseResult<CanonicalTransaction> {
    const provenanceBuilder = createProvenanceBuilder(sourceFile, PARSER_NAME, PARSER_VERSION);
    const lines = content.trim().split('\n');
    
    const opts: ParserOptions = {
      defaultYear: options.defaultYear ?? new Date().getFullYear(),
      skipInvalid: options.skipInvalid ?? true,
      maxLines: options.maxLines,
    };
    
    // Find data start (skip header rows)
    let dataStartIdx = 0;
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].toLowerCase();
      if (line.includes('saldo anterior') || (line.includes('data') && line.includes('valor'))) {
        dataStartIdx = i + 1;
        break;
      }
      if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(lines[i])) {
        dataStartIdx = i;
        break;
      }
    }
    
    // If we couldn't find a good start point, default to line 5
    if (dataStartIdx === 0) {
      dataStartIdx = 5;
    }
    
    const results: LineParseResult<CanonicalTransaction>[] = [];
    const maxLines = opts.maxLines ?? lines.length;
    
    for (let i = dataStartIdx; i < Math.min(lines.length, dataStartIdx + maxLines); i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      // Early skip for obvious non-data lines
      if (SKIP_PATTERNS.test(line)) continue;
      
      const cols = parseCSVLine(line);
      const result = parseLineSmart(cols, i + 1, line, opts, provenanceBuilder);
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
 * Parseia um arquivo rawdata e retorna apenas as transações.
 */
export function parseRawdata(content: string, sourceFile: string): CanonicalTransaction[] {
  const result = RawdataParser.parse(content, sourceFile);
  return result.records.map(r => r.record);
}

/**
 * Parseia múltiplos arquivos rawdata de uma vez.
 */
export function parseRawdataFiles(
  files: Array<{ content: string; filename: string }>
): CanonicalTransaction[] {
  const all: CanonicalTransaction[] = [];
  
  for (const file of files) {
    const txs = parseRawdata(file.content, file.filename);
    all.push(...txs);
  }
  
  // Sort by date
  all.sort((a, b) => a.date.localeCompare(b.date));
  
  return all;
}
