import { parseCSV } from './csv-parser';
import { parseOFX } from './ofx-parser';
import { parseTXT } from './txt-parser';
import type { ParseResult } from './types';

export type { ParsedTransaction, ParseResult } from './types';

export async function parseStatement(buffer: Buffer, fileType: string): Promise<ParseResult> {
  switch (fileType.toLowerCase()) {
    case 'ofx':
      return parseOFX(buffer);
    case 'csv':
      return parseCSV(buffer);
    case 'txt':
      return parseTXT(buffer);
    default:
      throw new Error(`Formato não suportado: ${fileType}. Use CSV, OFX ou TXT.`);
  }
}
