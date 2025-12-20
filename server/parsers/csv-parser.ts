import { parse } from 'csv-parse/sync';
import type { ParsedTransaction, ParseResult } from './types';

// Mapeamento de headers conhecidos por banco
const HEADER_MAPPINGS = {
  // Banco do Brasil
  bb: {
    date: ['Data', 'DATA', 'Dt. Movimento', 'Data Mov.', 'DT_MOV'],
    description: ['Histórico', 'HISTORICO', 'Descrição', 'DESCRICAO', 'Desc.'],
    value: ['Valor', 'VALOR', 'Valor (R$)', 'VL_MOV'],
    type: ['D/C', 'DC', 'Tipo', 'TIPO'],
    balance: ['Saldo', 'SALDO', 'Saldo (R$)'],
  },
  // Caixa Econômica Federal
  caixa: {
    date: ['Data Mov', 'Data', 'DATA', 'Data Lançamento'],
    description: ['Descrição', 'Historico', 'DESCRICAO', 'Lançamento'],
    value: ['Valor', 'VALOR', 'Valor R$'],
    type: ['Tipo', 'D/C', 'Natureza'],
    balance: ['Saldo', 'SALDO'],
  },
  // Genérico
  generic: {
    date: ['Date', 'Data', 'DATA', 'Dt', 'DT'],
    description: ['Description', 'Descrição', 'Descricao', 'DESCRICAO', 'Historico', 'HISTORICO', 'Memo'],
    value: ['Value', 'Valor', 'VALOR', 'Amount', 'AMOUNT'],
    type: ['Type', 'Tipo', 'D/C', 'DC'],
    balance: ['Balance', 'Saldo', 'SALDO'],
  },
};

function detectDelimiter(text: string): string {
  const firstLines = text.split('\n').slice(0, 3).join('\n');
  const commas = (firstLines.match(/,/g) || []).length;
  const semicolons = (firstLines.match(/;/g) || []).length;
  const tabs = (firstLines.match(/\t/g) || []).length;
  const pipes = (firstLines.match(/\|/g) || []).length;
  
  const counts = [
    { char: ',', count: commas },
    { char: ';', count: semicolons },
    { char: '\t', count: tabs },
    { char: '|', count: pipes },
  ];
  
  counts.sort((a, b) => b.count - a.count);
  return counts[0].count > 0 ? counts[0].char : ',';
}

function detectBank(headers: string[]): 'bb' | 'caixa' | 'generic' {
  const headerStr = headers.join(' ').toUpperCase();
  
  if (headerStr.includes('BANCO DO BRASIL') || headerStr.includes('BB ')) {
    return 'bb';
  }
  if (headerStr.includes('CAIXA') || headerStr.includes('CEF')) {
    return 'caixa';
  }
  
  // Detecta por padrões específicos de headers
  if (headers.some(h => h.includes('Dt. Movimento') || h.includes('DT_MOV'))) {
    return 'bb';
  }
  if (headers.some(h => h.includes('Data Mov') || h.includes('Lançamento'))) {
    return 'caixa';
  }
  
  return 'generic';
}

function findHeader(record: any, possibleHeaders: string[]): string | undefined {
  for (const header of possibleHeaders) {
    if (record[header] !== undefined) {
      return record[header];
    }
  }
  // Tenta pelo índice se não encontrar por nome
  const keys = Object.keys(record);
  for (const header of possibleHeaders) {
    const key = keys.find(k => k.toLowerCase().includes(header.toLowerCase()));
    if (key) return record[key];
  }
  return undefined;
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  const cleaned = dateStr.trim();
  
  // DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleaned)) {
    const [day, month, year] = cleaned.split('/').map(Number);
    return new Date(year, month - 1, day);
  }
  // DD/MM/YY
  if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(cleaned)) {
    const [day, month, year] = cleaned.split('/').map(Number);
    const fullYear = year > 50 ? 1900 + year : 2000 + year;
    return new Date(fullYear, month - 1, day);
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return new Date(cleaned);
  }
  // DD-MM-YYYY
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(cleaned)) {
    const [day, month, year] = cleaned.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  // DD.MM.YYYY
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(cleaned)) {
    const [day, month, year] = cleaned.split('.').map(Number);
    return new Date(year, month - 1, day);
  }
  // DDMMYYYY
  if (/^\d{8}$/.test(cleaned)) {
    const day = parseInt(cleaned.substring(0, 2));
    const month = parseInt(cleaned.substring(2, 4)) - 1;
    const year = parseInt(cleaned.substring(4, 8));
    return new Date(year, month, day);
  }
  
  return null;
}

function parseValue(valueStr: string): number | null {
  if (!valueStr) return null;
  
  let cleaned = valueStr.toString().replace(/[R$\s]/g, '').trim();
  
  // Handle negative with parentheses: (100,00)
  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')') || cleaned.startsWith('-');
  cleaned = cleaned.replace(/[()]/g, '').replace(/^-/, '');
  
  // Brazilian format: 1.234,56
  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  
  const value = parseFloat(cleaned);
  if (isNaN(value)) return null;
  return isNegative ? -value : value;
}

function detectType(record: any, value: number, mapping: typeof HEADER_MAPPINGS.generic): 'credit' | 'debit' {
  const typeValue = findHeader(record, mapping.type);
  
  if (typeValue) {
    const t = typeValue.toString().toUpperCase().trim();
    if (t === 'C' || t === 'CREDIT' || t === 'CREDITO' || t === 'CR' || t === '+') {
      return 'credit';
    }
    if (t === 'D' || t === 'DEBIT' || t === 'DEBITO' || t === 'DB' || t === '-') {
      return 'debit';
    }
  }
  
  // Usa o sinal do valor
  return value >= 0 ? 'credit' : 'debit';
}

function cleanDescription(desc: string): string {
  if (!desc) return 'Transação';
  
  let cleaned = desc.trim().replace(/\s+/g, ' ');
  
  // Remove prefixos comuns
  cleaned = cleaned.replace(/^(TED|PIX|DOC|PAG|TRANSF|DEB AUTO|DEBITO)\s*[-:]?\s*/i, (match) => {
    const prefix = match.trim().replace(/[-:]/g, '');
    return prefix + ' - ';
  });
  
  return cleaned || 'Transação';
}

export async function parseCSV(buffer: Buffer): Promise<ParseResult> {
  // Detecta encoding
  let text = buffer.toString('utf-8');
  if (text.includes('�')) {
    const iconv = await import('iconv-lite');
    text = iconv.default.decode(buffer, 'ISO-8859-1');
  }
  
  // Remove BOM se presente
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }

  const delimiter = detectDelimiter(text);
  
  let records;
  try {
    records = parse(text, { 
      columns: true, 
      skip_empty_lines: true, 
      delimiter, 
      trim: true,
      relax_column_count: true,
      skip_records_with_error: true,
    });
  } catch (e) {
    // Tenta sem headers
    const lines = text.split('\n').filter(l => l.trim());
    records = lines.slice(1).map(line => {
      const cols = line.split(delimiter).map(c => c.trim());
      return {
        Data: cols[0],
        Descrição: cols[1],
        Valor: cols[2],
        Tipo: cols[3],
      };
    });
  }

  if (!records || records.length === 0) {
    return { transactions: [] };
  }

  // Detecta banco pelo header
  const headers = Object.keys(records[0]);
  const bankType = detectBank(headers);
  const mapping = HEADER_MAPPINGS[bankType];
  
  const bankNames: Record<string, string> = {
    bb: 'Banco do Brasil',
    caixa: 'Caixa Econômica Federal',
    generic: undefined as any,
  };

  const transactions: ParsedTransaction[] = [];

  for (const record of records) {
    const dateStr = findHeader(record, mapping.date);
    const descStr = findHeader(record, mapping.description);
    const valueStr = findHeader(record, mapping.value);
    
    if (!dateStr || !valueStr) continue;
    
    const date = parseDate(String(dateStr));
    const value = parseValue(String(valueStr));
    
    if (!date || value === null) continue;
    
    const type = detectType(record, value, mapping);
    const description = cleanDescription(String(descStr || ''));
    
    transactions.push({
      date,
      description,
      amountCents: Math.round(Math.abs(value) * 100),
      type,
    });
  }

  // Ordena por data
  transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

  return {
    transactions: transactions.filter(t => t.description && t.amountCents > 0),
    startDate: transactions.length > 0 ? transactions[0].date : undefined,
    endDate: transactions.length > 0 ? transactions[transactions.length - 1].date : undefined,
    bank: bankNames[bankType],
  };
}
