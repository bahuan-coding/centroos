import { z } from 'zod';
import { eq, and, desc, asc, like, sql, between, isNull, or } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure, adminProcedure, accountantProcedure } from './trpc';
import { getDb, schema } from './db';

// ==================== ACCOUNTS ROUTER ====================
const accountsRouter = router({
  list: publicProcedure
    .input(z.object({ type: z.string().optional(), active: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      let query = db.select().from(schema.accounts);
      
      const conditions = [];
      if (input?.type) conditions.push(eq(schema.accounts.type, input.type as any));
      if (input?.active !== undefined) conditions.push(eq(schema.accounts.active, input.active ? 1 : 0));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      return query.orderBy(asc(schema.accounts.code));
    }),

  getById: publicProcedure.input(z.number()).query(async ({ input }) => {
    const db = await getDb();
    const [account] = await db.select().from(schema.accounts).where(eq(schema.accounts.id, input));
    if (!account) throw new TRPCError({ code: 'NOT_FOUND', message: 'Conta não encontrada' });
    return account;
  }),

  create: accountantProcedure
    .input(z.object({
      code: z.string().min(1).max(50),
      name: z.string().min(3).max(255),
      type: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense', 'fixed_asset']),
      parentId: z.number().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      const [existing] = await db.select().from(schema.accounts).where(eq(schema.accounts.code, input.code));
      if (existing) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Código já existe' });
      
      let level = 0;
      if (input.parentId) {
        const [parent] = await db.select().from(schema.accounts).where(eq(schema.accounts.id, input.parentId));
        if (!parent) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Conta pai não encontrada' });
        if (!input.code.startsWith(parent.code)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `Código deve começar com ${parent.code}` });
        }
        level = parent.level + 1;
      }
      
      const [result] = await db.insert(schema.accounts).values({ ...input, level }).returning({ id: schema.accounts.id });
      
      await db.insert(schema.auditLog).values({
        userId: ctx.user.id,
        entityType: 'account',
        entityId: result.id,
        action: 'create',
        newValues: input,
      });
      
      return { id: result.id };
    }),

  update: accountantProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(3).max(255).optional(),
      description: z.string().optional(),
      active: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { id, ...data } = input;
      
      const [account] = await db.select().from(schema.accounts).where(eq(schema.accounts.id, id));
      if (!account) throw new TRPCError({ code: 'NOT_FOUND', message: 'Conta não encontrada' });
      
      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.active !== undefined) updateData.active = data.active ? 1 : 0;
      
      await db.update(schema.accounts).set(updateData).where(eq(schema.accounts.id, id));
      
      await db.insert(schema.auditLog).values({
        userId: ctx.user.id,
        entityType: 'account',
        entityId: id,
        action: 'update',
        oldValues: account,
        newValues: updateData,
      });
      
      return { success: true };
    }),

  delete: adminProcedure.input(z.number()).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    
    const [hasEntries] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.entries).where(eq(schema.entries.accountId, input));
    
    if (hasEntries.count > 0) {
      await db.update(schema.accounts).set({ active: 0 }).where(eq(schema.accounts.id, input));
    } else {
      await db.delete(schema.accounts).where(eq(schema.accounts.id, input));
    }
    
    await db.insert(schema.auditLog).values({
      userId: ctx.user.id,
      entityType: 'account',
      entityId: input,
      action: 'delete',
    });
    
    return { success: true };
  }),

  hasChildren: publicProcedure.input(z.number()).query(async ({ input }) => {
    const db = await getDb();
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.accounts).where(eq(schema.accounts.parentId, input));
    return result.count > 0;
  }),
});

// ==================== PERIODS ROUTER ====================
const periodsRouter = router({
  list: publicProcedure.query(async () => {
    const db = await getDb();
    return db.select().from(schema.periods).orderBy(desc(schema.periods.year), desc(schema.periods.month));
  }),

  getById: publicProcedure.input(z.number()).query(async ({ input }) => {
    const db = await getDb();
    const [period] = await db.select().from(schema.periods).where(eq(schema.periods.id, input));
    if (!period) throw new TRPCError({ code: 'NOT_FOUND', message: 'Período não encontrado' });
    return period;
  }),

  getCurrent: publicProcedure.query(async () => {
    const db = await getDb();
    const now = new Date();
    const [period] = await db.select().from(schema.periods)
      .where(and(eq(schema.periods.month, now.getMonth() + 1), eq(schema.periods.year, now.getFullYear())));
    return period || null;
  }),

  create: accountantProcedure
    .input(z.object({
      month: z.number().min(1).max(12),
      year: z.number().min(2000).max(2100),
      openingBalance: z.number().default(0),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      const [existing] = await db.select().from(schema.periods)
        .where(and(eq(schema.periods.month, input.month), eq(schema.periods.year, input.year)));
      if (existing) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Período já existe' });
      
      const [result] = await db.insert(schema.periods).values(input).returning({ id: schema.periods.id });
      
      await db.insert(schema.auditLog).values({
        userId: ctx.user.id,
        entityType: 'period',
        entityId: result.id,
        action: 'create',
        newValues: input,
      });
      
      return { id: result.id };
    }),

  close: accountantProcedure
    .input(z.object({
      id: z.number(),
      closingBalance: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { id, closingBalance, notes } = input;
      
      const [period] = await db.select().from(schema.periods).where(eq(schema.periods.id, id));
      if (!period) throw new TRPCError({ code: 'NOT_FOUND', message: 'Período não encontrado' });
      if (period.status === 'closed') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Período já fechado' });
      
      await db.update(schema.periods).set({
        status: 'closed',
        closingBalance,
        closedBy: ctx.user.id,
        closedAt: new Date(),
        notes,
      }).where(eq(schema.periods.id, id));
      
      const nextMonth = period.month === 12 ? 1 : period.month + 1;
      const nextYear = period.month === 12 ? period.year + 1 : period.year;
      
      const [existingNext] = await db.select().from(schema.periods)
        .where(and(eq(schema.periods.month, nextMonth), eq(schema.periods.year, nextYear)));
      
      if (!existingNext) {
        await db.insert(schema.periods).values({
          month: nextMonth,
          year: nextYear,
          openingBalance: closingBalance,
          status: 'open',
        });
      }
      
      await db.insert(schema.auditLog).values({
        userId: ctx.user.id,
        entityType: 'period',
        entityId: id,
        action: 'close',
        oldValues: { status: period.status },
        newValues: { status: 'closed', closingBalance },
      });
      
      return { success: true };
    }),

  reopen: adminProcedure
    .input(z.object({ id: z.number(), reason: z.string().min(10) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { id, reason } = input;
      
      const [period] = await db.select().from(schema.periods).where(eq(schema.periods.id, id));
      if (!period) throw new TRPCError({ code: 'NOT_FOUND', message: 'Período não encontrado' });
      if (period.status !== 'closed') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Período não está fechado' });
      
      await db.update(schema.periods).set({
        status: 'open',
        notes: `REABERTO: ${reason}\n\n${period.notes || ''}`,
      }).where(eq(schema.periods.id, id));
      
      await db.insert(schema.auditLog).values({
        userId: ctx.user.id,
        entityType: 'period',
        entityId: id,
        action: 'reopen',
        oldValues: { status: 'closed' },
        newValues: { status: 'open', reason },
      });
      
      return { success: true };
    }),
});

// ==================== ENTRIES ROUTER ====================
const entriesRouter = router({
  list: publicProcedure
    .input(z.object({
      periodId: z.number().optional(),
      accountId: z.number().optional(),
      type: z.enum(['debit', 'credit']).optional(),
      isNfc: z.boolean().optional(),
      page: z.number().default(1),
      limit: z.number().min(1).max(100).default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const page = input?.page || 1;
      const limit = input?.limit || 50;
      const offset = (page - 1) * limit;
      
      const conditions = [];
      if (input?.periodId) conditions.push(eq(schema.entries.periodId, input.periodId));
      if (input?.accountId) conditions.push(eq(schema.entries.accountId, input.accountId));
      if (input?.type) conditions.push(eq(schema.entries.type, input.type));
      if (input?.isNfc !== undefined) conditions.push(eq(schema.entries.isNfc, input.isNfc ? 1 : 0));
      
      let query = db.select({
        entry: schema.entries,
        account: schema.accounts,
        period: schema.periods,
      })
        .from(schema.entries)
        .leftJoin(schema.accounts, eq(schema.entries.accountId, schema.accounts.id))
        .leftJoin(schema.periods, eq(schema.entries.periodId, schema.periods.id));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      const entries = await query.orderBy(desc(schema.entries.transactionDate)).limit(limit).offset(offset);
      
      const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(schema.entries)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
      
      return {
        entries: entries.map(e => ({ ...e.entry, account: e.account, period: e.period })),
        total: countResult.count,
        page,
        pages: Math.ceil(countResult.count / limit),
      };
    }),

  getById: publicProcedure.input(z.number()).query(async ({ input }) => {
    const db = await getDb();
    const [result] = await db.select({
      entry: schema.entries,
      account: schema.accounts,
      period: schema.periods,
    })
      .from(schema.entries)
      .leftJoin(schema.accounts, eq(schema.entries.accountId, schema.accounts.id))
      .leftJoin(schema.periods, eq(schema.entries.periodId, schema.periods.id))
      .where(eq(schema.entries.id, input));
    
    if (!result) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lançamento não encontrado' });
    return { ...result.entry, account: result.account, period: result.period };
  }),

  create: protectedProcedure
    .input(z.object({
      periodId: z.number(),
      accountId: z.number(),
      type: z.enum(['debit', 'credit']),
      amountCents: z.number().positive(),
      transactionDate: z.string(),
      description: z.string().min(3).max(500),
      isNfc: z.boolean().default(false),
      nfcCategory: z.enum(['project_70', 'operating_30']).optional(),
      documentNumber: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      const [period] = await db.select().from(schema.periods).where(eq(schema.periods.id, input.periodId));
      if (!period) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Período não encontrado' });
      if (period.status === 'closed') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Período fechado' });
      
      const [account] = await db.select().from(schema.accounts).where(eq(schema.accounts.id, input.accountId));
      if (!account) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Conta não encontrada' });
      
      const [hasChildren] = await db.select({ count: sql<number>`count(*)` })
        .from(schema.accounts).where(eq(schema.accounts.parentId, input.accountId));
      if (hasChildren.count > 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Conta sintética' });
      
      const txDate = new Date(input.transactionDate);
      if (txDate > new Date()) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Data futura' });
      
      if (input.isNfc && input.type === 'debit' && !input.nfcCategory) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Categoria NFC obrigatória' });
      }
      
      const [result] = await db.insert(schema.entries).values({
        ...input,
        transactionDate: txDate.toISOString().split('T')[0],
        isNfc: input.isNfc ? 1 : 0,
        createdBy: ctx.user.id,
      }).returning({ id: schema.entries.id });
      
      await db.insert(schema.auditLog).values({
        userId: ctx.user.id,
        entityType: 'entry',
        entityId: result.id,
        action: 'create',
        newValues: input,
      });
      
      return { id: result.id };
    }),

  update: accountantProcedure
    .input(z.object({
      id: z.number(),
      accountId: z.number().optional(),
      type: z.enum(['debit', 'credit']).optional(),
      amountCents: z.number().positive().optional(),
      transactionDate: z.string().optional(),
      description: z.string().min(3).max(500).optional(),
      isNfc: z.boolean().optional(),
      nfcCategory: z.enum(['project_70', 'operating_30']).optional().nullable(),
      documentNumber: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { id, ...data } = input;
      
      const [entry] = await db.select().from(schema.entries).where(eq(schema.entries.id, id));
      if (!entry) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lançamento não encontrado' });
      
      const [period] = await db.select().from(schema.periods).where(eq(schema.periods.id, entry.periodId));
      if (period?.status === 'closed') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Período fechado' });
      
      const updateData: any = {};
      if (data.accountId) updateData.accountId = data.accountId;
      if (data.type) updateData.type = data.type;
      if (data.amountCents) updateData.amountCents = data.amountCents;
      if (data.transactionDate) updateData.transactionDate = new Date(data.transactionDate).toISOString().split('T')[0];
      if (data.description) updateData.description = data.description;
      if (data.isNfc !== undefined) updateData.isNfc = data.isNfc ? 1 : 0;
      if (data.nfcCategory !== undefined) updateData.nfcCategory = data.nfcCategory;
      if (data.documentNumber !== undefined) updateData.documentNumber = data.documentNumber;
      if (data.notes !== undefined) updateData.notes = data.notes;
      
      await db.update(schema.entries).set(updateData).where(eq(schema.entries.id, id));
      
      await db.insert(schema.auditLog).values({
        userId: ctx.user.id,
        entityType: 'entry',
        entityId: id,
        action: 'update',
        oldValues: entry,
        newValues: updateData,
      });
      
      return { success: true };
    }),

  delete: adminProcedure.input(z.number()).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    
    const [entry] = await db.select().from(schema.entries).where(eq(schema.entries.id, input));
    if (!entry) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lançamento não encontrado' });
    
    const [period] = await db.select().from(schema.periods).where(eq(schema.periods.id, entry.periodId));
    if (period?.status === 'closed') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Período fechado' });
    
    await db.delete(schema.entries).where(eq(schema.entries.id, input));
    
    await db.insert(schema.auditLog).values({
      userId: ctx.user.id,
      entityType: 'entry',
      entityId: input,
      action: 'delete',
      oldValues: entry,
    });
    
    return { success: true };
  }),

  getHistory: publicProcedure.input(z.number().optional()).query(async ({ input: months = 6 }) => {
    const db = await getDb();
    const periods = await db.select().from(schema.periods)
      .orderBy(desc(schema.periods.year), desc(schema.periods.month))
      .limit(months);
    
    const results = [];
    
    for (const period of periods.reverse()) {
      const entries = await db.select({
        entry: schema.entries,
        account: schema.accounts,
      })
        .from(schema.entries)
        .leftJoin(schema.accounts, eq(schema.entries.accountId, schema.accounts.id))
        .where(eq(schema.entries.periodId, period.id));
      
      let revenues = 0;
      let expenses = 0;
      
      for (const { entry, account } of entries) {
        if (account?.type === 'revenue') revenues += entry.amountCents;
        if (account?.type === 'expense' || account?.type === 'fixed_asset') expenses += entry.amountCents;
      }
      
      results.push({
        periodId: period.id,
        month: period.month,
        year: period.year,
        label: `${period.month}/${period.year}`,
        revenues,
        expenses,
        balance: revenues - expenses,
      });
    }
    
    return results;
  }),

  getByCategory: publicProcedure.input(z.number()).query(async ({ input: periodId }) => {
    const db = await getDb();
    
    const entries = await db.select({
      entry: schema.entries,
      account: schema.accounts,
    })
      .from(schema.entries)
      .leftJoin(schema.accounts, eq(schema.entries.accountId, schema.accounts.id))
      .where(eq(schema.entries.periodId, periodId));
    
    const byCategory: Record<string, { name: string; type: string; amount: number }> = {};
    
    for (const { entry, account } of entries) {
      if (!account) continue;
      const key = account.id.toString();
      if (!byCategory[key]) {
        byCategory[key] = { name: account.name, type: account.type, amount: 0 };
      }
      byCategory[key].amount += entry.amountCents;
    }
    
    return Object.values(byCategory).sort((a, b) => b.amount - a.amount);
  }),

  exportCSV: protectedProcedure
    .input(z.object({ periodId: z.number().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      const conditions = [];
      if (input.periodId) conditions.push(eq(schema.entries.periodId, input.periodId));
      
      let query = db.select({
        entry: schema.entries,
        account: schema.accounts,
        period: schema.periods,
      })
        .from(schema.entries)
        .leftJoin(schema.accounts, eq(schema.entries.accountId, schema.accounts.id))
        .leftJoin(schema.periods, eq(schema.entries.periodId, schema.periods.id));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      const entries = await query.orderBy(desc(schema.entries.transactionDate));
      
      // Build CSV
      const headers = ['Data', 'Período', 'Conta', 'Tipo', 'Descrição', 'Valor', 'NFC', 'Categoria NFC'];
      const rows = entries.map(({ entry, account, period }) => [
        entry.transactionDate ? new Date(entry.transactionDate).toLocaleDateString('pt-BR') : '',
        period ? `${period.month}/${period.year}` : '',
        account ? `${account.code} - ${account.name}` : '',
        entry.type === 'credit' ? 'Crédito' : 'Débito',
        entry.description.replace(/"/g, '""'),
        (entry.amountCents / 100).toFixed(2).replace('.', ','),
        entry.isNfc ? 'Sim' : 'Não',
        entry.nfcCategory === 'project_70' ? '70% Projeto' : entry.nfcCategory === 'operating_30' ? '30% Custeio' : '',
      ]);
      
      const csv = [headers.join(';'), ...rows.map(r => r.map(c => `"${c}"`).join(';'))].join('\n');
      
      return { csv, count: entries.length };
    }),

  getSummary: publicProcedure.input(z.number()).query(async ({ input: periodId }) => {
    const db = await getDb();
    
    const entries = await db.select({
      entry: schema.entries,
      account: schema.accounts,
    })
      .from(schema.entries)
      .leftJoin(schema.accounts, eq(schema.entries.accountId, schema.accounts.id))
      .where(eq(schema.entries.periodId, periodId));
    
    let revenues = 0;
    let expenses = 0;
    let nfcProject = 0;
    let nfcOperating = 0;
    
    for (const { entry, account } of entries) {
      if (account?.type === 'revenue') revenues += entry.amountCents;
      if (account?.type === 'expense' || account?.type === 'fixed_asset') expenses += entry.amountCents;
      if (entry.isNfc && entry.nfcCategory === 'project_70') nfcProject += entry.amountCents;
      if (entry.isNfc && entry.nfcCategory === 'operating_30') nfcOperating += entry.amountCents;
    }
    
    const nfcTotal = nfcProject + nfcOperating;
    
    return {
      revenues,
      expenses,
      balance: revenues - expenses,
      nfc: {
        project70: nfcProject,
        operating30: nfcOperating,
        total: nfcTotal,
        project70Percent: nfcTotal > 0 ? (nfcProject / nfcTotal) * 100 : 0,
        operating30Percent: nfcTotal > 0 ? (nfcOperating / nfcTotal) * 100 : 0,
        compliant: nfcTotal === 0 || (nfcProject / nfcTotal >= 0.65 && nfcProject / nfcTotal <= 0.75),
      },
    };
  }),
});

// ==================== ORGANIZATION ROUTER ====================
const organizationRouter = router({
  get: publicProcedure.query(async () => {
    const db = await getDb();
    const [org] = await db.select().from(schema.organizationSettings).limit(1);
    return org || null;
  }),

  update: adminProcedure
    .input(z.object({
      name: z.string().min(3).max(255),
      cnpj: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().max(2).optional(),
      zipCode: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      const [existing] = await db.select().from(schema.organizationSettings).limit(1);
      
      if (existing) {
        await db.update(schema.organizationSettings).set(input).where(eq(schema.organizationSettings.id, existing.id));
      } else {
        await db.insert(schema.organizationSettings).values(input);
      }
      
      return { success: true };
    }),
});

// ==================== CLASSIFICATION RULES ROUTER ====================
const rulesRouter = router({
  list: publicProcedure.query(async () => {
    const db = await getDb();
    return db.select({
      rule: schema.classificationRules,
      account: schema.accounts,
    })
      .from(schema.classificationRules)
      .leftJoin(schema.accounts, eq(schema.classificationRules.accountId, schema.accounts.id))
      .orderBy(desc(schema.classificationRules.usageCount));
  }),

  create: accountantProcedure
    .input(z.object({
      pattern: z.string().min(3).max(255),
      accountId: z.number(),
      priority: z.number().default(0),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const [result] = await db.insert(schema.classificationRules).values({
        ...input,
        createdBy: ctx.user.id,
      }).returning({ id: schema.classificationRules.id });
      return { id: result.id };
    }),

  delete: accountantProcedure.input(z.number()).mutation(async ({ input }) => {
    const db = await getDb();
    await db.delete(schema.classificationRules).where(eq(schema.classificationRules.id, input));
    return { success: true };
  }),
});

// ==================== BANK IMPORTS ROUTER ====================
import { parseStatement, type ParsedTransaction } from './parsers';
import { classifyTransaction, detectDuplicates } from './services/classification';

// In-memory store for pending import transactions (in production, use Redis or DB)
const pendingImports = new Map<number, { transactions: Array<ParsedTransaction & { suggestedAccountId: number | null; confidence: string; isDuplicate: boolean; selected: boolean }> }>();

const bankImportsRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    return db.select().from(schema.bankImports).orderBy(desc(schema.bankImports.uploadedAt));
  }),

  upload: accountantProcedure
    .input(z.object({
      filename: z.string(),
      fileType: z.enum(['csv', 'ofx', 'txt']),
      fileContent: z.string(), // base64 encoded
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      const [result] = await db.insert(schema.bankImports).values({
        filename: input.filename,
        bank: 'other',
        fileType: input.fileType,
        status: 'pending',
        uploadedBy: ctx.user.id,
      }).returning({ id: schema.bankImports.id });
      
      return { id: result.id, filename: input.filename };
    }),

  process: accountantProcedure
    .input(z.object({
      importId: z.number(),
      fileContent: z.string(), // base64 encoded
      fileType: z.enum(['csv', 'ofx', 'txt']),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const buffer = Buffer.from(input.fileContent, 'base64');
      
      await db.update(schema.bankImports)
        .set({ status: 'processing' })
        .where(eq(schema.bankImports.id, input.importId));
      
      try {
        const parsed = await parseStatement(buffer, input.fileType);
        
        // Get current period
        const now = new Date();
        const [period] = await db.select().from(schema.periods)
          .where(and(eq(schema.periods.month, now.getMonth() + 1), eq(schema.periods.year, now.getFullYear())));
        
        const periodId = period?.id || 0;
        const duplicateIndexes = periodId ? await detectDuplicates(parsed.transactions, periodId) : new Set<number>();
        
        // Classify each transaction
        const classifiedTxs = await Promise.all(
          parsed.transactions.map(async (tx, idx) => {
            const classification = await classifyTransaction(tx);
            return {
              ...tx,
              suggestedAccountId: classification.accountId,
              confidence: classification.confidence,
              isDuplicate: duplicateIndexes.has(idx),
              selected: !duplicateIndexes.has(idx),
            };
          })
        );
        
        // Store in memory for later confirmation
        pendingImports.set(input.importId, { transactions: classifiedTxs });
        
        await db.update(schema.bankImports).set({
          status: 'completed',
          totalTransactions: classifiedTxs.length,
          classifiedCount: classifiedTxs.filter(t => t.suggestedAccountId).length,
          startDate: parsed.startDate?.toISOString().split('T')[0],
          endDate: parsed.endDate?.toISOString().split('T')[0],
        }).where(eq(schema.bankImports.id, input.importId));
        
        return {
          transactions: classifiedTxs.map((tx, idx) => ({
            index: idx,
            date: tx.date.toISOString(),
            description: tx.description,
            amountCents: tx.amountCents,
            type: tx.type,
            suggestedAccountId: tx.suggestedAccountId,
            confidence: tx.confidence,
            isDuplicate: tx.isDuplicate,
            selected: tx.selected,
          })),
          totalCount: classifiedTxs.length,
          duplicateCount: duplicateIndexes.size,
          classifiedCount: classifiedTxs.filter(t => t.suggestedAccountId).length,
        };
      } catch (error: any) {
        await db.update(schema.bankImports).set({
          status: 'failed',
          errorMessage: error.message,
        }).where(eq(schema.bankImports.id, input.importId));
        
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Erro ao processar arquivo: ${error.message}` });
      }
    }),

  confirm: accountantProcedure
    .input(z.object({
      importId: z.number(),
      periodId: z.number(),
      transactions: z.array(z.object({
        index: z.number(),
        accountId: z.number(),
        isNfc: z.boolean().default(false),
        nfcCategory: z.enum(['project_70', 'operating_30']).optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const pending = pendingImports.get(input.importId);
      
      if (!pending) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Importação não encontrada ou expirada' });
      }
      
      const [period] = await db.select().from(schema.periods).where(eq(schema.periods.id, input.periodId));
      if (!period) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Período não encontrado' });
      if (period.status === 'closed') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Período fechado' });
      
      let created = 0;
      
      for (const txInput of input.transactions) {
        const tx = pending.transactions[txInput.index];
        if (!tx) continue;
        
        await db.insert(schema.entries).values({
          periodId: input.periodId,
          accountId: txInput.accountId,
          type: tx.type,
          amountCents: tx.amountCents,
          transactionDate: tx.date.toISOString().split('T')[0],
          description: tx.description,
          origin: 'bank_import',
          bankImportId: input.importId,
          isNfc: txInput.isNfc ? 1 : 0,
          nfcCategory: txInput.nfcCategory,
          createdBy: ctx.user.id,
        });
        
        created++;
      }
      
      // Clean up pending import
      pendingImports.delete(input.importId);
      
      await db.insert(schema.auditLog).values({
        userId: ctx.user.id,
        entityType: 'import',
        entityId: input.importId,
        action: 'create',
        newValues: { entriesCreated: created },
      });
      
      return { success: true, entriesCreated: created };
    }),

  delete: adminProcedure.input(z.number()).mutation(async ({ input }) => {
    const db = await getDb();
    await db.delete(schema.bankImports).where(eq(schema.bankImports.id, input));
    pendingImports.delete(input);
    return { success: true };
  }),
});

// ==================== REPORTS ROUTER ====================
import { generateFinancialReportPDF, generateNfcReportPDF, generateBalancetePDF, generateDREPDF, generateBalancoPatrimonialPDF } from './services/reports';

const reportsRouter = router({
  generateFinancial: protectedProcedure.input(z.number()).mutation(async ({ input }) => {
    const pdf = await generateFinancialReportPDF(input);
    return { pdf: pdf.toString('base64') };
  }),

  generateNfc: protectedProcedure.input(z.number()).mutation(async ({ input }) => {
    const pdf = await generateNfcReportPDF(input);
    return { pdf: pdf.toString('base64') };
  }),

  generateBalancete: protectedProcedure.input(z.number()).mutation(async ({ input }) => {
    const pdf = await generateBalancetePDF(input);
    return { pdf: pdf.toString('base64') };
  }),

  generateDRE: protectedProcedure.input(z.number()).mutation(async ({ input }) => {
    const pdf = await generateDREPDF(input);
    return { pdf: pdf.toString('base64') };
  }),

  generateBalancoPatrimonial: protectedProcedure.input(z.number()).mutation(async ({ input }) => {
    const pdf = await generateBalancoPatrimonialPDF(input);
    return { pdf: pdf.toString('base64') };
  }),
});

// ==================== AUDIT ROUTER ====================
const auditRouter = router({
  list: adminProcedure
    .input(z.object({
      entityType: z.enum(['entry', 'account', 'period', 'import', 'rule', 'setting']).optional(),
      userId: z.number().optional(),
      page: z.number().default(1),
      limit: z.number().min(1).max(100).default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const page = input?.page || 1;
      const limit = input?.limit || 50;
      const offset = (page - 1) * limit;

      const conditions = [];
      if (input?.entityType) conditions.push(eq(schema.auditLog.entityType, input.entityType));
      if (input?.userId) conditions.push(eq(schema.auditLog.userId, input.userId));

      let query = db.select({
        log: schema.auditLog,
        user: schema.users,
      })
        .from(schema.auditLog)
        .leftJoin(schema.users, eq(schema.auditLog.userId, schema.users.id));

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const logs = await query.orderBy(desc(schema.auditLog.createdAt)).limit(limit).offset(offset);

      return logs.map((l) => ({ ...l.log, user: l.user }));
    }),
});

// ==================== MAIN ROUTER ====================
export const appRouter = router({
  accounts: accountsRouter,
  periods: periodsRouter,
  entries: entriesRouter,
  organization: organizationRouter,
  rules: rulesRouter,
  reports: reportsRouter,
  audit: auditRouter,
  bankImports: bankImportsRouter,
});

export type AppRouter = typeof appRouter;

