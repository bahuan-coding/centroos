import { parse } from 'csv-parse/sync';
import type { ParsedTransaction, ParseResult } from './types';

function detectDelimiter(text: string): string {
  const firstLine = text.split('\n')[0];
  const commas = (firstLine.match(/,/g) || []).length;
  const semicolons = (firstLine.match(/;/g) || []).length;
  return semicolons > commas ? ';' : ',';
}

function parseDate(dateStr: string): Date {
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr);
}

function parseValue(valueStr: string): number {
  let cleaned = valueStr.replace(/[R$\s]/g, '');
  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  return parseFloat(cleaned);
}

export async function parseCSV(buffer: Buffer): Promise<ParseResult> {
  let text = buffer.toString('utf-8');
  if (text.includes('�')) {
    const iconv = await import('iconv-lite');
    text = iconv.default.decode(buffer, 'ISO-8859-1');
  }

  const delimiter = detectDelimiter(text);
  const records = parse(text, { columns: true, skip_empty_lines: true, delimiter, trim: true });

  const transactions: ParsedTransaction[] = records.map((record: any) => {
    const dateField = record.Data || record.data || record.DATE || record.Date || Object.values(record)[0];
    const descField = record.Descrição || record.Descricao || record.Description || record.DESCRIPTION || record.Historico || Object.values(record)[1];
    const valueField = record.Valor || record.Value || record.VALOR || record.Amount || Object.values(record)[2];
    const typeField = record.Tipo || record.Type || record.TIPO;

    const date = parseDate(String(dateField));
    const value = parseValue(String(valueField));

    let type: 'credit' | 'debit' = value >= 0 ? 'credit' : 'debit';
    if (typeField) {
      const t = String(typeField).toUpperCase();
      if (t === 'C' || t === 'CREDIT' || t === 'CREDITO') type = 'credit';
      if (t === 'D' || t === 'DEBIT' || t === 'DEBITO') type = 'debit';
    }

    return {
      date,
      description: String(descField || '').trim(),
      amountCents: Math.round(Math.abs(value) * 100),
      type,
    };
  });

  return {
    transactions: transactions.filter((t) => t.description && t.amountCents > 0),
    startDate: transactions.length > 0 ? transactions[transactions.length - 1].date : undefined,
    endDate: transactions.length > 0 ? transactions[0].date : undefined,
  };
}

