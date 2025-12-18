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

// ==================== PESSOAS ROUTER ====================
const pessoasRouter = router({
  list: publicProcedure
    .input(z.object({
      tipo: z.enum(['fisica', 'juridica']).optional(),
      apenasAssociados: z.boolean().optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().min(1).max(100).default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const page = input?.page || 1;
      const limit = input?.limit || 50;
      const offset = (page - 1) * limit;

      // Query with joins and titulo count
      const results = await db.execute(sql`
        SELECT 
          p.id, p.tipo, p.nome, p.nome_fantasia, p.ativo, p.observacoes, 
          p.created_at, p.updated_at,
          a.id as associado_id, a.numero_registro, a.data_admissao, a.status as associado_status, 
          a.categoria, a.valor_contribuicao_sugerido, a.periodicidade, a.isento, a.dia_vencimento,
          COALESCE(tc.total_contribuicoes, 0) as total_contribuicoes,
          COALESCE(tc.valor_total, 0) as valor_total
        FROM pessoa p
        LEFT JOIN associado a ON a.pessoa_id = p.id
        LEFT JOIN (
          SELECT pessoa_id, COUNT(*) as total_contribuicoes, SUM(CAST(valor_liquido AS NUMERIC)) as valor_total
          FROM titulo WHERE deleted_at IS NULL AND tipo = 'receber'
          GROUP BY pessoa_id
        ) tc ON tc.pessoa_id = p.id
        WHERE p.deleted_at IS NULL
          ${input?.tipo ? sql`AND p.tipo = ${input.tipo}` : sql``}
          ${input?.apenasAssociados ? sql`AND a.id IS NOT NULL` : sql``}
          ${input?.search ? sql`AND p.nome ILIKE ${'%' + input.search + '%'}` : sql``}
        ORDER BY p.nome ASC
        LIMIT ${limit} OFFSET ${offset}
      `);

      const [countResult] = await db.select({ count: sql<number>`count(*)` })
        .from(schema.pessoa)
        .leftJoin(schema.associado, eq(schema.associado.pessoaId, schema.pessoa.id))
        .where(
          and(
            isNull(schema.pessoa.deletedAt),
            input?.tipo ? eq(schema.pessoa.tipo, input.tipo) : undefined,
            input?.apenasAssociados ? sql`${schema.associado.id} IS NOT NULL` : undefined,
            input?.search ? like(schema.pessoa.nome, `%${input.search}%`) : undefined,
          )
        );

      return {
        pessoas: results.rows.map((r: any) => ({
          id: r.id,
          tipo: r.tipo,
          nome: r.nome,
          nomeFantasia: r.nome_fantasia,
          ativo: r.ativo,
          observacoes: r.observacoes,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          isAssociado: !!r.associado_id,
          associado: r.associado_id ? {
            id: r.associado_id,
            numeroRegistro: r.numero_registro,
            dataAdmissao: r.data_admissao,
            status: r.associado_status,
            categoria: r.categoria,
            valorContribuicaoSugerido: r.valor_contribuicao_sugerido,
            periodicidade: r.periodicidade,
            isento: r.isento,
            diaVencimento: r.dia_vencimento,
          } : null,
          totalContribuicoes: Number(r.total_contribuicoes),
          valorTotal: parseFloat(r.valor_total) || 0,
        })),
        total: countResult.count,
        page,
        pages: Math.ceil(countResult.count / limit),
      };
    }),

  getById: publicProcedure.input(z.string().uuid()).query(async ({ input }) => {
    const db = await getDb();
    const [result] = await db.select({
      pessoa: schema.pessoa,
      associado: schema.associado,
    })
      .from(schema.pessoa)
      .leftJoin(schema.associado, eq(schema.associado.pessoaId, schema.pessoa.id))
      .where(eq(schema.pessoa.id, input));

    if (!result) throw new TRPCError({ code: 'NOT_FOUND', message: 'Pessoa não encontrada' });
    return { ...result.pessoa, associado: result.associado, isAssociado: !!result.associado };
  }),

  stats: publicProcedure.query(async () => {
    const db = await getDb();
    
    // Total de pessoas ativas (não deletadas)
    const [totalResult] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.pessoa)
      .where(isNull(schema.pessoa.deletedAt));
    
    // Total de associados (pessoas que têm registro na tabela associado)
    const [assocResult] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.associado)
      .innerJoin(schema.pessoa, eq(schema.associado.pessoaId, schema.pessoa.id))
      .where(isNull(schema.pessoa.deletedAt));
    
    const total = Number(totalResult.count) || 0;
    const associados = Number(assocResult.count) || 0;
    
    return {
      total,
      associados,
      naoAssociados: total - associados,
    };
  }),

  duplicates: publicProcedure.query(async () => {
    const db = await getDb();
    // Find duplicates by normalized name (uppercase, trimmed)
    const duplicates = await db.execute(sql`
      SELECT UPPER(TRIM(nome)) as nome_normalizado, 
             COUNT(*) as count,
             ARRAY_AGG(id) as ids,
             ARRAY_AGG(nome) as nomes
      FROM pessoa 
      WHERE deleted_at IS NULL
      GROUP BY UPPER(TRIM(nome))
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
    `);
    return duplicates.rows.map((row: any) => ({
      nomeNormalizado: row.nome_normalizado,
      count: Number(row.count),
      ids: row.ids,
      nomes: row.nomes,
    }));
  }),

  topDoadores: publicProcedure.input(z.number().default(10)).query(async ({ input: limite }) => {
    const db = await getDb();
    const topDoadores = await db.execute(sql`
      SELECT p.id, p.nome, p.tipo,
             COUNT(t.id) as total_contribuicoes,
             COALESCE(SUM(CAST(t.valor_liquido AS NUMERIC)), 0) as valor_total
      FROM pessoa p
      INNER JOIN titulo t ON t.pessoa_id = p.id
      WHERE p.deleted_at IS NULL
        AND t.deleted_at IS NULL
        AND t.tipo = 'receber'
      GROUP BY p.id, p.nome, p.tipo
      HAVING COUNT(t.id) > 1
      ORDER BY SUM(CAST(t.valor_liquido AS NUMERIC)) DESC, COUNT(t.id) DESC
      LIMIT ${limite}
    `);
    return topDoadores.rows.map((row: any) => ({
      id: row.id,
      nome: row.nome,
      tipo: row.tipo,
      totalContribuicoes: Number(row.total_contribuicoes),
      valorTotal: parseFloat(row.valor_total),
    }));
  }),

  historico: publicProcedure.input(z.string().uuid()).query(async ({ input: pessoaId }) => {
    const db = await getDb();
    
    const statsResult = await db.execute(sql`
      SELECT COUNT(*) as total, COALESCE(SUM(CAST(valor_liquido AS NUMERIC)), 0) as valor_total
      FROM titulo WHERE pessoa_id = ${pessoaId} AND deleted_at IS NULL AND tipo = 'receber'
    `);
    
    const porMes = await db.execute(sql`
      SELECT TO_CHAR(data_competencia, 'MM/YYYY') as mes, 
             SUM(CAST(valor_liquido AS NUMERIC)) as total
      FROM titulo 
      WHERE pessoa_id = ${pessoaId} AND deleted_at IS NULL AND tipo = 'receber'
      GROUP BY TO_CHAR(data_competencia, 'MM/YYYY'), DATE_TRUNC('month', data_competencia)
      ORDER BY DATE_TRUNC('month', data_competencia) DESC
      LIMIT 12
    `);
    
    const doacoes = await db.execute(sql`
      SELECT id, valor_liquido, data_competencia, descricao, natureza
      FROM titulo 
      WHERE pessoa_id = ${pessoaId} AND deleted_at IS NULL AND tipo = 'receber'
      ORDER BY data_competencia DESC
      LIMIT 20
    `);
    
    const total = Number(statsResult.rows[0]?.total) || 0;
    const valorTotal = parseFloat(statsResult.rows[0]?.valor_total as string) || 0;
    
    return {
      stats: { totalDoacoes: total, valorTotal, mediaDoacao: total > 0 ? valorTotal / total : 0 },
      porMes: porMes.rows.reverse().map((r: any) => ({ mes: r.mes, total: parseFloat(r.total) })),
      doacoes: doacoes.rows.map((r: any) => ({
        id: r.id, valor: parseFloat(r.valor_liquido), dataCompetencia: r.data_competencia,
        descricao: r.descricao, natureza: r.natureza
      })),
    };
  }),

  create: protectedProcedure
    .input(z.object({
      nome: z.string().min(2).max(255),
      tipo: z.enum(['fisica', 'juridica']).default('fisica'),
      cpfCnpj: z.string().optional(),
      email: z.string().email().optional(),
      telefone: z.string().optional(),
      observacoes: z.string().optional(),
      tornarAssociado: z.boolean().default(false),
      categoria: z.enum(['trabalhador', 'frequentador', 'benemerito', 'honorario']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      const [newPessoa] = await db.insert(schema.pessoa).values({
        nome: input.nome.trim(),
        tipo: input.tipo,
        observacoes: input.observacoes || null,
        createdBy: ctx.user.id,
      }).returning({ id: schema.pessoa.id });
      
      if (input.cpfCnpj) {
        await db.insert(schema.pessoaDocumento).values({
          pessoaId: newPessoa.id,
          tipo: input.tipo === 'fisica' ? 'cpf' : 'cnpj',
          numero: input.cpfCnpj.replace(/\D/g, ''),
        });
      }
      
      if (input.tornarAssociado && input.categoria) {
        await db.insert(schema.associado).values({
          pessoaId: newPessoa.id,
          categoria: input.categoria,
          dataAdmissao: new Date().toISOString().split('T')[0],
          status: 'ativo',
        });
      }
      
      return { id: newPessoa.id };
    }),

  // Busca pessoa existente por nome normalizado ou CPF, retorna null se não encontrar
  findByNameOrCpf: publicProcedure
    .input(z.object({ nome: z.string(), cpf: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      // Primeiro, busca por CPF se fornecido
      if (input.cpf) {
        const cpfNormalizado = input.cpf.replace(/\D/g, '');
        const [byCpf] = await db.execute(sql`
          SELECT p.id, p.nome FROM pessoa p
          INNER JOIN pessoa_documento pd ON pd.pessoa_id = p.id
          WHERE pd.tipo = 'cpf' AND pd.numero = ${cpfNormalizado}
            AND p.deleted_at IS NULL
          LIMIT 1
        `);
        if (byCpf) return { id: (byCpf as any).id, nome: (byCpf as any).nome, matchType: 'cpf' };
      }
      
      // Depois, busca por nome normalizado
      const nomeNorm = input.nome.trim().toUpperCase();
      const [byNome] = await db.execute(sql`
        SELECT id, nome FROM pessoa 
        WHERE UPPER(TRIM(nome)) = ${nomeNorm} AND deleted_at IS NULL
        LIMIT 1
      `);
      if (byNome) return { id: (byNome as any).id, nome: (byNome as any).nome, matchType: 'nome' };
      
      return null;
    }),

  // Cria pessoa apenas se não existir duplicata, senão retorna a existente
  findOrCreate: protectedProcedure
    .input(z.object({
      nome: z.string().min(2),
      tipo: z.enum(['fisica', 'juridica']).default('fisica'),
      cpf: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const nomeNorm = input.nome.trim().toUpperCase();
      
      // Verifica CPF primeiro
      if (input.cpf) {
        const cpfNorm = input.cpf.replace(/\D/g, '');
        const existingByCpf = await db.execute(sql`
          SELECT p.id, p.nome FROM pessoa p
          INNER JOIN pessoa_documento pd ON pd.pessoa_id = p.id
          WHERE pd.tipo = 'cpf' AND pd.numero = ${cpfNorm} AND p.deleted_at IS NULL
          LIMIT 1
        `);
        if (existingByCpf.rows.length > 0) {
          return { id: (existingByCpf.rows[0] as any).id, created: false, matchType: 'cpf' };
        }
      }
      
      // Verifica nome
      const existingByNome = await db.execute(sql`
        SELECT id, nome FROM pessoa 
        WHERE UPPER(TRIM(nome)) = ${nomeNorm} AND deleted_at IS NULL
        LIMIT 1
      `);
      if (existingByNome.rows.length > 0) {
        return { id: (existingByNome.rows[0] as any).id, created: false, matchType: 'nome' };
      }
      
      // Cria nova pessoa
      const [newPessoa] = await db.insert(schema.pessoa).values({
        nome: input.nome.trim(),
        tipo: input.tipo,
        createdBy: ctx.user.id,
      }).returning({ id: schema.pessoa.id });
      
      // Se CPF fornecido, cria documento
      if (input.cpf) {
        await db.insert(schema.pessoaDocumento).values({
          pessoaId: newPessoa.id,
          tipo: 'cpf',
          numero: input.cpf.replace(/\D/g, ''),
        });
      }
      
      return { id: newPessoa.id, created: true, matchType: null };
    }),
});

// ==================== TÍTULOS ROUTER ====================
const titulosRouter = router({
  list: publicProcedure
    .input(z.object({
      tipo: z.enum(['pagar', 'receber']).optional(),
      status: z.enum(['rascunho', 'pendente_aprovacao', 'aprovado', 'parcial', 'quitado', 'cancelado', 'vencido']).optional(),
      mesAno: z.string().optional(), // formato: "2025-11"
      search: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().min(1).max(100).default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const page = input?.page || 1;
      const limit = input?.limit || 50;
      const offset = (page - 1) * limit;

      const conditions = [isNull(schema.titulo.deletedAt)];
      if (input?.tipo) conditions.push(eq(schema.titulo.tipo, input.tipo));
      if (input?.status) conditions.push(eq(schema.titulo.status, input.status));
      if (input?.mesAno) {
        const [ano, mes] = input.mesAno.split('-').map(Number);
        const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
        const ultimoDia = new Date(ano, mes, 0).getDate();
        const fim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
        conditions.push(between(schema.titulo.dataCompetencia, inicio, fim));
      }

      const results = await db.select({
        titulo: schema.titulo,
        pessoa: schema.pessoa,
      })
        .from(schema.titulo)
        .leftJoin(schema.pessoa, eq(schema.titulo.pessoaId, schema.pessoa.id))
        .where(and(...conditions))
        .orderBy(desc(schema.titulo.dataEmissao))
        .limit(limit)
        .offset(offset);

      const [countResult] = await db.select({ count: sql<number>`count(*)` })
        .from(schema.titulo)
        .where(and(...conditions));

      // Somar totais
      const [totais] = await db.select({
        totalReceber: sql<number>`COALESCE(SUM(CASE WHEN tipo = 'receber' THEN valor_liquido::numeric ELSE 0 END), 0)`,
        totalPagar: sql<number>`COALESCE(SUM(CASE WHEN tipo = 'pagar' THEN valor_liquido::numeric ELSE 0 END), 0)`,
      })
        .from(schema.titulo)
        .where(and(...conditions));

      return {
        titulos: results.map(r => ({ ...r.titulo, pessoa: r.pessoa })),
        total: countResult.count,
        page,
        pages: Math.ceil(countResult.count / limit),
        totalReceber: Number(totais.totalReceber),
        totalPagar: Number(totais.totalPagar),
      };
    }),

  stats: publicProcedure.query(async () => {
    const db = await getDb();
    const [stats] = await db.select({
      total: sql<number>`count(*)`,
      totalReceber: sql<number>`COALESCE(SUM(CASE WHEN tipo = 'receber' THEN valor_liquido::numeric ELSE 0 END), 0)`,
      totalPagar: sql<number>`COALESCE(SUM(CASE WHEN tipo = 'pagar' THEN valor_liquido::numeric ELSE 0 END), 0)`,
      quitados: sql<number>`count(*) FILTER (WHERE status = 'quitado')`,
      pendentes: sql<number>`count(*) FILTER (WHERE status IN ('pendente_aprovacao', 'aprovado', 'parcial'))`,
    })
      .from(schema.titulo)
      .where(isNull(schema.titulo.deletedAt));

    return {
      total: stats.total,
      totalReceber: Number(stats.totalReceber),
      totalPagar: Number(stats.totalPagar),
      saldo: Number(stats.totalReceber) - Number(stats.totalPagar),
      quitados: stats.quitados,
      pendentes: stats.pendentes,
    };
  }),

  byMonth: publicProcedure.input(z.number().optional()).query(async ({ input: meses = 12 }) => {
    const db = await getDb();
    const results = await db.select({
      mes: sql<string>`TO_CHAR(data_competencia::date, 'YYYY-MM')`,
      receitas: sql<number>`COALESCE(SUM(CASE WHEN tipo = 'receber' THEN valor_liquido::numeric ELSE 0 END), 0)`,
      despesas: sql<number>`COALESCE(SUM(CASE WHEN tipo = 'pagar' THEN valor_liquido::numeric ELSE 0 END), 0)`,
    })
      .from(schema.titulo)
      .where(isNull(schema.titulo.deletedAt))
      .groupBy(sql`TO_CHAR(data_competencia::date, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(data_competencia::date, 'YYYY-MM')`)
      .limit(meses);

    return results.map(r => ({
      mes: r.mes,
      receitas: Number(r.receitas),
      despesas: Number(r.despesas),
      saldo: Number(r.receitas) - Number(r.despesas),
    }));
  }),
});

// ==================== CONTAS FINANCEIRAS ROUTER ====================
const contasFinanceirasRouter = router({
  list: publicProcedure.query(async () => {
    const db = await getDb();
    const contas = await db.select().from(schema.contaFinanceira).where(eq(schema.contaFinanceira.ativo, true)).orderBy(asc(schema.contaFinanceira.nome));

    // Calcular saldo de cada conta
    const contasComSaldo = await Promise.all(contas.map(async (conta) => {
      // Saldo das baixas
      const [baixas] = await db.select({
        entradas: sql<number>`COALESCE(SUM(CASE WHEN ${schema.titulo.tipo} = 'receber' THEN valor_pago::numeric ELSE 0 END), 0)`,
        saidas: sql<number>`COALESCE(SUM(CASE WHEN ${schema.titulo.tipo} = 'pagar' THEN valor_pago::numeric ELSE 0 END), 0)`,
      })
        .from(schema.tituloBaixa)
        .leftJoin(schema.titulo, eq(schema.tituloBaixa.tituloId, schema.titulo.id))
        .where(eq(schema.tituloBaixa.contaFinanceiraId, conta.id));

      const saldoInicial = Number(conta.saldoInicial) || 0;
      const entradas = Number(baixas.entradas) || 0;
      const saidas = Number(baixas.saidas) || 0;
      const saldoAtual = saldoInicial + entradas - saidas;

      return { ...conta, saldoAtual, entradas, saidas };
    }));

    return contasComSaldo;
  }),

  stats: publicProcedure.query(async () => {
    const db = await getDb();
    const [count] = await db.select({ count: sql<number>`count(*)` }).from(schema.contaFinanceira).where(eq(schema.contaFinanceira.ativo, true));

    const contas = await db.select().from(schema.contaFinanceira).where(eq(schema.contaFinanceira.ativo, true));

    let saldoTotal = 0;
    for (const conta of contas) {
      const [baixas] = await db.select({
        entradas: sql<number>`COALESCE(SUM(CASE WHEN ${schema.titulo.tipo} = 'receber' THEN valor_pago::numeric ELSE 0 END), 0)`,
        saidas: sql<number>`COALESCE(SUM(CASE WHEN ${schema.titulo.tipo} = 'pagar' THEN valor_pago::numeric ELSE 0 END), 0)`,
      })
        .from(schema.tituloBaixa)
        .leftJoin(schema.titulo, eq(schema.tituloBaixa.tituloId, schema.titulo.id))
        .where(eq(schema.tituloBaixa.contaFinanceiraId, conta.id));

      saldoTotal += Number(conta.saldoInicial) + Number(baixas.entradas) - Number(baixas.saidas);
    }

    return { total: count.count, saldoTotal };
  }),
});

// ==================== PERÍODOS CONTÁBEIS ROUTER (NOVO SCHEMA) ====================
const periodosContabeisRouter = router({
  list: publicProcedure.query(async () => {
    const db = await getDb();
    return db.select().from(schema.periodoContabil).orderBy(desc(schema.periodoContabil.ano), desc(schema.periodoContabil.mes));
  }),

  stats: publicProcedure.query(async () => {
    const db = await getDb();
    const [count] = await db.select({ count: sql<number>`count(*)` }).from(schema.periodoContabil);
    const [abertos] = await db.select({ count: sql<number>`count(*)` }).from(schema.periodoContabil).where(eq(schema.periodoContabil.status, 'aberto'));
    return { total: count.count, abertos: abertos.count };
  }),
});

// ==================== EXTRATOS ROUTER ====================
const extratosRouter = router({
  list: publicProcedure.query(async () => {
    const db = await getDb();
    return db.select({
      extrato: schema.extratoBancario,
      conta: schema.contaFinanceira,
    })
      .from(schema.extratoBancario)
      .leftJoin(schema.contaFinanceira, eq(schema.extratoBancario.contaFinanceiraId, schema.contaFinanceira.id))
      .orderBy(desc(schema.extratoBancario.importadoEm));
  }),

  linhas: publicProcedure
    .input(z.object({ extratoId: z.string().uuid().optional(), status: z.enum(['pendente', 'conciliado', 'ignorado', 'duplicado']).optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions = [];
      if (input?.extratoId) conditions.push(eq(schema.extratoLinha.extratoId, input.extratoId));
      if (input?.status) conditions.push(eq(schema.extratoLinha.status, input.status));

      const linhas = await db.select()
        .from(schema.extratoLinha)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(schema.extratoLinha.dataMovimento));

      return linhas;
    }),

  stats: publicProcedure.query(async () => {
    const db = await getDb();
    const [extratos] = await db.select({ count: sql<number>`count(*)` }).from(schema.extratoBancario);
    const [linhas] = await db.select({ count: sql<number>`count(*)` }).from(schema.extratoLinha);
    const [pendentes] = await db.select({ count: sql<number>`count(*)` }).from(schema.extratoLinha).where(eq(schema.extratoLinha.status, 'pendente'));
    return { extratos: extratos.count, linhas: linhas.count, pendentes: pendentes.count };
  }),
});

// ==================== DASHBOARD ROUTER (ENHANCED) ====================
const dashboardRouter = router({
  // KPIs básicos mantidos para compatibilidade
  kpis: publicProcedure.query(async () => {
    const db = await getDb();

    const [pessoas] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.pessoa)
      .where(isNull(schema.pessoa.deletedAt));
    
    const [associados] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.associado)
      .innerJoin(schema.pessoa, eq(schema.associado.pessoaId, schema.pessoa.id))
      .where(isNull(schema.pessoa.deletedAt));

    const [titulos] = await db.select({
      total: sql<number>`count(*)`,
      receitas: sql<number>`COALESCE(SUM(CASE WHEN tipo = 'receber' THEN valor_liquido::numeric ELSE 0 END), 0)`,
      despesas: sql<number>`COALESCE(SUM(CASE WHEN tipo = 'pagar' THEN valor_liquido::numeric ELSE 0 END), 0)`,
    }).from(schema.titulo).where(isNull(schema.titulo.deletedAt));

    const contas = await db.select().from(schema.contaFinanceira).where(eq(schema.contaFinanceira.ativo, true));
    let saldoTotal = 0;
    for (const conta of contas) {
      const [baixas] = await db.select({
        entradas: sql<number>`COALESCE(SUM(CASE WHEN ${schema.titulo.tipo} = 'receber' THEN valor_pago::numeric ELSE 0 END), 0)`,
        saidas: sql<number>`COALESCE(SUM(CASE WHEN ${schema.titulo.tipo} = 'pagar' THEN valor_pago::numeric ELSE 0 END), 0)`,
      })
        .from(schema.tituloBaixa)
        .leftJoin(schema.titulo, eq(schema.tituloBaixa.tituloId, schema.titulo.id))
        .where(eq(schema.tituloBaixa.contaFinanceiraId, conta.id));
      saldoTotal += Number(conta.saldoInicial) + Number(baixas.entradas) - Number(baixas.saidas);
    }

    const [periodos] = await db.select({ count: sql<number>`count(*)` }).from(schema.periodoContabil);
    const [pendentes] = await db.select({ count: sql<number>`count(*)` }).from(schema.extratoLinha).where(eq(schema.extratoLinha.status, 'pendente'));

    return {
      pessoas: pessoas.count,
      associados: associados.count,
      naoAssociados: pessoas.count - associados.count,
      contasFinanceiras: contas.length,
      saldoTotal,
      lancamentos: titulos.total,
      receitas: Number(titulos.receitas),
      despesas: Number(titulos.despesas),
      resultado: Number(titulos.receitas) - Number(titulos.despesas),
      periodos: periodos.count,
      extratosPendentes: pendentes.count,
    };
  }),

  // KPIs aprimorados com variação percentual mês a mês
  kpisEnhanced: publicProcedure.query(async () => {
    const db = await getDb();
    
    // Buscar o último mês com dados ao invés de usar mês calendário atual
    const [ultimoMesComDados] = await db.select({
      mes: sql<string>`TO_CHAR(data_competencia::date, 'YYYY-MM')`,
    })
      .from(schema.titulo)
      .where(isNull(schema.titulo.deletedAt))
      .orderBy(sql`data_competencia DESC`)
      .limit(1);
    
    const mesAtual = ultimoMesComDados?.mes || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    
    // Calcular mês anterior baseado no último mês com dados
    const [ano, mes] = mesAtual.split('-').map(Number);
    const mesAnterior = mes === 1 
      ? `${ano - 1}-12` 
      : `${ano}-${String(mes - 1).padStart(2, '0')}`;

    // Função helper para calcular totais por mês
    const getTotaisMes = async (mesAno: string) => {
      const [anoNum, mesNum] = mesAno.split('-').map(Number);
      const inicio = `${anoNum}-${String(mesNum).padStart(2, '0')}-01`;
      // Calcular último dia do mês corretamente (0 = último dia do mês anterior ao próximo mês)
      const ultimoDia = new Date(anoNum, mesNum, 0).getDate();
      const fim = `${anoNum}-${String(mesNum).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
      
      const [result] = await db.select({
        receitas: sql<number>`COALESCE(SUM(CASE WHEN tipo = 'receber' THEN valor_liquido::numeric ELSE 0 END), 0)`,
        despesas: sql<number>`COALESCE(SUM(CASE WHEN tipo = 'pagar' THEN valor_liquido::numeric ELSE 0 END), 0)`,
      })
        .from(schema.titulo)
        .where(and(
          isNull(schema.titulo.deletedAt),
          between(schema.titulo.dataCompetencia, inicio, fim)
        ));
      
      return {
        receitas: Number(result.receitas) || 0,
        despesas: Number(result.despesas) || 0,
        resultado: (Number(result.receitas) || 0) - (Number(result.despesas) || 0),
      };
    };

    const atual = await getTotaisMes(mesAtual);
    const anterior = await getTotaisMes(mesAnterior);

    // Calcular variações percentuais
    const calcVariacao = (valorAtual: number, valorAnterior: number) => {
      if (valorAnterior === 0) return valorAtual > 0 ? 100 : 0;
      return ((valorAtual - valorAnterior) / valorAnterior) * 100;
    };

    // Totais gerais (todos os meses)
    const [totaisGerais] = await db.select({
      receitas: sql<number>`COALESCE(SUM(CASE WHEN tipo = 'receber' THEN valor_liquido::numeric ELSE 0 END), 0)`,
      despesas: sql<number>`COALESCE(SUM(CASE WHEN tipo = 'pagar' THEN valor_liquido::numeric ELSE 0 END), 0)`,
    }).from(schema.titulo).where(isNull(schema.titulo.deletedAt));

    const receitasTotal = Number(totaisGerais.receitas) || 0;
    const despesasTotal = Number(totaisGerais.despesas) || 0;

    // Saldo consolidado: receitas - despesas (saldo real baseado em títulos)
    const saldoConsolidado = receitasTotal - despesasTotal;

    // Contagens
    const [pessoas] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.pessoa).where(isNull(schema.pessoa.deletedAt));
    const [associados] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.associado)
      .innerJoin(schema.pessoa, eq(schema.associado.pessoaId, schema.pessoa.id))
      .where(isNull(schema.pessoa.deletedAt));
    
    // Contas financeiras ativas
    const contas = await db.select().from(schema.contaFinanceira).where(eq(schema.contaFinanceira.ativo, true));

    return {
      mesAtual,
      saldoConsolidado,
      receitasMes: atual.receitas,
      receitasVariacao: calcVariacao(atual.receitas, anterior.receitas),
      despesasMes: atual.despesas,
      despesasVariacao: calcVariacao(atual.despesas, anterior.despesas),
      resultadoMes: atual.resultado,
      resultadoVariacao: calcVariacao(atual.resultado, anterior.resultado),
      receitasTotal,
      despesasTotal,
      resultadoTotal: receitasTotal - despesasTotal,
      totalPessoas: Number(pessoas.count) || 0,
      totalAssociados: Number(associados.count) || 0,
      totalNaoAssociados: (Number(pessoas.count) || 0) - (Number(associados.count) || 0),
      contasAtivas: contas.length,
    };
  }),

  // Fluxo de caixa mensal (últimos 12 meses)
  fluxoCaixa: publicProcedure.input(z.number().default(12)).query(async ({ input: meses }) => {
    const db = await getDb();
    
    const results = await db.select({
      mes: sql<string>`TO_CHAR(data_competencia::date, 'YYYY-MM')`,
      receitas: sql<number>`COALESCE(SUM(CASE WHEN tipo = 'receber' THEN valor_liquido::numeric ELSE 0 END), 0)`,
      despesas: sql<number>`COALESCE(SUM(CASE WHEN tipo = 'pagar' THEN valor_liquido::numeric ELSE 0 END), 0)`,
      qtdReceitas: sql<number>`COUNT(CASE WHEN tipo = 'receber' THEN 1 END)`,
      qtdDespesas: sql<number>`COUNT(CASE WHEN tipo = 'pagar' THEN 1 END)`,
    })
      .from(schema.titulo)
      .where(isNull(schema.titulo.deletedAt))
      .groupBy(sql`TO_CHAR(data_competencia::date, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(data_competencia::date, 'YYYY-MM') DESC`)
      .limit(meses);

    // Calcular saldo acumulado
    let saldoAcumulado = 0;
    const fluxo = results.reverse().map(r => {
      const receitas = Number(r.receitas);
      const despesas = Number(r.despesas);
      saldoAcumulado += receitas - despesas;
      
      return {
        mes: r.mes,
        mesFormatado: (() => {
          const [ano, mes] = r.mes.split('-');
          const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
          return `${meses[parseInt(mes) - 1]}/${ano.slice(2)}`;
        })(),
        receitas,
        despesas,
        resultado: receitas - despesas,
        saldoAcumulado,
        qtdReceitas: Number(r.qtdReceitas),
        qtdDespesas: Number(r.qtdDespesas),
      };
    });

    return fluxo;
  }),

  // Composição de receitas por natureza/tipo (filtrado pelo mês atual)
  composicaoReceitas: publicProcedure.query(async () => {
    const db = await getDb();
    
    // Determinar mês atual (mesmo do kpisEnhanced)
    const [ultimo] = await db.select({ data: sql<string>`MAX(data_competencia)` })
      .from(schema.titulo)
      .where(isNull(schema.titulo.deletedAt));
    
    const dataRef = ultimo?.data ? new Date(ultimo.data) : new Date();
    const ano = dataRef.getFullYear();
    const mes = dataRef.getMonth() + 1;
    const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const fim = `${ano}-${String(mes).padStart(2, '0')}-${ultimoDia}`;
    
    // Por natureza - COM filtro de data
    const porNatureza = await db.select({
      natureza: schema.titulo.natureza,
      total: sql<number>`COALESCE(SUM(valor_liquido::numeric), 0)`,
      quantidade: sql<number>`COUNT(*)`,
    })
      .from(schema.titulo)
      .where(and(
        isNull(schema.titulo.deletedAt),
        eq(schema.titulo.tipo, 'receber'),
        sql`data_competencia >= ${inicio} AND data_competencia <= ${fim}`
      ))
      .groupBy(schema.titulo.natureza)
      .orderBy(sql`SUM(valor_liquido::numeric) DESC`);

    // Por tipo de pessoa (associado vs não associado) - COM filtro de data
    const porTipoPessoa = await db.execute(sql`
      SELECT 
        CASE WHEN a.id IS NOT NULL THEN 'associado' ELSE 'nao_associado' END as tipo_pessoa,
        COALESCE(SUM(t.valor_liquido::numeric), 0) as total,
        COUNT(*) as quantidade
      FROM titulo t
      LEFT JOIN pessoa p ON t.pessoa_id = p.id
      LEFT JOIN associado a ON a.pessoa_id = p.id
      WHERE t.deleted_at IS NULL 
        AND t.tipo = 'receber'
        AND t.data_competencia >= ${inicio}
        AND t.data_competencia <= ${fim}
      GROUP BY CASE WHEN a.id IS NOT NULL THEN 'associado' ELSE 'nao_associado' END
    `);

    const totalReceitas = porNatureza.reduce((acc, n) => acc + Number(n.total), 0);

    return {
      porNatureza: porNatureza.map(n => ({
        natureza: n.natureza,
        total: Number(n.total),
        quantidade: Number(n.quantidade),
        percentual: totalReceitas > 0 ? (Number(n.total) / totalReceitas) * 100 : 0,
      })),
      porTipoPessoa: porTipoPessoa.rows.map((r: any) => ({
        tipo: r.tipo_pessoa,
        total: Number(r.total),
        quantidade: Number(r.quantidade),
        percentual: totalReceitas > 0 ? (Number(r.total) / totalReceitas) * 100 : 0,
      })),
      totalReceitas,
    };
  }),

  // Top contribuintes
  topContribuintes: publicProcedure.input(z.object({
    limite: z.number().default(10),
    mesAno: z.string().optional(), // formato: "2025-01"
  }).optional()).query(async ({ input }) => {
    const db = await getDb();
    const limite = input?.limite || 10;
    
    let whereClause = sql`t.deleted_at IS NULL AND t.tipo = 'receber'`;
    
    if (input?.mesAno) {
      const [ano, mes] = input.mesAno.split('-').map(Number);
      const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
      const ultimoDia = new Date(ano, mes, 0).getDate();
      const fim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
      whereClause = sql`t.deleted_at IS NULL AND t.tipo = 'receber' AND t.data_competencia BETWEEN ${inicio} AND ${fim}`;
    }

    const results = await db.execute(sql`
      SELECT 
        p.id,
        p.nome,
        p.tipo as pessoa_tipo,
        CASE WHEN a.id IS NOT NULL THEN true ELSE false END as is_associado,
        COUNT(t.id) as total_contribuicoes,
        COALESCE(SUM(t.valor_liquido::numeric), 0) as valor_total,
        MAX(t.data_competencia) as ultima_contribuicao
      FROM titulo t
      INNER JOIN pessoa p ON t.pessoa_id = p.id
      LEFT JOIN associado a ON a.pessoa_id = p.id
      WHERE ${whereClause}
      GROUP BY p.id, p.nome, p.tipo, a.id
      ORDER BY SUM(t.valor_liquido::numeric) DESC
      LIMIT ${limite}
    `);

    return results.rows.map((r: any) => ({
      id: r.id,
      nome: r.nome,
      pessoaTipo: r.pessoa_tipo,
      isAssociado: r.is_associado,
      totalContribuicoes: Number(r.total_contribuicoes),
      valorTotal: Number(r.valor_total),
      ultimaContribuicao: r.ultima_contribuicao,
    }));
  }),

  // Alertas fiscais e compliance
  alertasFiscais: publicProcedure.query(async () => {
    const db = await getDb();
    const now = new Date();
    const alerts: Array<{
      id: string;
      tipo: 'info' | 'warning' | 'danger' | 'success';
      titulo: string;
      mensagem: string;
      acao?: string;
    }> = [];

    // Verificar período contábil atual
    const [periodoAtual] = await db.select()
      .from(schema.periodoContabil)
      .where(and(
        eq(schema.periodoContabil.ano, now.getFullYear()),
        eq(schema.periodoContabil.mes, now.getMonth() + 1)
      ));

    if (!periodoAtual) {
      alerts.push({
        id: 'periodo-nao-criado',
        tipo: 'warning',
        titulo: 'Período Contábil',
        mensagem: `O período contábil de ${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ainda não foi criado.`,
        acao: 'Criar período',
      });
    }

    // Verificar períodos anteriores não fechados
    const periodosAbertos = await db.select()
      .from(schema.periodoContabil)
      .where(and(
        eq(schema.periodoContabil.status, 'aberto'),
        sql`(ano < ${now.getFullYear()} OR (ano = ${now.getFullYear()} AND mes < ${now.getMonth() + 1}))`
      ))
      .orderBy(desc(schema.periodoContabil.ano), desc(schema.periodoContabil.mes));

    if (periodosAbertos.length > 0) {
      alerts.push({
        id: 'periodos-abertos',
        tipo: 'warning',
        titulo: 'Períodos Pendentes',
        mensagem: `Existem ${periodosAbertos.length} período(s) contábil(is) anterior(es) ainda aberto(s).`,
        acao: 'Revisar períodos',
      });
    }

    // Verificar extratos pendentes de conciliação
    const [extratosPendentes] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.extratoLinha)
      .where(eq(schema.extratoLinha.status, 'pendente'));

    if (extratosPendentes.count > 0) {
      alerts.push({
        id: 'extratos-pendentes',
        tipo: 'info',
        titulo: 'Conciliação Bancária',
        mensagem: `${extratosPendentes.count} linha(s) de extrato aguardando conciliação.`,
        acao: 'Conciliar',
      });
    }

    // Alertas de compliance para entidades do terceiro setor (ITG 2002)
    const mesAtual = now.getMonth() + 1;
    
    // Janeiro - Prazo para DIRF
    if (mesAtual === 1 || mesAtual === 2) {
      alerts.push({
        id: 'dirf-prazo',
        tipo: 'warning',
        titulo: 'DIRF - Declaração do IR Retido',
        mensagem: 'Prazo para entrega da DIRF até o último dia útil de fevereiro.',
        acao: 'Verificar retenções',
      });
    }

    // Março - RAIS
    if (mesAtual === 3 || mesAtual === 4) {
      alerts.push({
        id: 'rais-prazo',
        tipo: 'info',
        titulo: 'RAIS - Relação Anual',
        mensagem: 'Verificar prazo da RAIS (se houver funcionários).',
      });
    }

    // Junho - ECD para entidades imunes/isentas
    if (mesAtual >= 5 && mesAtual <= 7) {
      alerts.push({
        id: 'ecd-prazo',
        tipo: 'warning',
        titulo: 'ECD - Escrituração Contábil Digital',
        mensagem: 'Entidades do terceiro setor: prazo ECD até julho.',
        acao: 'Verificar obrigatoriedade',
      });
    }

    // Lembrete permanente sobre ITG 2002
    alerts.push({
      id: 'itg-2002',
      tipo: 'info',
      titulo: 'ITG 2002 - Norma Contábil',
      mensagem: 'Entidades sem fins lucrativos devem seguir as normas da ITG 2002 (R1).',
    });

    return alerts;
  }),

  // Contas financeiras com saldo
  contasComSaldo: publicProcedure.query(async () => {
    const db = await getDb();
    const contas = await db.select().from(schema.contaFinanceira).where(eq(schema.contaFinanceira.ativo, true)).orderBy(asc(schema.contaFinanceira.nome));

    const contasComSaldo = await Promise.all(contas.map(async (conta) => {
      const [totais] = await db.select({
        entradas: sql<number>`COALESCE(SUM(CASE WHEN t.tipo = 'receber' THEN tb.valor_pago::numeric ELSE 0 END), 0)`,
        saidas: sql<number>`COALESCE(SUM(CASE WHEN t.tipo = 'pagar' THEN tb.valor_pago::numeric ELSE 0 END), 0)`,
      })
        .from(schema.tituloBaixa)
        .leftJoin(schema.titulo, eq(schema.tituloBaixa.tituloId, schema.titulo.id))
        .where(eq(schema.tituloBaixa.contaFinanceiraId, conta.id));

      const saldoInicial = Number(conta.saldoInicial);
      const entradas = Number(totais.entradas);
      const saidas = Number(totais.saidas);
      const saldoAtual = saldoInicial + entradas - saidas;
      const totalMovimentado = entradas + saidas;

      return {
        id: conta.id,
        nome: conta.nome,
        tipo: conta.tipo,
        banco: conta.bancoNome || conta.bancoCodigo,
        saldoInicial,
        entradas,
        saidas,
        saldoAtual,
        percentualEntradas: totalMovimentado > 0 ? (entradas / totalMovimentado) * 100 : 50,
      };
    }));

    const saldoTotal = contasComSaldo.reduce((acc, c) => acc + c.saldoAtual, 0);

    return { contas: contasComSaldo, saldoTotal };
  }),

  // Feed de notícias (mock - em produção usaria RSS real)
  newsFeed: publicProcedure.query(async () => {
    // Em produção, isso buscaria RSS de:
    // - FEB (Federação Espírita Brasileira)
    // - USE-AL (União das Sociedades Espíritas de Alagoas)
    // - FEAL (Federação Espírita Alagoana)
    // - GIFE, ABONG (terceiro setor)
    
    const mockNews = [
      {
        id: '1',
        title: 'FEB divulga programação do Congresso Espírita Brasileiro 2025',
        summary: 'Evento reunirá lideranças espíritas de todo o país para debater a atualidade da Doutrina.',
        source: 'FEB',
        url: 'https://www.febnet.org.br',
        imageUrl: null,
        publishedAt: new Date().toISOString(),
        category: 'Eventos',
      },
      {
        id: '2',
        title: 'Novo Marco Regulatório do Terceiro Setor entra em vigor',
        summary: 'Entidades devem se adequar às novas regras de prestação de contas e transparência.',
        source: 'GIFE',
        url: 'https://gife.org.br',
        imageUrl: null,
        publishedAt: new Date(Date.now() - 86400000).toISOString(),
        category: 'Legislação',
      },
      {
        id: '3',
        title: 'USE-AL promove encontro de trabalhadores espíritas',
        summary: 'Evento gratuito acontece no próximo mês com palestras e workshops.',
        source: 'USE-AL',
        url: 'https://use-al.org.br',
        imageUrl: null,
        publishedAt: new Date(Date.now() - 172800000).toISOString(),
        category: 'Regional',
      },
      {
        id: '4',
        title: 'ITG 2002: O que as entidades sem fins lucrativos precisam saber',
        summary: 'Guia prático sobre a norma contábil específica para o terceiro setor.',
        source: 'CFC',
        url: 'https://cfc.org.br',
        imageUrl: null,
        publishedAt: new Date(Date.now() - 259200000).toISOString(),
        category: 'Contabilidade',
      },
      {
        id: '5',
        title: 'Prazo para declarações anuais do terceiro setor se aproxima',
        summary: 'Veja quais obrigações acessórias sua entidade precisa cumprir.',
        source: 'ABONG',
        url: 'https://abong.org.br',
        imageUrl: null,
        publishedAt: new Date(Date.now() - 345600000).toISOString(),
        category: 'Fiscal',
      },
    ];

    return mockNews;
  }),

  // Sparkline data - últimos 6 meses resumido
  sparklineData: publicProcedure.query(async () => {
    const db = await getDb();
    
    const results = await db.select({
      mes: sql<string>`TO_CHAR(data_competencia::date, 'YYYY-MM')`,
      receitas: sql<number>`COALESCE(SUM(CASE WHEN tipo = 'receber' THEN valor_liquido::numeric ELSE 0 END), 0)`,
      despesas: sql<number>`COALESCE(SUM(CASE WHEN tipo = 'pagar' THEN valor_liquido::numeric ELSE 0 END), 0)`,
    })
      .from(schema.titulo)
      .where(isNull(schema.titulo.deletedAt))
      .groupBy(sql`TO_CHAR(data_competencia::date, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(data_competencia::date, 'YYYY-MM') DESC`)
      .limit(6);

    return results.reverse().map(r => ({
      mes: r.mes,
      receitas: Number(r.receitas),
      despesas: Number(r.despesas),
      saldo: Number(r.receitas) - Number(r.despesas),
    }));
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
  // Novos routers
  pessoas: pessoasRouter,
  titulos: titulosRouter,
  contasFinanceiras: contasFinanceirasRouter,
  periodosContabeis: periodosContabeisRouter,
  extratos: extratosRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;

