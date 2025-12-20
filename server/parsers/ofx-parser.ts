import { parseStringPromise } from 'xml2js';
import type { ParsedTransaction, ParseResult } from './types';

// Códigos de banco brasileiros
const BANK_CODES: Record<string, string> = {
  '001': 'Banco do Brasil',
  '104': 'Caixa Econômica Federal',
  '237': 'Bradesco',
  '341': 'Itaú',
  '033': 'Santander',
  '756': 'Sicoob',
  '748': 'Sicredi',
  '077': 'Inter',
  '260': 'Nubank',
  '336': 'C6 Bank',
};

function detectEncoding(buffer: Buffer): string {
  // Tenta detectar encoding pela BOM ou caracteres
  const bytes = buffer.slice(0, 4);
  
  // UTF-8 BOM
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return 'utf-8';
  }
  
  // UTF-16 LE BOM
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return 'utf-16le';
  }
  
  // Verifica se há caracteres ISO-8859-1 típicos (acentuação PT-BR)
  const text = buffer.toString('utf-8');
  if (text.includes('�') || text.includes('ã') === false && buffer.includes(0xE3)) {
    return 'iso-8859-1';
  }
  
  return 'utf-8';
}

function parseOFXDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  // Formato OFX: YYYYMMDDHHMMSS ou YYYYMMDD
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1;
  const day = parseInt(dateStr.substring(6, 8));
  const hour = dateStr.length >= 10 ? parseInt(dateStr.substring(8, 10)) : 0;
  const minute = dateStr.length >= 12 ? parseInt(dateStr.substring(10, 12)) : 0;
  const second = dateStr.length >= 14 ? parseInt(dateStr.substring(12, 14)) : 0;
  
  return new Date(year, month, day, hour, minute, second);
}

function cleanDescription(desc: string): string {
  if (!desc) return 'Transação';
  
  // Remove espaços extras e normaliza
  let cleaned = desc.trim().replace(/\s+/g, ' ');
  
  // Padrões comuns do BB
  cleaned = cleaned.replace(/^TED\s+/i, 'TED - ');
  cleaned = cleaned.replace(/^PIX\s+/i, 'PIX - ');
  cleaned = cleaned.replace(/^DOC\s+/i, 'DOC - ');
  cleaned = cleaned.replace(/^PAG\s+/i, 'Pagamento - ');
  cleaned = cleaned.replace(/^TRANSF\s+/i, 'Transferência - ');
  cleaned = cleaned.replace(/^DEB\s+AUTO\s+/i, 'Débito Automático - ');
  
  // Padrões comuns da Caixa
  cleaned = cleaned.replace(/^CAIXA\s+/i, '');
  cleaned = cleaned.replace(/^CEF\s+/i, '');
  
  return cleaned || 'Transação';
}

function detectBankFromOFX(parsed: any): { code: string; name: string } | null {
  try {
    const bankAcct = parsed.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS?.BANKACCTFROM;
    const creditAcct = parsed.OFX?.CREDITCARDMSGSRSV1?.CCSTMTTRNRS?.CCSTMTRS?.CCACCTFROM;
    
    const bankId = bankAcct?.BANKID || creditAcct?.ACCTID?.substring(0, 3);
    
    if (bankId) {
      const cleanBankId = bankId.replace(/^0+/, '').padStart(3, '0');
      const bankName = BANK_CODES[cleanBankId];
      if (bankName) {
        return { code: cleanBankId, name: bankName };
      }
    }
    
    // Tenta detectar pelo FI (Financial Institution)
    const fi = parsed.OFX?.SIGNONMSGSRSV1?.SONRS?.FI;
    if (fi?.ORG) {
      const org = fi.ORG.toUpperCase();
      if (org.includes('BRASIL') || org.includes('BB')) {
        return { code: '001', name: 'Banco do Brasil' };
      }
      if (org.includes('CAIXA') || org.includes('CEF')) {
        return { code: '104', name: 'Caixa Econômica Federal' };
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

function extractAccountInfo(parsed: any): { 
  account?: string; 
  branch?: string; 
  accountType?: string 
} {
  try {
    const bankAcct = parsed.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS?.BANKACCTFROM;
    const creditAcct = parsed.OFX?.CREDITCARDMSGSRSV1?.CCSTMTTRNRS?.CCSTMTRS?.CCACCTFROM;
    
    if (bankAcct) {
      return {
        account: bankAcct.ACCTID,
        branch: bankAcct.BRANCHID,
        accountType: bankAcct.ACCTTYPE,
      };
    }
    
    if (creditAcct) {
      return {
        account: creditAcct.ACCTID,
        accountType: 'CREDITCARD',
      };
    }
    
    return {};
  } catch {
    return {};
  }
}

function extractPeriod(parsed: any): { startDate?: Date; endDate?: Date } {
  try {
    const tranList = parsed.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS?.BANKTRANLIST ||
                     parsed.OFX?.CREDITCARDMSGSRSV1?.CCSTMTTRNRS?.CCSTMTRS?.BANKTRANLIST;
    
    if (tranList) {
      return {
        startDate: tranList.DTSTART ? parseOFXDate(tranList.DTSTART) : undefined,
        endDate: tranList.DTEND ? parseOFXDate(tranList.DTEND) : undefined,
      };
    }
    
    return {};
  } catch {
    return {};
  }
}

export async function parseOFX(buffer: Buffer): Promise<ParseResult> {
  // Detecta e converte encoding se necessário
  const encoding = detectEncoding(buffer);
  let text: string;
  
  if (encoding === 'iso-8859-1') {
    const iconv = await import('iconv-lite');
    text = iconv.default.decode(buffer, 'ISO-8859-1');
  } else {
    text = buffer.toString('utf-8');
  }

  // Remove header SGML/OFX e encontra início do XML
  const xmlStart = text.indexOf('<OFX>');
  if (xmlStart !== -1) {
    text = text.substring(xmlStart);
  }

  // Converte SGML para XML fechando tags
  text = text.replace(/<(\w+)>([^<]+)(?=<)/g, '<$1>$2</$1>');
  
  // Remove caracteres inválidos
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  const parsed = await parseStringPromise(text, { 
    explicitArray: false,
    ignoreAttrs: true,
    trim: true,
  });

  // Extrai metadados
  const bankInfo = detectBankFromOFX(parsed);
  const accountInfo = extractAccountInfo(parsed);
  const period = extractPeriod(parsed);

  // Busca transações em diferentes locais possíveis
  const stmtrs = parsed.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS;
  const ccstmtrs = parsed.OFX?.CREDITCARDMSGSRSV1?.CCSTMTTRNRS?.CCSTMTRS;
  
  const tranList = stmtrs?.BANKTRANLIST || ccstmtrs?.BANKTRANLIST;
  
  if (!tranList?.STMTTRN) {
    return { 
      transactions: [],
      bank: bankInfo?.name,
      account: accountInfo.account,
    };
  }

  const stmtTrns = Array.isArray(tranList.STMTTRN) ? tranList.STMTTRN : [tranList.STMTTRN];

  const transactions: ParsedTransaction[] = stmtTrns.map((trn: any) => {
    const date = parseOFXDate(trn.DTPOSTED || '');
    const amount = parseFloat(trn.TRNAMT || '0');
    
    // Prioriza MEMO sobre NAME para descrição mais detalhada
    const description = cleanDescription(trn.MEMO || trn.NAME || '');
    
    // FITID é o identificador único da transação no banco
    const fitId = trn.FITID || '';
    
    // Tipo da transação baseado no TRNTYPE e valor
    let type: 'credit' | 'debit' = amount >= 0 ? 'credit' : 'debit';
    
    // TRNTYPE pode fornecer informação adicional
    const trnType = trn.TRNTYPE?.toUpperCase();
    if (trnType === 'CREDIT' || trnType === 'DEP' || trnType === 'INT') {
      type = 'credit';
    } else if (trnType === 'DEBIT' || trnType === 'CHECK' || trnType === 'PAYMENT' || trnType === 'FEE') {
      type = 'debit';
    }

    return {
      date,
      description,
      amountCents: Math.round(Math.abs(amount) * 100),
      type,
      fitId,
    };
  });

  // Ordena por data (mais antiga primeiro)
  transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

  return {
    transactions,
    startDate: period.startDate || (transactions.length > 0 ? transactions[0].date : undefined),
    endDate: period.endDate || (transactions.length > 0 ? transactions[transactions.length - 1].date : undefined),
    bank: bankInfo?.name,
    account: accountInfo.account,
  };
}
