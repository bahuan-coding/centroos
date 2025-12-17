import pdf from 'pdf-parse';
import type { ParsedTransaction, ParseResult } from './types';

export async function parseCaixaPDF(buffer: Buffer): Promise<ParseResult> {
  const data = await pdf(buffer);
  const text = data.text;
  const transactions: ParsedTransaction[] = [];

  const lines = text.split('\n');
  const dateRegex = /(\d{2}\/\d{2})/;
  const valueRegex = /([\d.,]+)([+-])/;

  const currentYear = new Date().getFullYear();
  let currentTransaction: Partial<ParsedTransaction> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const dateMatch = trimmed.match(dateRegex);
    const valMatch = trimmed.match(valueRegex);

    if (dateMatch && valMatch) {
      if (currentTransaction && currentTransaction.date) {
        transactions.push(currentTransaction as ParsedTransaction);
      }

      const [day, month] = dateMatch[1].split('/').map(Number);
      const date = new Date(currentYear, month - 1, day);

      const value = parseFloat(valMatch[1].replace(/\./g, '').replace(',', '.'));
      const sign = valMatch[2];

      let description = trimmed.replace(dateMatch[0], '').replace(valMatch[0], '').trim();

      currentTransaction = {
        date,
        description,
        amountCents: Math.round(Math.abs(value) * 100),
        type: sign === '+' ? 'credit' : 'debit',
      };
    } else if (currentTransaction && trimmed.length > 2) {
      currentTransaction.description = (currentTransaction.description || '') + ' ' + trimmed;
    }
  }

  if (currentTransaction && currentTransaction.date) {
    transactions.push(currentTransaction as ParsedTransaction);
  }

  transactions.forEach((t) => {
    t.description = t.description.replace(/\s+/g, ' ').trim();
  });

  return {
    transactions,
    startDate: transactions.length > 0 ? transactions[transactions.length - 1].date : undefined,
    endDate: transactions.length > 0 ? transactions[0].date : undefined,
    bank: 'caixa_economica',
  };
}

