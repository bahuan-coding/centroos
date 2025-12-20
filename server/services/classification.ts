import { eq, desc as descOrder } from 'drizzle-orm';
import type { ParsedTransaction } from '../parsers/types';
import { getDb, schema } from '../db';

interface ClassificationResult {
  accountId: number | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  ruleId?: number;
  isNfc: boolean;
  nfcCategory?: 'project_70' | 'operating_30';
}

const NFC_PATTERNS = ['NOTA FISCAL CIDADA', 'NFC', 'FAZENDA', 'SEFA', 'GDF'];

function similarity(a: string, b: string): number {
  const s1 = a.toLowerCase().replace(/\s+/g, ' ').trim();
  const s2 = b.toLowerCase().replace(/\s+/g, ' ').trim();
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;

  const words1 = s1.split(' ');
  const words2 = s2.split(' ');
  const common = words1.filter((w) => words2.includes(w)).length;
  return common / Math.max(words1.length, words2.length);
}

export async function classifyTransaction(tx: ParsedTransaction): Promise<ClassificationResult> {
  const db = await getDb();
  const txDesc = tx.description.toUpperCase();

  const isNfc = NFC_PATTERNS.some((p) => txDesc.includes(p));

  const rules = await db
    .select()
    .from(schema.classificationRules)
    .where(eq(schema.classificationRules.active, 1))
    .orderBy(descOrder(schema.classificationRules.priority), descOrder(schema.classificationRules.usageCount));

  for (const rule of rules) {
    const pattern = rule.pattern.toUpperCase();
    if (txDesc.includes(pattern)) {
      return { accountId: rule.accountId, confidence: 'high', ruleId: rule.id, isNfc };
    }
  }

  for (const rule of rules) {
    const sim = similarity(tx.description, rule.pattern);
    if (sim >= 0.8) {
      return { accountId: rule.accountId, confidence: 'medium', ruleId: rule.id, isNfc };
    }
  }

  for (const rule of rules) {
    const sim = similarity(tx.description, rule.pattern);
    if (sim >= 0.5) {
      return { accountId: rule.accountId, confidence: 'low', ruleId: rule.id, isNfc };
    }
  }

  return { accountId: null, confidence: 'none', isNfc };
}

export async function learnFromClassification(
  description: string,
  accountId: number,
  userId: number
): Promise<void> {
  const db = await getDb();
  const pattern = description.trim();

  const [existing] = await db
    .select()
    .from(schema.classificationRules)
    .where(eq(schema.classificationRules.pattern, pattern));

  if (existing) {
    await db
      .update(schema.classificationRules)
      .set({ usageCount: existing.usageCount + 1, accountId })
      .where(eq(schema.classificationRules.id, existing.id));
  } else {
    await db.insert(schema.classificationRules).values({
      pattern,
      accountId,
      priority: 0,
      createdBy: userId,
    });
  }
}

export async function detectDuplicates(
  transactions: ParsedTransaction[],
  periodId: number
): Promise<Set<number>> {
  const db = await getDb();
  const duplicates = new Set<number>();

  const existing = await db
    .select()
    .from(schema.entries)
    .where(eq(schema.entries.periodId, periodId));

  // Build a lookup index for faster matching
  const dateIndex = new Map<string, typeof existing>();
  for (const entry of existing) {
    const dateKey = new Date(entry.transactionDate).toISOString().split('T')[0];
    if (!dateIndex.has(dateKey)) dateIndex.set(dateKey, []);
    dateIndex.get(dateKey)!.push(entry);
  }

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    const txDateKey = tx.date.toISOString().split('T')[0];

    // Note: FITID matching could be added when entries table has fitId column
    // For now, we rely on date/amount/description matching

    // Check entries on the same day or adjacent days
    const dayBefore = new Date(tx.date);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const dayAfter = new Date(tx.date);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const candidates = [
      ...(dateIndex.get(txDateKey) || []),
      ...(dateIndex.get(dayBefore.toISOString().split('T')[0]) || []),
      ...(dateIndex.get(dayAfter.toISOString().split('T')[0]) || []),
    ];

    for (const entry of candidates) {
      const amountMatch = entry.amountCents === tx.amountCents;
      if (!amountMatch) continue;

      const descSim = similarity(entry.description, tx.description);
      if (descSim > 0.7) {
        duplicates.add(i);
        break;
      }
    }
  }

  return duplicates;
}

