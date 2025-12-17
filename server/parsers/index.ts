import { parseBancoBrasilPDF } from './banco-brasil-pdf';
import { parseCaixaPDF } from './caixa-pdf';
import { parseCSV } from './csv-parser';
import { parseOFX } from './ofx-parser';
import type { ParseResult } from './types';

export type { ParsedTransaction, ParseResult } from './types';

export async function parseStatement(buffer: Buffer, bank: string, fileType: string): Promise<ParseResult> {
  if (fileType === 'ofx') {
    return parseOFX(buffer);
  }

  if (fileType === 'csv') {
    return parseCSV(buffer);
  }

  if (fileType === 'pdf') {
    if (bank === 'banco_brasil') {
      return parseBancoBrasilPDF(buffer);
    }
    if (bank === 'caixa_economica') {
      return parseCaixaPDF(buffer);
    }
    return parseBancoBrasilPDF(buffer);
  }

  throw new Error(`Formato não suportado: ${fileType}`);
}

