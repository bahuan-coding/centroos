export interface ParsedTransaction {
  date: Date;
  description: string;
  amountCents: number;
  type: 'credit' | 'debit';
  balance?: number;
  fitId?: string;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  startDate?: Date;
  endDate?: Date;
  bank?: string;
  account?: string;
}

