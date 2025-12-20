import type { ParsedTransaction, ParseResult } from './types';

// Padrões de extrato por banco
const BANK_PATTERNS = {
  bb: {
    // Formato BB: DD/MM/YYYY DESCRIÇÃO VALOR D/C
    linePattern: /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d.,]+)\s*([DC])?$/,
    // Formato alternativo: DATA | HISTÓRICO | VALOR | SALDO
    altPattern: /^(\d{2}\/\d{2}\/\d{4})\s*\|\s*(.+?)\s*\|\s*([-]?[\d.,]+)\s*\|?\s*([-]?[\d.,]+)?$/,
    indicators: ['BANCO DO BRASIL', 'BB S.A.', 'EXTRATO DE CONTA'],
  },
  caixa: {
    // Formato Caixa: DD/MM/YYYY DESCRIÇÃO VALOR
    linePattern: /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([-]?[\d.,]+)$/,
    // Formato alternativo com tipo
    altPattern: /^(\d{2}\/\d{2})\s+(.+?)\s+([-]?[\d.,]+)\s+([+-])$/,
    indicators: ['CAIXA ECONOMICA', 'CEF', 'CAIXA FEDERAL'],
  },
};

function parseDate(dateStr: string): Date | null {
  const cleaned = dateStr.trim();
  
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleaned)) {
    const [day, month, year] = cleaned.split('/').map(Number);
    return new Date(year, month - 1, day);
  }
  // DD/MM (assume ano atual)
  if (/^\d{2}\/\d{2}$/.test(cleaned)) {
    const [day, month] = cleaned.split('/').map(Number);
    return new Date(new Date().getFullYear(), month - 1, day);
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

function detectTransactionType(line: string, value: number, explicitType?: string): 'credit' | 'debit' {
  // Tipo explícito
  if (explicitType) {
    const t = explicitType.toUpperCase();
    if (t === 'C' || t === '+') return 'credit';
    if (t === 'D' || t === '-') return 'debit';
  }
  
  const upper = line.toUpperCase();
  
  // Palavras-chave de crédito
  const creditKeywords = [
    'CREDITO', 'DEPOSITO', 'DEP ', 'RECEB', 'TED RECEB', 'PIX RECEB',
    'DOC RECEB', 'TRANSF RECEB', 'ESTORNO', 'RENDIMENTO', 'JUROS REC'
  ];
  
  // Palavras-chave de débito
  const debitKeywords = [
    'DEBITO', 'PAGAMENTO', 'PAG ', 'SAQUE', 'TED ENV', 'PIX ENV',
    'DOC ENV', 'TRANSF ENV', 'TARIFA', 'IOF', 'JUROS', 'ENCARGO',
    'DEB AUTO', 'DEBITO AUT'
  ];
  
  for (const kw of creditKeywords) {
    if (upper.includes(kw)) return 'credit';
  }
  
  for (const kw of debitKeywords) {
    if (upper.includes(kw)) return 'debit';
  }
  
  // Usa sinal do valor
  return value >= 0 ? 'credit' : 'debit';
}

function cleanDescription(desc: string): string {
  if (!desc) return 'Transação';
  
  let cleaned = desc.trim().replace(/\s+/g, ' ');
  
  // Remove códigos e prefixos comuns
  cleaned = cleaned.replace(/^\d{6,}\s*/, '');
  cleaned = cleaned.replace(/^(TED|PIX|DOC|PAG|TRANSF|DEB)\s*[-:]?\s*/i, (match) => {
    const prefix = match.trim().replace(/[-:]/g, '');
    return prefix + ' - ';
  });
  
  // Remove sufixos de agência/conta
  cleaned = cleaned.replace(/\s+AG\s*\d+.*$/i, '');
  cleaned = cleaned.replace(/\s+C\/C\s*\d+.*$/i, '');
  
  return cleaned.trim() || 'Transação';
}

function detectBank(text: string): 'bb' | 'caixa' | null {
  const upper = text.toUpperCase();
  
  for (const indicator of BANK_PATTERNS.bb.indicators) {
    if (upper.includes(indicator)) return 'bb';
  }
  
  for (const indicator of BANK_PATTERNS.caixa.indicators) {
    if (upper.includes(indicator)) return 'caixa';
  }
  
  return null;
}

export async function parseTXT(buffer: Buffer): Promise<ParseResult> {
  let text = buffer.toString('utf-8');
  
  // Detecta encoding
  if (text.includes('�')) {
    const iconv = await import('iconv-lite');
    text = iconv.default.decode(buffer, 'ISO-8859-1');
  }
  
  // Remove BOM
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const transactions: ParsedTransaction[] = [];
  
  // Detecta banco
  const bank = detectBank(text);
  const bankName = bank === 'bb' ? 'Banco do Brasil' : 
                   bank === 'caixa' ? 'Caixa Econômica Federal' : undefined;
  
  // Padrões de data e valor para detecção genérica
  const datePattern = /\d{2}[\/\-\.]\d{2}[\/\-\.]?\d{0,4}/;
  const valuePattern = /[R$]?\s*-?[\d.,]+(?:[.,]\d{2})?|\([\d.,]+\)/;
  
  for (const line of lines) {
    // Ignora linhas de cabeçalho ou sem dados
    if (line.length < 15) continue;
    if (/^[-=_*]+$/.test(line)) continue;
    if (/^(DATA|HISTORICO|DESCRICAO|VALOR|SALDO|EXTRATO)/i.test(line)) continue;
    
    // Tenta padrões específicos do banco detectado
    if (bank) {
      const patterns = BANK_PATTERNS[bank];
      let match = line.match(patterns.linePattern);
      
      if (!match) {
        match = line.match(patterns.altPattern);
      }
      
      if (match) {
        const date = parseDate(match[1]);
        const description = match[2];
        const value = parseValue(match[3]);
        const explicitType = match[4];
        
        if (date && value !== null) {
          const type = detectTransactionType(line, value, explicitType);
          
          transactions.push({
            date,
            description: cleanDescription(description),
            amountCents: Math.round(Math.abs(value) * 100),
            type,
          });
          continue;
        }
      }
    }
    
    // Detecção genérica
    const dateMatch = line.match(datePattern);
    const valueMatch = line.match(valuePattern);
    
    if (dateMatch && valueMatch) {
      const date = parseDate(dateMatch[0]);
      const value = parseValue(valueMatch[0]);
      
      if (date && value !== null) {
        // Extrai descrição removendo data e valor
        let description = line
          .replace(dateMatch[0], '')
          .replace(valueMatch[0], '')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Remove separadores
        description = description.replace(/^[\|\-\t]+|[\|\-\t]+$/g, '').trim();
        
        const type = detectTransactionType(line, value);
        
        transactions.push({
          date,
          description: cleanDescription(description),
          amountCents: Math.round(Math.abs(value) * 100),
          type,
        });
      }
    }
  }
  
  // Ordena por data
  transactions.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Remove transações com valor zero
  const validTransactions = transactions.filter(t => t.amountCents > 0);
  
  return {
    transactions: validTransactions,
    startDate: validTransactions.length > 0 ? validTransactions[0].date : undefined,
    endDate: validTransactions.length > 0 ? validTransactions[validTransactions.length - 1].date : undefined,
    bank: bankName,
  };
}
