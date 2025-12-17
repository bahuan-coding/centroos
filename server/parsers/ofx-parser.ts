import { parseStringPromise } from 'xml2js';
import type { ParsedTransaction, ParseResult } from './types';

export async function parseOFX(buffer: Buffer): Promise<ParseResult> {
  let text = buffer.toString('utf-8');

  const xmlStart = text.indexOf('<OFX>');
  if (xmlStart !== -1) {
    text = text.substring(xmlStart);
  }

  text = text.replace(/<(\w+)>([^<]+)(?=<)/g, '<$1>$2</$1>');

  const parsed = await parseStringPromise(text, { explicitArray: false });

  const stmtrs = parsed.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS;
  if (!stmtrs) {
    throw new Error('Formato OFX inválido');
  }

  const tranList = stmtrs.BANKTRANLIST;
  if (!tranList?.STMTTRN) {
    return { transactions: [] };
  }

  const stmtTrns = Array.isArray(tranList.STMTTRN) ? tranList.STMTTRN : [tranList.STMTTRN];

  const transactions: ParsedTransaction[] = stmtTrns.map((trn: any) => {
    const dateStr = trn.DTPOSTED || '';
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    const date = new Date(year, month, day);

    const amount = parseFloat(trn.TRNAMT || '0');
    const description = trn.MEMO || trn.NAME || 'Transação';

    return {
      date,
      description: description.trim(),
      amountCents: Math.round(Math.abs(amount) * 100),
      type: amount >= 0 ? 'credit' as const : 'debit' as const,
      fitId: trn.FITID,
    };
  });

  const bankAcct = stmtrs.BANKACCTFROM;

  return {
    transactions,
    startDate: transactions.length > 0 ? transactions[transactions.length - 1].date : undefined,
    endDate: transactions.length > 0 ? transactions[0].date : undefined,
    account: bankAcct?.ACCTID,
  };
}

