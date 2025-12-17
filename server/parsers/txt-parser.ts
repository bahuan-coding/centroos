import type { ParsedTransaction, ParseResult } from './types';

function parseDate(dateStr: string): Date | null {
  const cleaned = dateStr.trim();
  
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleaned)) {
    const [day, month, year] = cleaned.split('/').map(Number);
    return new Date(year, month - 1, day);
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return new Date(cleaned);
  }
  // DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(cleaned)) {
    const [day, month, year] = cleaned.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  // DD.MM.YYYY
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(cleaned)) {
    const [day, month, year] = cleaned.split('.').map(Number);
    return new Date(year, month - 1, day);
  }
  return null;
}

function parseValue(valueStr: string): number | null {
  let cleaned = valueStr.replace(/[R$\s]/g, '').trim();
  
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

function detectTransactionType(line: string, value: number): 'credit' | 'debit' {
  const upper = line.toUpperCase();
  
  // Check for explicit markers
  if (upper.includes(' C ') || upper.includes(' C') || upper.includes('CREDITO') || upper.includes('DEP') || upper.includes('RECEB')) {
    return 'credit';
  }
  if (upper.includes(' D ') || upper.includes(' D') || upper.includes('DEBITO') || upper.includes('PAG') || upper.includes('TRANSF')) {
    return 'debit';
  }
  
  // Use value sign
  return value >= 0 ? 'credit' : 'debit';
}

export async function parseTXT(buffer: Buffer): Promise<ParseResult> {
  let text = buffer.toString('utf-8');
  
  // Try to detect encoding issues
  if (text.includes('�')) {
    const iconv = await import('iconv-lite');
    text = iconv.default.decode(buffer, 'ISO-8859-1');
  }
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const transactions: ParsedTransaction[] = [];
  
  // Pattern: Look for lines that contain a date and a value
  const datePattern = /\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}/;
  const valuePattern = /[R$]?\s*-?\d{1,3}(?:[.,]\d{3})*[.,]\d{2}|\(\d{1,3}(?:[.,]\d{3})*[.,]\d{2}\)/;
  
  for (const line of lines) {
    // Skip header lines (usually don't have both date and value)
    const dateMatch = line.match(datePattern);
    const valueMatch = line.match(valuePattern);
    
    if (dateMatch && valueMatch) {
      const date = parseDate(dateMatch[0]);
      const value = parseValue(valueMatch[0]);
      
      if (date && value !== null) {
        // Extract description: everything that's not the date or value
        let description = line
          .replace(dateMatch[0], '')
          .replace(valueMatch[0], '')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Clean up common separators
        description = description.replace(/^[\|\-\t]+|[\|\-\t]+$/g, '').trim();
        
        if (description.length === 0) {
          description = 'Transação';
        }
        
        transactions.push({
          date,
          description,
          amountCents: Math.round(Math.abs(value) * 100),
          type: detectTransactionType(line, value),
        });
      }
    }
  }
  
  // Sort by date
  transactions.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  return {
    transactions,
    startDate: transactions.length > 0 ? transactions[0].date : undefined,
    endDate: transactions.length > 0 ? transactions[transactions.length - 1].date : undefined,
  };
}

