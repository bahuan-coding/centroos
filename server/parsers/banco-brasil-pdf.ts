import pdf from 'pdf-parse';
import type { ParsedTransaction, ParseResult } from './types';

export async function parseBancoBrasilPDF(buffer: Buffer): Promise<ParseResult> {
  const data = await pdf(buffer);
  const text = data.text;
  const transactions: ParsedTransaction[] = [];

  const lines = text.split('\n');
  const dateRegex = /(\d{2}\/\d{2}\/\d{4})/;
  const valueRegex = /([\d.,]+)\s*([CD])/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const dateMatch = line.match(dateRegex);
    if (!dateMatch) continue;

    const [day, month, year] = dateMatch[1].split('/').map(Number);
    const date = new Date(year, month - 1, day);

    let description = line.replace(dateMatch[0], '').trim();
    let valueStr = '';
    let typeChar = '';

    const valMatch = line.match(valueRegex);
    if (valMatch) {
      valueStr = valMatch[1];
      typeChar = valMatch[2];
      description = description.replace(valMatch[0], '').trim();
    } else if (i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      const nextValMatch = nextLine.match(valueRegex);
      if (nextValMatch) {
        valueStr = nextValMatch[1];
        typeChar = nextValMatch[2];
        description += ' ' + nextLine.replace(nextValMatch[0], '').trim();
        i++;
      }
    }

    if (!valueStr || !typeChar) continue;

    const value = parseFloat(valueStr.replace(/\./g, '').replace(',', '.'));
    if (isNaN(value) || value === 0) continue;

    transactions.push({
      date,
      description: description.replace(/\s+/g, ' ').trim(),
      amountCents: Math.round(Math.abs(value) * 100),
      type: typeChar === 'C' ? 'credit' : 'debit',
    });
  }

  return {
    transactions,
    startDate: transactions.length > 0 ? transactions[transactions.length - 1].date : undefined,
    endDate: transactions.length > 0 ? transactions[0].date : undefined,
    bank: 'banco_brasil',
  };
}

