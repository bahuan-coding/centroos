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
      
      const [result] = await db.insert(schema.accounts).values({ ...input, level });
      
      await db.insert(schema.auditLog).values({
        userId: ctx.user.id,
        entityType: 'account',
        entityId: result.insertId,
        action: 'create',
        newValues: input,
      });
      
      return { id: result.insertId };
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
      
      const [result] = await db.insert(schema.periods).values(input);
      
      await db.insert(schema.auditLog).values({
        userId: ctx.user.id,
        entityType: 'period',
        entityId: result.insertId,
        action: 'create',
        newValues: input,
      });
      
      return { id: result.insertId };
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
        transactionDate: txDate,
        isNfc: input.isNfc ? 1 : 0,
        createdBy: ctx.user.id,
      });
      
      await db.insert(schema.auditLog).values({
        userId: ctx.user.id,
        entityType: 'entry',
        entityId: result.insertId,
        action: 'create',
        newValues: input,
      });
      
      return { id: result.insertId };
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
      if (data.transactionDate) updateData.transactionDate = new Date(data.transactionDate);
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
      });
      return { id: result.insertId };
    }),

  delete: accountantProcedure.input(z.number()).mutation(async ({ input }) => {
    const db = await getDb();
    await db.delete(schema.classificationRules).where(eq(schema.classificationRules.id, input));
    return { success: true };
  }),
});

// ==================== REPORTS ROUTER ====================
import { generateFinancialReportPDF, generateNfcReportPDF, generateBalancetePDF } from './services/reports';

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
});

export type AppRouter = typeof appRouter;

