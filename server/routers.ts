import { z } from 'zod';
import { eq, and, desc, asc, like, sql, between, isNull, or } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure, adminProcedure, accountantProcedure, withPermission, rbacAdminProcedure, auditorProcedure, getVisitorId, getUserMaxLevel, type Context } from './trpc';
import { getDb, schema } from './db';

// Helper para criar evento de auditoria com IP e User-Agent
interface AuditEventParams {
  ctx: Context & { user: NonNullable<Context['user']> };
  entidadeTipo: string;
  entidadeId: string;
  acao: 'criar' | 'atualizar' | 'excluir' | 'visualizar' | 'exportar' | 'fechar' | 'reabrir' | 'aprovar' | 'rejeitar';
  dadosAnteriores?: any;
  dadosNovos?: any;
  visitorId?: string | null;
}

async function createAuditEvent({ ctx, entidadeTipo, entidadeId, acao, dadosAnteriores, dadosNovos, visitorId }: AuditEventParams) {
  const db = await getDb();
  const usuarioId = visitorId || await getVisitorId(ctx.user.email);
  
  await db.insert(schema.eventoAuditoria).values({
    usuarioId,
    entidadeTipo,
    entidadeId,
    acao,
    dadosAnteriores,
    dadosNovos,
    ipOrigem: ctx.ipAddress || null,
    userAgent: ctx.userAgent || null,
  });
}

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

  // ========== PLANO DE CONTAS VIVO ==========
  planoContasStats: publicProcedure.query(async () => {
    const db = await getDb();
    
    // Totais por tipo do plano de contas
    const byType = await db.select({
      tipo: schema.planoContas.tipo,
      total: sql<number>`count(*)`,
      analiticas: sql<number>`sum(case when ${schema.planoContas.classificacao} = 'analitica' then 1 else 0 end)`,
      sinteticas: sql<number>`sum(case when ${schema.planoContas.classificacao} = 'sintetica' then 1 else 0 end)`,
    }).from(schema.planoContas)
      .where(isNull(schema.planoContas.deletedAt))
      .groupBy(schema.planoContas.tipo);

    // Total geral de contas
    const [totals] = await db.select({
      total: sql<number>`count(*)`,
      analiticas: sql<number>`sum(case when ${schema.planoContas.classificacao} = 'analitica' then 1 else 0 end)`,
      sinteticas: sql<number>`sum(case when ${schema.planoContas.classificacao} = 'sintetica' then 1 else 0 end)`,
    }).from(schema.planoContas).where(isNull(schema.planoContas.deletedAt));

    // Calcular saldo das contas financeiras (Ativos = Disponibilidades)
    const contasFinanceiras = await db.select({
      saldoInicial: schema.contaFinanceira.saldoInicial,
    }).from(schema.contaFinanceira).where(eq(schema.contaFinanceira.ativo, true));

    // Calcular entradas e saídas das baixas
    const [baixasTotais] = await db.select({
      entradas: sql<number>`COALESCE(SUM(CASE WHEN ${schema.titulo.tipo} = 'receber' THEN valor_pago::numeric ELSE 0 END), 0)`,
      saidas: sql<number>`COALESCE(SUM(CASE WHEN ${schema.titulo.tipo} = 'pagar' THEN valor_pago::numeric ELSE 0 END), 0)`,
    }).from(schema.tituloBaixa)
      .leftJoin(schema.titulo, eq(schema.tituloBaixa.tituloId, schema.titulo.id));

    const saldoInicialTotal = contasFinanceiras.reduce((acc, c) => acc + Number(c.saldoInicial || 0), 0);
    const entradas = Number(baixasTotais.entradas) || 0;
    const saidas = Number(baixasTotais.saidas) || 0;
    const saldoAtual = saldoInicialTotal + entradas - saidas;

    // Receitas e Despesas (para KPIs de resultado)
    const [receitas] = await db.select({
      total: sql<number>`COALESCE(SUM(valor_liquido::numeric), 0)`,
      qtd: sql<number>`COUNT(*)`,
    }).from(schema.titulo)
      .where(and(isNull(schema.titulo.deletedAt), eq(schema.titulo.tipo, 'receber')));

    const [despesas] = await db.select({
      total: sql<number>`COALESCE(SUM(valor_liquido::numeric), 0)`,
      qtd: sql<number>`COUNT(*)`,
    }).from(schema.titulo)
      .where(and(isNull(schema.titulo.deletedAt), eq(schema.titulo.tipo, 'pagar')));

    const totalReceitas = Number(receitas.total) || 0;
    const totalDespesas = Number(despesas.total) || 0;
    const resultado = totalReceitas - totalDespesas;

    // Movimentos por tipo mapeados para plano de contas
    const movimentosPorTipo = [
      { tipo: 'ativo', qtdTitulos: 0, valorTotal: saldoAtual },
      { tipo: 'passivo', qtdTitulos: 0, valorTotal: 0 },
      { tipo: 'patrimonio_social', qtdTitulos: 0, valorTotal: saldoAtual },
      { tipo: 'receita', qtdTitulos: Number(receitas.qtd) || 0, valorTotal: totalReceitas },
      { tipo: 'despesa', qtdTitulos: Number(despesas.qtd) || 0, valorTotal: totalDespesas },
    ];

    return {
      totals: {
        total: Number(totals.total) || 0,
        analiticas: Number(totals.analiticas) || 0,
        sinteticas: Number(totals.sinteticas) || 0,
      },
      byType: byType.map(t => ({
        tipo: t.tipo,
        total: Number(t.total) || 0,
        analiticas: Number(t.analiticas) || 0,
        sinteticas: Number(t.sinteticas) || 0,
      })),
      movimentos: movimentosPorTipo,
      equacaoPatrimonial: {
        ativos: saldoAtual,
        passivos: 0,
        patrimonio: saldoAtual,
        balanceado: true,
      },
    };
  }),

  planoContasTree: publicProcedure.query(async () => {
    const db = await getDb();
    
    // Buscar todas as contas do plano
    const contas = await db.select({
      id: schema.planoContas.id,
      codigo: schema.planoContas.codigo,
      nome: schema.planoContas.nome,
      tipo: schema.planoContas.tipo,
      naturezaSaldo: schema.planoContas.naturezaSaldo,
      classificacao: schema.planoContas.classificacao,
      nivel: schema.planoContas.nivel,
      contaPaiId: schema.planoContas.contaPaiId,
      aceitaLancamento: schema.planoContas.aceitaLancamento,
      ativo: schema.planoContas.ativo,
    }).from(schema.planoContas)
      .where(isNull(schema.planoContas.deletedAt))
      .orderBy(asc(schema.planoContas.codigo));

    // Calcular totais de receitas e despesas para mostrar nas contas raiz
    const [receitas] = await db.select({
      total: sql<number>`COALESCE(SUM(valor_liquido::numeric), 0)`,
      qtd: sql<number>`COUNT(*)`,
    }).from(schema.titulo)
      .where(and(isNull(schema.titulo.deletedAt), eq(schema.titulo.tipo, 'receber')));

    const [despesas] = await db.select({
      total: sql<number>`COALESCE(SUM(valor_liquido::numeric), 0)`,
      qtd: sql<number>`COUNT(*)`,
    }).from(schema.titulo)
      .where(and(isNull(schema.titulo.deletedAt), eq(schema.titulo.tipo, 'pagar')));

    // Saldo das contas financeiras
    const contasFinanceiras = await db.select().from(schema.contaFinanceira).where(eq(schema.contaFinanceira.ativo, true));
    const [baixasTotais] = await db.select({
      entradas: sql<number>`COALESCE(SUM(CASE WHEN ${schema.titulo.tipo} = 'receber' THEN valor_pago::numeric ELSE 0 END), 0)`,
      saidas: sql<number>`COALESCE(SUM(CASE WHEN ${schema.titulo.tipo} = 'pagar' THEN valor_pago::numeric ELSE 0 END), 0)`,
    }).from(schema.tituloBaixa)
      .leftJoin(schema.titulo, eq(schema.tituloBaixa.tituloId, schema.titulo.id));

    const saldoInicialTotal = contasFinanceiras.reduce((acc, c) => acc + Number(c.saldoInicial || 0), 0);
    const saldoAtual = saldoInicialTotal + Number(baixasTotais.entradas || 0) - Number(baixasTotais.saidas || 0);

    return contas.map(c => {
      let qtdTitulos = 0;
      let valorTotal = 0;

      // Mapear valores reais para contas raiz (nível 0)
      if (c.codigo === '1') { // ATIVO
        valorTotal = saldoAtual;
      } else if (c.codigo === '3') { // PATRIMÔNIO SOCIAL
        valorTotal = saldoAtual;
      } else if (c.codigo === '4') { // RECEITAS
        valorTotal = Number(receitas.total) || 0;
        qtdTitulos = Number(receitas.qtd) || 0;
      } else if (c.codigo === '5') { // DESPESAS
        valorTotal = Number(despesas.total) || 0;
        qtdTitulos = Number(despesas.qtd) || 0;
      }

      return {
        ...c,
        qtdTitulos,
        valorTotal,
      };
    });
  }),

  planoContasInsights: publicProcedure.query(async () => {
    const db = await getDb();
    
    // Top 5 pessoas com mais títulos (como proxy de "contas movimentadas")
    const topPessoas = await db.select({
      id: schema.pessoa.id,
      nome: schema.pessoa.nome,
      qtdTitulos: sql<number>`COUNT(${schema.titulo.id})`,
      valorTotal: sql<number>`COALESCE(SUM(${schema.titulo.valorLiquido}::numeric), 0)`,
    }).from(schema.titulo)
      .innerJoin(schema.pessoa, eq(schema.titulo.pessoaId, schema.pessoa.id))
      .where(isNull(schema.titulo.deletedAt))
      .groupBy(schema.pessoa.id)
      .orderBy(desc(sql`COUNT(${schema.titulo.id})`))
      .limit(5);

    // Contas analíticas do plano (todas são "sem movimento" já que conta_contabil_id não é preenchido)
    const contasAnaliticas = await db.select({
      id: schema.planoContas.id,
      codigo: schema.planoContas.codigo,
      nome: schema.planoContas.nome,
      tipo: schema.planoContas.tipo,
    }).from(schema.planoContas)
      .where(and(
        isNull(schema.planoContas.deletedAt),
        eq(schema.planoContas.classificacao, 'analitica')
      ))
      .orderBy(asc(schema.planoContas.codigo))
      .limit(20);

    // ITG 2002 compliance check
    const compliance = {
      temAtivo: false,
      temPassivo: false,
      temPatrimonio: false,
      temReceita: false,
      temDespesa: false,
      estruturaCompleta: false,
    };
    
    const tipos = await db.select({ tipo: schema.planoContas.tipo })
      .from(schema.planoContas)
      .where(and(isNull(schema.planoContas.deletedAt), eq(schema.planoContas.nivel, 0)))
      .groupBy(schema.planoContas.tipo);
    
    tipos.forEach(t => {
      if (t.tipo === 'ativo') compliance.temAtivo = true;
      if (t.tipo === 'passivo') compliance.temPassivo = true;
      if (t.tipo === 'patrimonio_social') compliance.temPatrimonio = true;
      if (t.tipo === 'receita') compliance.temReceita = true;
      if (t.tipo === 'despesa') compliance.temDespesa = true;
    });
    
    compliance.estruturaCompleta = compliance.temAtivo && compliance.temPassivo && 
      compliance.temPatrimonio && compliance.temReceita && compliance.temDespesa;

    return {
      maisMovimentadas: topPessoas.map(p => ({
        id: p.id,
        codigo: '-',
        nome: p.nome,
        tipo: 'receita',
        qtdTitulos: Number(p.qtdTitulos) || 0,
        valorTotal: Number(p.valorTotal) || 0,
      })),
      semMovimento: contasAnaliticas,
      compliance,
    };
  }),

  // ========== CRUD PLANO DE CONTAS ITG 2002 ==========
  planoContasCreate: accountantProcedure
    .input(z.object({
      codigo: z.string().min(1).max(20),
      nome: z.string().min(3).max(255),
      tipo: z.enum(['ativo', 'passivo', 'patrimonio_social', 'receita', 'despesa']),
      naturezaSaldo: z.enum(['devedora', 'credora']),
      classificacao: z.enum(['sintetica', 'analitica']),
      contaPaiId: z.string().uuid().optional(),
      descricao: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Verificar código único
      const [existing] = await db.select().from(schema.planoContas).where(eq(schema.planoContas.codigo, input.codigo));
      if (existing) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Código já existe no plano de contas' });
      
      // Calcular nível e validar hierarquia
      let nivel = 0;
      if (input.contaPaiId) {
        const [pai] = await db.select().from(schema.planoContas).where(eq(schema.planoContas.id, input.contaPaiId));
        if (!pai) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Conta pai não encontrada' });
        if (!input.codigo.startsWith(pai.codigo + '.')) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `Código deve iniciar com ${pai.codigo}.` });
        }
        if (pai.tipo !== input.tipo) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tipo deve ser igual ao da conta pai' });
        }
        nivel = pai.nivel + 1;
      }
      
      // Validar natureza × tipo
      const naturezaEsperada = ['ativo', 'despesa'].includes(input.tipo) ? 'devedora' : 'credora';
      if (input.naturezaSaldo !== naturezaEsperada) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `${input.tipo} deve ter natureza ${naturezaEsperada}` });
      }
      
      const aceitaLancamento = input.classificacao === 'analitica';
      
      const [result] = await db.insert(schema.planoContas).values({
        codigo: input.codigo,
        nome: input.nome,
        tipo: input.tipo,
        naturezaSaldo: input.naturezaSaldo,
        classificacao: input.classificacao,
        nivel,
        contaPaiId: input.contaPaiId,
        aceitaLancamento,
        descricao: input.descricao,
        tags: input.tags,
      }).returning({ id: schema.planoContas.id });
      
      return { id: result.id };
    }),

  planoContasUpdate: accountantProcedure
    .input(z.object({
      id: z.string().uuid(),
      nome: z.string().min(3).max(255).optional(),
      descricao: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const { id, ...data } = input;
      
      const [conta] = await db.select().from(schema.planoContas).where(eq(schema.planoContas.id, id));
      if (!conta) throw new TRPCError({ code: 'NOT_FOUND', message: 'Conta não encontrada' });
      
      const updateData: any = { updatedAt: new Date() };
      if (data.nome) updateData.nome = data.nome;
      if (data.descricao !== undefined) updateData.descricao = data.descricao;
      if (data.tags !== undefined) updateData.tags = data.tags;
      
      await db.update(schema.planoContas).set(updateData).where(eq(schema.planoContas.id, id));
      return { success: true };
    }),

  planoContasToggleAtivo: accountantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      const [conta] = await db.select().from(schema.planoContas).where(eq(schema.planoContas.id, input.id));
      if (!conta) throw new TRPCError({ code: 'NOT_FOUND', message: 'Conta não encontrada' });
      
      // Verificar se tem lançamentos (bloquear inativação)
      if (conta.ativo) {
        const [lancamentos] = await db.select({ count: sql<number>`count(*)` })
          .from(schema.lancamentoLinha)
          .where(eq(schema.lancamentoLinha.contaId, input.id));
        if (lancamentos.count > 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Conta possui lançamentos e não pode ser inativada' });
        }
      }
      
      await db.update(schema.planoContas).set({ ativo: !conta.ativo, updatedAt: new Date() }).where(eq(schema.planoContas.id, input.id));
      return { success: true, ativo: !conta.ativo };
    }),

  planoContasHierarchy: publicProcedure.query(async () => {
    const db = await getDb();
    return db.select({
      id: schema.planoContas.id,
      codigo: schema.planoContas.codigo,
      nome: schema.planoContas.nome,
      tipo: schema.planoContas.tipo,
      classificacao: schema.planoContas.classificacao,
      nivel: schema.planoContas.nivel,
      aceitaLancamento: schema.planoContas.aceitaLancamento,
    }).from(schema.planoContas)
      .where(and(isNull(schema.planoContas.deletedAt), eq(schema.planoContas.ativo, true)))
      .orderBy(asc(schema.planoContas.codigo));
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

  // ==================== ENHANCED PERIODS ENDPOINTS ====================
  listWithStats: publicProcedure.query(async () => {
    const db = await getDb();
    
    const periods = await db.select().from(schema.periods).orderBy(desc(schema.periods.year), desc(schema.periods.month));
    
    // Get stats for each period from titulos (data_competencia matching month/year)
    const periodsWithStats = await Promise.all(periods.map(async (p) => {
      const inicio = `${p.year}-${String(p.month).padStart(2, '0')}-01`;
      const ultimoDia = new Date(p.year, p.month, 0).getDate();
      const fim = `${p.year}-${String(p.month).padStart(2, '0')}-${ultimoDia}`;
      
      const [stats] = await db.select({
        receitas: sql<number>`COALESCE(SUM(CASE WHEN tipo = 'receber' THEN valor_liquido::numeric ELSE 0 END), 0)`,
        despesas: sql<number>`COALESCE(SUM(CASE WHEN tipo = 'pagar' THEN valor_liquido::numeric ELSE 0 END), 0)`,
        qtdLancamentos: sql<number>`COUNT(*)`,
        quitados: sql<number>`COUNT(CASE WHEN status = 'quitado' THEN 1 END)`,
      }).from(schema.titulo)
        .where(and(
          isNull(schema.titulo.deletedAt),
          sql`data_competencia >= ${inicio} AND data_competencia <= ${fim}`
        ));
      
      const receitas = Number(stats?.receitas) || 0;
      const despesas = Number(stats?.despesas) || 0;
      const qtdLancamentos = Number(stats?.qtdLancamentos) || 0;
      const quitados = Number(stats?.quitados) || 0;
      
      return {
        ...p,
        receitas,
        despesas,
        resultado: receitas - despesas,
        qtdLancamentos,
        percentConciliado: qtdLancamentos > 0 ? Math.round((quitados / qtdLancamentos) * 100) : 0,
      };
    }));
    
    // Calculate yearly totals
    const anoAtual = new Date().getFullYear();
    const periodosAno = periodsWithStats.filter(p => p.year === anoAtual);
    
    const receitasAno = periodosAno.reduce((acc, p) => acc + p.receitas, 0);
    const despesasAno = periodosAno.reduce((acc, p) => acc + p.despesas, 0);
    const resultadoAno = receitasAno - despesasAno;
    
    // Generate global insights
    const insights: { tipo: 'info' | 'warning' | 'success' | 'danger'; mensagem: string }[] = [];
    
    // Check for deficit months
    const mesesDeficit = periodosAno.filter(p => p.resultado < 0);
    if (mesesDeficit.length > 0) {
      insights.push({ 
        tipo: 'warning', 
        mensagem: `${mesesDeficit.length} mês(es) com déficit em ${anoAtual}` 
      });
    }
    
    // Trend analysis (compare last 3 months)
    if (periodsWithStats.length >= 3) {
      const ultimos3 = periodsWithStats.slice(0, 3);
      const tendenciaReceitas = ultimos3[0].receitas - ultimos3[2].receitas;
      if (tendenciaReceitas > 0) {
        insights.push({ tipo: 'success', mensagem: 'Receitas em tendência de alta nos últimos 3 meses' });
      } else if (tendenciaReceitas < 0) {
        insights.push({ tipo: 'warning', mensagem: 'Receitas em queda nos últimos 3 meses' });
      }
    }
    
    // Best performing month
    if (periodosAno.length > 0) {
      const melhorMes = periodosAno.reduce((best, p) => p.resultado > best.resultado ? p : best, periodosAno[0]);
      if (melhorMes.resultado > 0) {
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        insights.push({ 
          tipo: 'info', 
          mensagem: `Melhor resultado: ${meses[melhorMes.month - 1]} com superávit de R$ ${melhorMes.resultado.toLocaleString('pt-BR')}` 
        });
      }
    }
    
    // Yearly result
    if (resultadoAno >= 0) {
      insights.push({ tipo: 'success', mensagem: `Exercício ${anoAtual} com superávit acumulado` });
    } else {
      insights.push({ tipo: 'danger', mensagem: `Exercício ${anoAtual} com déficit acumulado` });
    }
    
    return {
      periods: periodsWithStats,
      totals: {
        receitasAno,
        despesasAno,
        resultadoAno,
        periodosAbertos: periods.filter(p => p.status === 'open').length,
        periodosFechados: periods.filter(p => p.status === 'closed').length,
      },
      insights,
    };
  }),

  detail: publicProcedure.input(z.number()).query(async ({ input: periodId }) => {
    const db = await getDb();
    
    const [period] = await db.select().from(schema.periods).where(eq(schema.periods.id, periodId));
    if (!period) throw new TRPCError({ code: 'NOT_FOUND', message: 'Período não encontrado' });
    
    const inicio = `${period.year}-${String(period.month).padStart(2, '0')}-01`;
    const ultimoDia = new Date(period.year, period.month, 0).getDate();
    const fim = `${period.year}-${String(period.month).padStart(2, '0')}-${ultimoDia}`;
    
    // Composição de receitas por natureza
    const composicaoReceitas = await db.select({
      natureza: schema.titulo.natureza,
      valor: sql<number>`COALESCE(SUM(valor_liquido::numeric), 0)`,
      quantidade: sql<number>`COUNT(*)`,
    }).from(schema.titulo)
      .where(and(
        isNull(schema.titulo.deletedAt),
        eq(schema.titulo.tipo, 'receber'),
        sql`data_competencia >= ${inicio} AND data_competencia <= ${fim}`
      ))
      .groupBy(schema.titulo.natureza)
      .orderBy(sql`SUM(valor_liquido::numeric) DESC`);
    
    // Composição de despesas por natureza
    const composicaoDespesas = await db.select({
      natureza: schema.titulo.natureza,
      valor: sql<number>`COALESCE(SUM(valor_liquido::numeric), 0)`,
      quantidade: sql<number>`COUNT(*)`,
    }).from(schema.titulo)
      .where(and(
        isNull(schema.titulo.deletedAt),
        eq(schema.titulo.tipo, 'pagar'),
        sql`data_competencia >= ${inicio} AND data_competencia <= ${fim}`
      ))
      .groupBy(schema.titulo.natureza)
      .orderBy(sql`SUM(valor_liquido::numeric) DESC`);
    
    // Top 5 receitas
    const topReceitas = await db.select({
      id: schema.titulo.id,
      descricao: schema.titulo.descricao,
      valor: sql<number>`valor_liquido::numeric`,
      pessoaNome: schema.pessoa.nome,
    }).from(schema.titulo)
      .leftJoin(schema.pessoa, eq(schema.titulo.pessoaId, schema.pessoa.id))
      .where(and(
        isNull(schema.titulo.deletedAt),
        eq(schema.titulo.tipo, 'receber'),
        sql`data_competencia >= ${inicio} AND data_competencia <= ${fim}`
      ))
      .orderBy(sql`valor_liquido::numeric DESC`)
      .limit(5);
    
    // Top 5 despesas
    const topDespesas = await db.select({
      id: schema.titulo.id,
      descricao: schema.titulo.descricao,
      valor: sql<number>`valor_liquido::numeric`,
      pessoaNome: schema.pessoa.nome,
    }).from(schema.titulo)
      .leftJoin(schema.pessoa, eq(schema.titulo.pessoaId, schema.pessoa.id))
      .where(and(
        isNull(schema.titulo.deletedAt),
        eq(schema.titulo.tipo, 'pagar'),
        sql`data_competencia >= ${inicio} AND data_competencia <= ${fim}`
      ))
      .orderBy(sql`valor_liquido::numeric DESC`)
      .limit(5);
    
    // Totals for current period
    const totalReceitas = composicaoReceitas.reduce((acc, r) => acc + Number(r.valor), 0);
    const totalDespesas = composicaoDespesas.reduce((acc, r) => acc + Number(r.valor), 0);
    
    // Comparativo com período anterior
    const mesAnterior = period.month === 1 ? 12 : period.month - 1;
    const anoAnterior = period.month === 1 ? period.year - 1 : period.year;
    const inicioAnt = `${anoAnterior}-${String(mesAnterior).padStart(2, '0')}-01`;
    const ultimoDiaAnt = new Date(anoAnterior, mesAnterior, 0).getDate();
    const fimAnt = `${anoAnterior}-${String(mesAnterior).padStart(2, '0')}-${ultimoDiaAnt}`;
    
    const [statsAnt] = await db.select({
      receitas: sql<number>`COALESCE(SUM(CASE WHEN tipo = 'receber' THEN valor_liquido::numeric ELSE 0 END), 0)`,
      despesas: sql<number>`COALESCE(SUM(CASE WHEN tipo = 'pagar' THEN valor_liquido::numeric ELSE 0 END), 0)`,
    }).from(schema.titulo)
      .where(and(
        isNull(schema.titulo.deletedAt),
        sql`data_competencia >= ${inicioAnt} AND data_competencia <= ${fimAnt}`
      ));
    
    const receitasAnt = Number(statsAnt?.receitas) || 0;
    const despesasAnt = Number(statsAnt?.despesas) || 0;
    const resultadoAnt = receitasAnt - despesasAnt;
    
    const calcVar = (atual: number, anterior: number) => 
      anterior > 0 ? ((atual - anterior) / anterior) * 100 : (atual > 0 ? 100 : 0);
    
    // Generate insights
    const insights: { tipo: 'info' | 'warning' | 'success' | 'danger'; mensagem: string }[] = [];
    
    const receitasVar = calcVar(totalReceitas, receitasAnt);
    const despesasVar = calcVar(totalDespesas, despesasAnt);
    const resultado = totalReceitas - totalDespesas;
    
    if (receitasVar < -20) {
      insights.push({ tipo: 'warning', mensagem: `Receitas caíram ${Math.abs(receitasVar).toFixed(0)}% vs mês anterior` });
    } else if (receitasVar > 20) {
      insights.push({ tipo: 'success', mensagem: `Receitas cresceram ${receitasVar.toFixed(0)}% vs mês anterior` });
    }
    
    if (despesasVar > 30) {
      insights.push({ tipo: 'danger', mensagem: `Despesas aumentaram ${despesasVar.toFixed(0)}% vs mês anterior` });
    } else if (despesasVar < -20) {
      insights.push({ tipo: 'success', mensagem: `Despesas reduziram ${Math.abs(despesasVar).toFixed(0)}%` });
    }
    
    if (resultado < 0) {
      insights.push({ tipo: 'danger', mensagem: `Período com déficit de R$ ${Math.abs(resultado).toLocaleString('pt-BR')}` });
    } else if (resultado > 0) {
      insights.push({ tipo: 'success', mensagem: `Superávit de R$ ${resultado.toLocaleString('pt-BR')}` });
    }
    
    // Concentração de receitas (se top 1 > 50%)
    if (topReceitas.length > 0 && totalReceitas > 0) {
      const topPercent = (Number(topReceitas[0].valor) / totalReceitas) * 100;
      if (topPercent > 50) {
        insights.push({ tipo: 'warning', mensagem: `Alta concentração: ${topPercent.toFixed(0)}% das receitas vêm de uma única fonte` });
      }
    }
    
    return {
      period,
      totals: { receitas: totalReceitas, despesas: totalDespesas, resultado },
      composicaoReceitas: composicaoReceitas.map(r => ({
        natureza: r.natureza,
        valor: Number(r.valor),
        percentual: totalReceitas > 0 ? (Number(r.valor) / totalReceitas) * 100 : 0,
      })),
      composicaoDespesas: composicaoDespesas.map(r => ({
        natureza: r.natureza,
        valor: Number(r.valor),
        percentual: totalDespesas > 0 ? (Number(r.valor) / totalDespesas) * 100 : 0,
      })),
      topReceitas: topReceitas.map(r => ({ ...r, valor: Number(r.valor) })),
      topDespesas: topDespesas.map(r => ({ ...r, valor: Number(r.valor) })),
      comparativo: {
        receitasVar,
        despesasVar,
        resultadoVar: calcVar(resultado, resultadoAnt),
        receitasAnt,
        despesasAnt,
      },
      insights,
    };
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
          bank: parsed.bank,
          account: parsed.account,
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

      // Query with joins and titulo count - busca por nome OU CPF/CNPJ
      const searchTerm = input?.search?.replace(/\D/g, '') || ''; // Remove caracteres não numéricos para buscar documento
      const results = await db.execute(sql`
        SELECT DISTINCT
          p.id, p.tipo, p.nome, p.nome_fantasia, p.ativo, p.observacoes, 
          p.created_at, p.updated_at,
          a.id as associado_id, a.numero_registro, a.data_admissao, a.status as associado_status, 
          a.categoria, a.valor_contribuicao_sugerido, a.periodicidade, a.isento, a.dia_vencimento,
          COALESCE(tc.total_contribuicoes, 0) as total_contribuicoes,
          COALESCE(tc.valor_total, 0) as valor_total
        FROM pessoa p
        LEFT JOIN associado a ON a.pessoa_id = p.id
        LEFT JOIN pessoa_documento pd ON pd.pessoa_id = p.id
        LEFT JOIN (
          SELECT pessoa_id, COUNT(*) as total_contribuicoes, SUM(CAST(valor_liquido AS NUMERIC)) as valor_total
          FROM titulo WHERE deleted_at IS NULL AND tipo = 'receber'
          GROUP BY pessoa_id
        ) tc ON tc.pessoa_id = p.id
        WHERE p.deleted_at IS NULL
          ${input?.tipo ? sql`AND p.tipo = ${input.tipo}` : sql``}
          ${input?.apenasAssociados ? sql`AND a.id IS NOT NULL` : sql``}
          ${input?.search ? sql`AND (
            p.nome ILIKE ${'%' + input.search + '%'} 
            OR pd.numero LIKE ${'%' + searchTerm + '%'}
          )` : sql``}
        ORDER BY p.nome ASC
        LIMIT ${limit} OFFSET ${offset}
      `);

      // Count com busca por nome ou documento
      const countQuery = await db.execute(sql`
        SELECT COUNT(DISTINCT p.id) as count
        FROM pessoa p
        LEFT JOIN associado a ON a.pessoa_id = p.id
        LEFT JOIN pessoa_documento pd ON pd.pessoa_id = p.id
        WHERE p.deleted_at IS NULL
          ${input?.tipo ? sql`AND p.tipo = ${input.tipo}` : sql``}
          ${input?.apenasAssociados ? sql`AND a.id IS NOT NULL` : sql``}
          ${input?.search ? sql`AND (
            p.nome ILIKE ${'%' + input.search + '%'} 
            OR pd.numero LIKE ${'%' + searchTerm + '%'}
          )` : sql``}
      `);
      const countResult = { count: Number(countQuery.rows[0]?.count || 0) };

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

  // Saúde cadastral - métricas de completude dos dados
  healthStats: publicProcedure.query(async () => {
    const db = await getDb();
    
    // Total de pessoas ativas
    const [totalResult] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.pessoa)
      .where(isNull(schema.pessoa.deletedAt));
    const total = Number(totalResult.count) || 0;
    
    if (total === 0) {
      return {
        total: 0,
        comCpf: 0, percentualCpf: 0,
        comEmail: 0, percentualEmail: 0,
        comTelefone: 0, percentualTelefone: 0,
        comEndereco: 0, percentualEndereco: 0,
        comDoacoes: 0, percentualDoacoes: 0,
        semDoacoes: 0,
        totalArrecadado: 0,
        mediaPorDoacao: 0,
        alertas: [],
      };
    }
    
    // Pessoas com CPF/CNPJ
    const cpfResult = await db.execute(sql`
      SELECT COUNT(DISTINCT p.id) as count FROM pessoa p
      INNER JOIN pessoa_documento pd ON pd.pessoa_id = p.id
      WHERE p.deleted_at IS NULL
    `);
    const comCpf = Number((cpfResult.rows[0] as any)?.count) || 0;
    
    // Pessoas com Email
    const emailResult = await db.execute(sql`
      SELECT COUNT(DISTINCT p.id) as count FROM pessoa p
      INNER JOIN pessoa_contato pc ON pc.pessoa_id = p.id AND pc.tipo = 'email'
      WHERE p.deleted_at IS NULL
    `);
    const comEmail = Number((emailResult.rows[0] as any)?.count) || 0;
    
    // Pessoas com Telefone
    const telResult = await db.execute(sql`
      SELECT COUNT(DISTINCT p.id) as count FROM pessoa p
      INNER JOIN pessoa_contato pc ON pc.pessoa_id = p.id AND pc.tipo IN ('telefone', 'celular', 'whatsapp')
      WHERE p.deleted_at IS NULL
    `);
    const comTelefone = Number((telResult.rows[0] as any)?.count) || 0;
    
    // Pessoas com Endereço
    const endResult = await db.execute(sql`
      SELECT COUNT(DISTINCT p.id) as count FROM pessoa p
      INNER JOIN pessoa_endereco pe ON pe.pessoa_id = p.id
      WHERE p.deleted_at IS NULL
    `);
    const comEndereco = Number((endResult.rows[0] as any)?.count) || 0;
    
    // Pessoas com doações
    const doacoesResult = await db.execute(sql`
      SELECT 
        COUNT(DISTINCT t.pessoa_id) as doadores,
        COALESCE(SUM(CAST(t.valor_liquido AS NUMERIC)), 0) as total_arrecadado,
        COUNT(t.id) as total_doacoes
      FROM titulo t
      WHERE t.deleted_at IS NULL AND t.tipo = 'receber'
    `);
    const comDoacoes = Number((doacoesResult.rows[0] as any)?.doadores) || 0;
    const totalArrecadado = parseFloat((doacoesResult.rows[0] as any)?.total_arrecadado) || 0;
    const totalDoacoes = Number((doacoesResult.rows[0] as any)?.total_doacoes) || 0;
    
    // Montar alertas
    const alertas: { tipo: 'critico' | 'alerta' | 'info'; titulo: string; descricao: string; quantidade: number }[] = [];
    
    const semCpf = total - comCpf;
    if (semCpf > 0) {
      alertas.push({
        tipo: 'critico',
        titulo: `${semCpf} pessoas sem CPF/CNPJ`,
        descricao: 'Impossível emitir recibos legais para doadores sem documento fiscal',
        quantidade: semCpf,
      });
    }
    
    const semContato = total - Math.max(comEmail, comTelefone);
    if (semContato > 0) {
      alertas.push({
        tipo: 'critico',
        titulo: `${semContato} pessoas sem contato`,
        descricao: 'Sem email ou telefone é impossível comunicar-se com esses cadastros',
        quantidade: semContato,
      });
    }
    
    const semDoacoes = total - comDoacoes;
    if (semDoacoes > 0) {
      alertas.push({
        tipo: 'alerta',
        titulo: `${semDoacoes} pessoas nunca doaram`,
        descricao: 'Cadastros que nunca realizaram contribuições',
        quantidade: semDoacoes,
      });
    }
    
    return {
      total,
      comCpf,
      percentualCpf: Math.round((comCpf / total) * 100),
      comEmail,
      percentualEmail: Math.round((comEmail / total) * 100),
      comTelefone,
      percentualTelefone: Math.round((comTelefone / total) * 100),
      comEndereco,
      percentualEndereco: Math.round((comEndereco / total) * 100),
      comDoacoes,
      percentualDoacoes: Math.round((comDoacoes / total) * 100),
      semDoacoes: total - comDoacoes,
      totalArrecadado,
      mediaPorDoacao: totalDoacoes > 0 ? totalArrecadado / totalDoacoes : 0,
      alertas,
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

  // Listar inconsistências entre rawdata e banco de dados
  inconsistencias: publicProcedure.query(async () => {
    const db = await getDb();
    
    // Buscar todas as pessoas cadastradas para match
    const todasPessoas = await db.execute(sql`
      SELECT id, nome, UPPER(TRIM(nome)) as nome_normalizado
      FROM pessoa WHERE deleted_at IS NULL
    `);
    
    const pessoasMap = new Map<string, { id: string; nome: string }>();
    for (const p of todasPessoas.rows as any[]) {
      pessoasMap.set(p.nome_normalizado, { id: p.id, nome: p.nome });
    }
    
    // Buscar títulos sem pessoa_id ou com pessoa não encontrada
    const titulosSemPessoa = await db.execute(sql`
      SELECT t.id, t.descricao, t.valor_liquido, t.data_competencia, t.natureza,
             p.id as pessoa_id, p.nome as pessoa_nome
      FROM titulo t
      LEFT JOIN pessoa p ON t.pessoa_id = p.id
      WHERE t.deleted_at IS NULL 
        AND t.tipo = 'receber'
        AND (t.pessoa_id IS NULL OR p.id IS NULL)
      ORDER BY t.data_competencia DESC
      LIMIT 100
    `);
    
    // Buscar títulos que podem ter match de nome incorreto
    // (título tem pessoa, mas descrição contém nome diferente)
    const titulosComNomeDiferente = await db.execute(sql`
      SELECT t.id, t.descricao, t.valor_liquido, t.data_competencia, t.natureza,
             p.id as pessoa_id, p.nome as pessoa_nome
      FROM titulo t
      LEFT JOIN pessoa p ON t.pessoa_id = p.id
      WHERE t.deleted_at IS NULL 
        AND t.tipo = 'receber'
        AND t.pessoa_id IS NOT NULL
      ORDER BY t.data_competencia DESC
      LIMIT 500
    `);
    
    // Identificar pessoas que nunca doaram (cadastradas mas sem títulos)
    const pessoasSemDoacoes = await db.execute(sql`
      SELECT p.id, p.nome, p.tipo,
             CASE WHEN a.id IS NOT NULL THEN true ELSE false END as is_associado
      FROM pessoa p
      LEFT JOIN associado a ON a.pessoa_id = p.id
      LEFT JOIN titulo t ON t.pessoa_id = p.id AND t.deleted_at IS NULL AND t.tipo = 'receber'
      WHERE p.deleted_at IS NULL AND t.id IS NULL
      ORDER BY p.nome
      LIMIT 50
    `);
    
    // Estatísticas
    const [stats] = await db.execute(sql`
      SELECT 
        COUNT(DISTINCT CASE WHEN t.pessoa_id IS NULL THEN t.id END) as titulos_sem_pessoa,
        COUNT(DISTINCT p.id) FILTER (WHERE NOT EXISTS (
          SELECT 1 FROM titulo t2 WHERE t2.pessoa_id = p.id AND t2.deleted_at IS NULL
        )) as pessoas_sem_titulo
      FROM pessoa p
      LEFT JOIN titulo t ON t.pessoa_id = p.id AND t.deleted_at IS NULL
      WHERE p.deleted_at IS NULL
    `);
    
    return {
      titulosSemPessoa: titulosSemPessoa.rows.map((t: any) => ({
        id: t.id,
        descricao: t.descricao,
        valor: parseFloat(t.valor_liquido),
        dataCompetencia: t.data_competencia,
        natureza: t.natureza,
        pessoaId: t.pessoa_id,
        pessoaNome: t.pessoa_nome,
      })),
      pessoasSemDoacoes: pessoasSemDoacoes.rows.map((p: any) => ({
        id: p.id,
        nome: p.nome,
        tipo: p.tipo,
        isAssociado: p.is_associado,
      })),
      stats: {
        titulosSemPessoa: Number((stats.rows[0] as any)?.titulos_sem_pessoa) || 0,
        pessoasSemTitulo: Number((stats.rows[0] as any)?.pessoas_sem_titulo) || 0,
      },
    };
  }),

  // Buscar pessoas similares para sugestão de vinculação
  buscarSimilares: publicProcedure
    .input(z.object({ nome: z.string().min(2) }))
    .query(async ({ input }) => {
      const db = await getDb();
      const nomeNormalizado = input.nome.trim().toUpperCase();
      
      // Busca por similaridade usando trigrams ou LIKE
      const similares = await db.execute(sql`
        SELECT id, nome, tipo,
               similarity(UPPER(TRIM(nome)), ${nomeNormalizado}) as score
        FROM pessoa 
        WHERE deleted_at IS NULL 
          AND (
            UPPER(TRIM(nome)) LIKE ${'%' + nomeNormalizado.split(' ')[0] + '%'}
            OR similarity(UPPER(TRIM(nome)), ${nomeNormalizado}) > 0.2
          )
        ORDER BY similarity(UPPER(TRIM(nome)), ${nomeNormalizado}) DESC
        LIMIT 10
      `);
      
      // Fallback para busca simples se trigrams não estiver disponível
      if (similares.rows.length === 0) {
        const primeiroNome = nomeNormalizado.split(' ')[0];
        const fallback = await db.execute(sql`
          SELECT id, nome, tipo, 0.5 as score
          FROM pessoa 
          WHERE deleted_at IS NULL 
            AND UPPER(TRIM(nome)) LIKE ${'%' + primeiroNome + '%'}
          ORDER BY nome
          LIMIT 10
        `);
        return fallback.rows.map((p: any) => ({
          id: p.id,
          nome: p.nome,
          tipo: p.tipo,
          score: p.score,
        }));
      }
      
      return similares.rows.map((p: any) => ({
        id: p.id,
        nome: p.nome,
        tipo: p.tipo,
        score: parseFloat(p.score) || 0.5,
      }));
    }),

  // Vincular título a uma pessoa
  vincularTitulo: protectedProcedure
    .input(z.object({
      tituloId: z.string().uuid(),
      pessoaId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Verificar se o título existe
      const [titulo] = await db.select().from(schema.titulo).where(eq(schema.titulo.id, input.tituloId));
      if (!titulo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Título não encontrado' });
      
      // Verificar se a pessoa existe
      const [pessoa] = await db.select().from(schema.pessoa).where(eq(schema.pessoa.id, input.pessoaId));
      if (!pessoa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Pessoa não encontrada' });
      
      // Atualizar o título
      await db.update(schema.titulo)
        .set({ 
          pessoaId: input.pessoaId,
          updatedAt: new Date(),
        })
        .where(eq(schema.titulo.id, input.tituloId));
      
      return { success: true, tituloId: input.tituloId, pessoaId: input.pessoaId };
    }),

  // Criar pessoa e vincular título em uma única operação
  criarEVincular: protectedProcedure
    .input(z.object({
      tituloId: z.string().uuid(),
      nome: z.string().min(2),
      tipo: z.enum(['fisica', 'juridica']).default('fisica'),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      // Verificar se o título existe
      const [titulo] = await db.select().from(schema.titulo).where(eq(schema.titulo.id, input.tituloId));
      if (!titulo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Título não encontrado' });
      
      // Criar nova pessoa usando SQL direto
      const novaPessoaResult = await db.execute(sql`
        INSERT INTO pessoa (nome, tipo)
        VALUES (${input.nome.trim()}, ${input.tipo})
        RETURNING id
      `);
      const novaPessoaId = (novaPessoaResult.rows[0] as any).id;
      
      // Vincular ao título
      await db.update(schema.titulo)
        .set({ 
          pessoaId: novaPessoaId,
          updatedAt: new Date(),
        })
        .where(eq(schema.titulo.id, input.tituloId));
      
      return { success: true, pessoaId: novaPessoaId, tituloId: input.tituloId };
    }),

  // ==================== CRUD COMPLETO ====================

  // Buscar pessoa com todos os dados relacionados
  getFullById: publicProcedure.input(z.string().uuid()).query(async ({ input }) => {
    const db = await getDb();
    
    const [pessoa] = await db.select().from(schema.pessoa).where(eq(schema.pessoa.id, input));
    if (!pessoa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Pessoa não encontrada' });
    
    const documentos = await db.select().from(schema.pessoaDocumento).where(eq(schema.pessoaDocumento.pessoaId, input));
    const contatos = await db.select().from(schema.pessoaContato).where(eq(schema.pessoaContato.pessoaId, input));
    const enderecos = await db.select().from(schema.pessoaEndereco).where(eq(schema.pessoaEndereco.pessoaId, input));
    const [associado] = await db.select().from(schema.associado).where(eq(schema.associado.pessoaId, input));
    const papeis = await db.select().from(schema.pessoaPapel).where(eq(schema.pessoaPapel.pessoaId, input));
    const consentimentos = await db.select().from(schema.consentimentoLgpd).where(eq(schema.consentimentoLgpd.pessoaId, input));
    
    return {
      ...pessoa,
      documentos,
      contatos,
      enderecos,
      associado: associado || null,
      isAssociado: !!associado,
      papeis,
      consentimentos,
    };
  }),

  // Atualizar dados básicos da pessoa
  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      nome: z.string().min(2).max(255),
      nomeFantasia: z.string().max(255).nullable().optional(),
      tipo: z.enum(['fisica', 'juridica']),
      observacoes: z.string().nullable().optional(),
      // Campos de Mediunidade - Centro Espírita
      dataInicioDesenvolvimento: z.string().nullable().optional(),
      tiposMediunidade: z.array(z.string()).nullable().optional(),
      observacoesMediunidade: z.string().nullable().optional(),
      grupoEstudoId: z.string().uuid().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      const [existing] = await db.select().from(schema.pessoa).where(eq(schema.pessoa.id, input.id));
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Pessoa não encontrada' });
      
      await db.update(schema.pessoa)
        .set({
          nome: input.nome.trim(),
          nomeFantasia: input.nomeFantasia?.trim() || null,
          tipo: input.tipo,
          observacoes: input.observacoes || null,
          dataInicioDesenvolvimento: input.dataInicioDesenvolvimento || null,
          tiposMediunidade: input.tiposMediunidade || null,
          observacoesMediunidade: input.observacoesMediunidade || null,
          grupoEstudoId: input.grupoEstudoId || null,
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(schema.pessoa.id, input.id));
      
      return { success: true };
    }),

  // Inativar pessoa (soft-delete)
  inativar: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      motivo: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      const [existing] = await db.select().from(schema.pessoa).where(eq(schema.pessoa.id, input.id));
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Pessoa não encontrada' });
      
      await db.update(schema.pessoa)
        .set({
          ativo: false,
          deletedAt: new Date(),
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
          observacoes: input.motivo 
            ? `${existing.observacoes || ''}\n[INATIVADO ${new Date().toISOString().split('T')[0]}]: ${input.motivo}`.trim()
            : existing.observacoes,
        })
        .where(eq(schema.pessoa.id, input.id));
      
      return { success: true };
    }),

  // Reativar pessoa
  reativar: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      await db.update(schema.pessoa)
        .set({
          ativo: true,
          deletedAt: null,
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(schema.pessoa.id, input));
      
      return { success: true };
    }),

  // ==================== DOCUMENTOS ====================
  addDocumento: protectedProcedure
    .input(z.object({
      pessoaId: z.string().uuid(),
      tipo: z.enum(['cpf', 'cnpj', 'rg', 'ie', 'im']),
      numero: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const numero = input.numero.replace(/\D/g, '');
      
      // Verificar duplicidade
      const [existing] = await db.select().from(schema.pessoaDocumento)
        .where(and(eq(schema.pessoaDocumento.pessoaId, input.pessoaId), eq(schema.pessoaDocumento.tipo, input.tipo)));
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Já existe um documento deste tipo' });
      
      const [doc] = await db.insert(schema.pessoaDocumento).values({
        pessoaId: input.pessoaId,
        tipo: input.tipo,
        numero,
      }).returning();
      
      return doc;
    }),

  removeDocumento: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.delete(schema.pessoaDocumento).where(eq(schema.pessoaDocumento.id, input));
      return { success: true };
    }),

  // ==================== CONTATOS ====================
  addContato: protectedProcedure
    .input(z.object({
      pessoaId: z.string().uuid(),
      tipo: z.enum(['email', 'telefone', 'celular', 'whatsapp']),
      valor: z.string().min(1),
      principal: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      // Se marcado como principal, desmarcar outros
      if (input.principal) {
        await db.update(schema.pessoaContato)
          .set({ principal: false })
          .where(eq(schema.pessoaContato.pessoaId, input.pessoaId));
      }
      
      const [contato] = await db.insert(schema.pessoaContato).values({
        pessoaId: input.pessoaId,
        tipo: input.tipo,
        valor: input.valor.trim(),
        principal: input.principal,
      }).returning();
      
      return contato;
    }),

  updateContato: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      tipo: z.enum(['email', 'telefone', 'celular', 'whatsapp']).optional(),
      valor: z.string().min(1).optional(),
      principal: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      const [existing] = await db.select().from(schema.pessoaContato).where(eq(schema.pessoaContato.id, input.id));
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Contato não encontrado' });
      
      // Se marcado como principal, desmarcar outros
      if (input.principal) {
        await db.update(schema.pessoaContato)
          .set({ principal: false })
          .where(eq(schema.pessoaContato.pessoaId, existing.pessoaId));
      }
      
      await db.update(schema.pessoaContato)
        .set({
          tipo: input.tipo || existing.tipo,
          valor: input.valor?.trim() || existing.valor,
          principal: input.principal ?? existing.principal,
          updatedAt: new Date(),
        })
        .where(eq(schema.pessoaContato.id, input.id));
      
      return { success: true };
    }),

  removeContato: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.delete(schema.pessoaContato).where(eq(schema.pessoaContato.id, input));
      return { success: true };
    }),

  // ==================== ENDEREÇOS ====================
  addEndereco: protectedProcedure
    .input(z.object({
      pessoaId: z.string().uuid(),
      tipo: z.enum(['residencial', 'comercial', 'correspondencia']),
      logradouro: z.string().min(1),
      numero: z.string().nullable().optional(),
      complemento: z.string().nullable().optional(),
      bairro: z.string().nullable().optional(),
      cidade: z.string().min(1),
      uf: z.string().length(2),
      cep: z.string().nullable().optional(),
      principal: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      // Se marcado como principal, desmarcar outros
      if (input.principal) {
        await db.update(schema.pessoaEndereco)
          .set({ principal: false })
          .where(eq(schema.pessoaEndereco.pessoaId, input.pessoaId));
      }
      
      const [endereco] = await db.insert(schema.pessoaEndereco).values({
        pessoaId: input.pessoaId,
        tipo: input.tipo,
        logradouro: input.logradouro.trim(),
        numero: input.numero?.trim() || null,
        complemento: input.complemento?.trim() || null,
        bairro: input.bairro?.trim() || null,
        cidade: input.cidade.trim(),
        uf: input.uf.toUpperCase(),
        cep: input.cep?.replace(/\D/g, '') || null,
        principal: input.principal,
      }).returning();
      
      return endereco;
    }),

  updateEndereco: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      tipo: z.enum(['residencial', 'comercial', 'correspondencia']).optional(),
      logradouro: z.string().min(1).optional(),
      numero: z.string().nullable().optional(),
      complemento: z.string().nullable().optional(),
      bairro: z.string().nullable().optional(),
      cidade: z.string().min(1).optional(),
      uf: z.string().length(2).optional(),
      cep: z.string().nullable().optional(),
      principal: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      const [existing] = await db.select().from(schema.pessoaEndereco).where(eq(schema.pessoaEndereco.id, input.id));
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Endereço não encontrado' });
      
      // Se marcado como principal, desmarcar outros
      if (input.principal) {
        await db.update(schema.pessoaEndereco)
          .set({ principal: false })
          .where(eq(schema.pessoaEndereco.pessoaId, existing.pessoaId));
      }
      
      await db.update(schema.pessoaEndereco)
        .set({
          tipo: input.tipo || existing.tipo,
          logradouro: input.logradouro?.trim() || existing.logradouro,
          numero: input.numero !== undefined ? (input.numero?.trim() || null) : existing.numero,
          complemento: input.complemento !== undefined ? (input.complemento?.trim() || null) : existing.complemento,
          bairro: input.bairro !== undefined ? (input.bairro?.trim() || null) : existing.bairro,
          cidade: input.cidade?.trim() || existing.cidade,
          uf: input.uf?.toUpperCase() || existing.uf,
          cep: input.cep !== undefined ? (input.cep?.replace(/\D/g, '') || null) : existing.cep,
          principal: input.principal ?? existing.principal,
          updatedAt: new Date(),
        })
        .where(eq(schema.pessoaEndereco.id, input.id));
      
      return { success: true };
    }),

  removeEndereco: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.delete(schema.pessoaEndereco).where(eq(schema.pessoaEndereco.id, input));
      return { success: true };
    }),

  // ==================== ASSOCIADO ====================
  updateAssociado: protectedProcedure
    .input(z.object({
      pessoaId: z.string().uuid(),
      numeroRegistro: z.string().nullable().optional(),
      dataAdmissao: z.string(),
      status: z.enum(['ativo', 'suspenso', 'desligado', 'falecido']),
      categoria: z.enum(['trabalhador', 'frequentador', 'benemerito', 'honorario', 'medium', 'passista', 'orientador_estudo', 'evangelizador', 'moceiro', 'assistido']),
      periodicidade: z.enum(['mensal', 'trimestral', 'semestral', 'anual']).default('mensal'),
      valorContribuicaoSugerido: z.string().nullable().optional(),
      diaVencimento: z.number().min(1).max(28).nullable().optional(),
      isento: z.boolean().default(false),
      motivoIsencao: z.string().nullable().optional(),
      dataDesligamento: z.string().nullable().optional(),
      motivoStatusChange: z.string().min(10).nullable().optional(), // Motivo obrigatório quando status muda
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Verificar se já é associado
      const [existing] = await db.select().from(schema.associado).where(eq(schema.associado.pessoaId, input.pessoaId));
      
      const data = {
        pessoaId: input.pessoaId,
        numeroRegistro: input.numeroRegistro || null,
        dataAdmissao: input.dataAdmissao,
        dataDesligamento: input.dataDesligamento || null,
        status: input.status,
        categoria: input.categoria,
        periodicidade: input.periodicidade,
        valorContribuicaoSugerido: input.valorContribuicaoSugerido || null,
        diaVencimento: input.diaVencimento || null,
        isento: input.isento,
        motivoIsencao: input.isento ? (input.motivoIsencao || null) : null,
        updatedAt: new Date(),
        updatedBy: ctx.user.id,
      };
      
      if (existing) {
        // Registrar histórico se status mudou
        if (existing.status !== input.status) {
          await db.insert(schema.associadoHistorico).values({
            associadoId: existing.id,
            campoAlterado: 'status',
            valorAnterior: existing.status,
            valorNovo: input.status,
            motivo: input.motivoStatusChange || `Alteração de ${existing.status} para ${input.status}`,
            dataAlteracao: new Date(),
            alteradoPor: ctx.user.id,
          });
        }
        
        await db.update(schema.associado).set(data).where(eq(schema.associado.id, existing.id));
        return { id: existing.id, created: false };
      } else {
        const [newAssoc] = await db.insert(schema.associado).values({
          ...data,
          createdBy: ctx.user.id,
        }).returning();
        return { id: newAssoc.id, created: true };
      }
    }),

  removeAssociado: protectedProcedure
    .input(z.object({
      pessoaId: z.string().uuid(),
      motivo: z.string().min(5),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      const [existing] = await db.select().from(schema.associado).where(eq(schema.associado.pessoaId, input.pessoaId));
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Associado não encontrado' });
      
      // Registrar histórico
      await db.insert(schema.associadoHistorico).values({
        associadoId: existing.id,
        campoAlterado: 'removido',
        valorAnterior: existing.status,
        valorNovo: 'removido',
        motivo: input.motivo,
        dataAlteracao: new Date(),
        alteradoPor: ctx.user.id,
      });
      
      await db.delete(schema.associado).where(eq(schema.associado.id, existing.id));
      return { success: true };
    }),

  // Histórico de alterações do associado
  getAssociadoHistorico: publicProcedure
    .input(z.string().uuid())
    .query(async ({ input: pessoaId }) => {
      const db = await getDb();
      
      const [associado] = await db.select().from(schema.associado).where(eq(schema.associado.pessoaId, pessoaId));
      if (!associado) return [];
      
      const historico = await db.select().from(schema.associadoHistorico)
        .where(eq(schema.associadoHistorico.associadoId, associado.id))
        .orderBy(sql`data_alteracao DESC`);
      
      return historico;
    }),

  // ==================== CONSENTIMENTO LGPD ====================
  // Conforme Lei 13.709/2018 (Lei Geral de Proteção de Dados)
  
  listConsentimentos: publicProcedure
    .input(z.string().uuid())
    .query(async ({ input: pessoaId }) => {
      const db = await getDb();
      const consentimentos = await db.select().from(schema.consentimentoLgpd)
        .where(eq(schema.consentimentoLgpd.pessoaId, pessoaId))
        .orderBy(sql`created_at DESC`);
      return consentimentos;
    }),

  addConsentimento: protectedProcedure
    .input(z.object({
      pessoaId: z.string().uuid(),
      tipoTratamento: z.enum(['marketing', 'comunicacao', 'compartilhamento', 'dados_sensiveis']),
      baseLegal: z.enum(['consentimento', 'legitimo_interesse', 'obrigacao_legal', 'execucao_contrato']),
      consentido: z.boolean(),
      evidencia: z.string().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      const [created] = await db.insert(schema.consentimentoLgpd)
        .values({
          pessoaId: input.pessoaId,
          tipoTratamento: input.tipoTratamento,
          baseLegal: input.baseLegal,
          consentido: input.consentido,
          dataConsentimento: new Date(),
          evidencia: input.evidencia || null,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning();
      
      return created;
    }),

  updateConsentimento: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      consentido: z.boolean(),
      evidencia: z.string().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      await db.update(schema.consentimentoLgpd)
        .set({
          consentido: input.consentido,
          evidencia: input.evidencia || null,
          dataRevogacao: input.consentido ? null : new Date(),
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(schema.consentimentoLgpd.id, input.id));
      
      return { success: true };
    }),

  revogarConsentimento: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      await db.update(schema.consentimentoLgpd)
        .set({
          consentido: false,
          dataRevogacao: new Date(),
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(schema.consentimentoLgpd.id, input));
      
      return { success: true };
    }),

  // ==================== UX SPEC V2: DUPLICIDADE ====================
  // Verifica se existe CPF/CNPJ duplicado (ativo ou inativo)
  checkDuplicidade: publicProcedure
    .input(z.object({
      documento: z.string().min(11).max(14),
      tipo: z.enum(['cpf', 'cnpj']),
      excluirPessoaId: z.string().uuid().optional(), // Exclui a própria pessoa na edição
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const numeroLimpo = input.documento.replace(/\D/g, '');
      
      if (numeroLimpo.length < 11) return { encontrado: false };
      
      // Busca documento em pessoa_documento
      const results = await db.select({
        pessoaId: schema.pessoaDocumento.pessoaId,
        nome: schema.pessoa.nome,
        ativo: schema.pessoa.ativo,
        deletedAt: schema.pessoa.deletedAt,
      })
        .from(schema.pessoaDocumento)
        .innerJoin(schema.pessoa, eq(schema.pessoa.id, schema.pessoaDocumento.pessoaId))
        .where(and(
          eq(schema.pessoaDocumento.tipo, input.tipo),
          eq(schema.pessoaDocumento.numero, numeroLimpo),
          input.excluirPessoaId ? sql`${schema.pessoaDocumento.pessoaId} != ${input.excluirPessoaId}` : sql`1=1`
        ));
      
      if (results.length === 0) return { encontrado: false };
      
      const pessoa = results[0];
      const isInativo = !pessoa.ativo || pessoa.deletedAt !== null;
      
      return {
        encontrado: true,
        pessoaId: pessoa.pessoaId,
        nome: pessoa.nome,
        ativo: pessoa.ativo && !pessoa.deletedAt,
        inativo: isInativo,
        // Mascarar CPF para privacidade
        documentoMascarado: input.tipo === 'cpf' 
          ? `***${numeroLimpo.slice(3, 6)}***${numeroLimpo.slice(-2)}`
          : `${numeroLimpo.slice(0, 2)}.***.***/****-${numeroLimpo.slice(-2)}`,
      };
    }),

  // Busca por nome aproximado para detectar possíveis duplicidades
  checkDuplicidadeNome: publicProcedure
    .input(z.object({
      nome: z.string().min(3),
      excluirPessoaId: z.string().uuid().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const nomeBusca = input.nome.trim().toLowerCase();
      
      if (nomeBusca.length < 3) return { possiveis: [] };
      
      // Busca fonética/aproximada usando ILIKE
      const results = await db.select({
        id: schema.pessoa.id,
        nome: schema.pessoa.nome,
        ativo: schema.pessoa.ativo,
      })
        .from(schema.pessoa)
        .where(and(
          sql`LOWER(${schema.pessoa.nome}) LIKE ${'%' + nomeBusca + '%'}`,
          isNull(schema.pessoa.deletedAt),
          input.excluirPessoaId ? sql`${schema.pessoa.id} != ${input.excluirPessoaId}` : sql`1=1`
        ))
        .limit(5);
      
      return {
        possiveis: results.map(r => ({
          id: r.id,
          nome: r.nome,
          ativo: r.ativo,
        })),
      };
    }),

  // Salvar rascunho - permite salvar sem validações obrigatórias
  saveDraft: protectedProcedure
    .input(z.object({
      id: z.string().uuid().optional(), // Se informado, atualiza; senão, cria
      tipo: z.enum(['fisica', 'juridica']).optional(),
      nome: z.string().optional(),
      nomeFantasia: z.string().nullable().optional(),
      observacoes: z.string().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      if (input.id) {
        // Atualizar rascunho existente
        await db.update(schema.pessoa)
          .set({
            tipo: input.tipo,
            nome: input.nome?.trim(),
            nomeFantasia: input.nomeFantasia?.trim() || null,
            observacoes: input.observacoes?.trim() || null,
            updatedAt: new Date(),
            updatedBy: ctx.user.id,
          })
          .where(eq(schema.pessoa.id, input.id));
        
        return { id: input.id, created: false };
      } else {
        // Criar novo rascunho com valores mínimos
        const [newPessoa] = await db.insert(schema.pessoa).values({
          tipo: input.tipo || 'fisica',
          nome: input.nome?.trim() || 'Rascunho',
          nomeFantasia: input.nomeFantasia?.trim() || null,
          observacoes: input.observacoes?.trim() || null,
          ativo: true,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        }).returning();
        
        return { id: newPessoa.id, created: true };
      }
    }),

  // Calcula pendências de um cadastro
  getPendencias: publicProcedure
    .input(z.string().uuid())
    .query(async ({ input: pessoaId }) => {
      const db = await getDb();
      
      const [pessoa] = await db.select().from(schema.pessoa).where(eq(schema.pessoa.id, pessoaId));
      if (!pessoa) return { pendencias: [], completo: false };
      
      const documentos = await db.select().from(schema.pessoaDocumento).where(eq(schema.pessoaDocumento.pessoaId, pessoaId));
      const contatos = await db.select().from(schema.pessoaContato).where(eq(schema.pessoaContato.pessoaId, pessoaId));
      const enderecos = await db.select().from(schema.pessoaEndereco).where(eq(schema.pessoaEndereco.pessoaId, pessoaId));
      
      const pendencias: { campo: string; mensagem: string; criticidade: 'info' | 'warning' | 'bloqueio' }[] = [];
      
      // Verificar nome
      if (!pessoa.nome || pessoa.nome.length < 3 || pessoa.nome === 'Rascunho') {
        pendencias.push({ campo: 'nome', mensagem: 'Nome completo não informado', criticidade: 'bloqueio' });
      }
      
      // Verificar CPF/CNPJ
      const temCpfCnpj = documentos.some(d => d.tipo === 'cpf' || d.tipo === 'cnpj');
      if (!temCpfCnpj) {
        pendencias.push({ 
          campo: 'documento', 
          mensagem: pessoa.tipo === 'fisica' ? 'CPF não informado (necessário para recibos)' : 'CNPJ não informado',
          criticidade: 'warning' 
        });
      }
      
      // Verificar contato principal
      const temContatoPrincipal = contatos.some(c => c.principal);
      if (contatos.length > 0 && !temContatoPrincipal) {
        pendencias.push({ campo: 'contato', mensagem: 'Nenhum contato marcado como principal', criticidade: 'warning' });
      }
      if (contatos.length === 0) {
        pendencias.push({ campo: 'contato', mensagem: 'Nenhum contato cadastrado', criticidade: 'info' });
      }
      
      // Verificar endereço
      if (enderecos.length === 0) {
        pendencias.push({ campo: 'endereco', mensagem: 'Nenhum endereço cadastrado', criticidade: 'info' });
      }
      
      return {
        pendencias,
        completo: pendencias.filter(p => p.criticidade === 'bloqueio').length === 0,
        totalPendencias: pendencias.length,
      };
    }),
});

// ==================== PAPÉIS DE PESSOAS ROUTER ====================
// Conforme Lei 10.406/2002 (Código Civil) e Lei 9.790/1999 (OSCIP)
const pessoaPapelRouter = router({
  list: publicProcedure
    .input(z.object({
      pessoaId: z.string().uuid().optional(),
      papelTipo: z.enum(['captador_doacao', 'administrador_financeiro', 'diretor', 'conselheiro', 'voluntario']).optional(),
      status: z.enum(['ativo', 'suspenso', 'encerrado']).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const results = await db.execute(sql`
        SELECT 
          pp.id, pp.pessoa_id, pp.papel_tipo, pp.data_inicio, pp.data_fim, 
          pp.status, pp.ato_designacao, pp.observacoes, pp.created_at,
          p.nome as pessoa_nome, p.tipo as pessoa_tipo,
          cd.id as captador_id, cd.regiao_atuacao, cd.meta_captacao_anual, 
          cd.total_captado_acumulado, cd.quantidade_doacoes,
          af.id as admin_id, af.responsabilidades, af.alcada_valor_maximo,
          af.pode_aprovar_pagamentos, af.acesso_contas_bancarias, af.cargo_estatutario
        FROM pessoa_papel pp
        INNER JOIN pessoa p ON pp.pessoa_id = p.id
        LEFT JOIN captador_doacao cd ON cd.pessoa_papel_id = pp.id
        LEFT JOIN administrador_financeiro af ON af.pessoa_papel_id = pp.id
        WHERE 1=1
          ${input?.pessoaId ? sql`AND pp.pessoa_id = ${input.pessoaId}` : sql``}
          ${input?.papelTipo ? sql`AND pp.papel_tipo = ${input.papelTipo}` : sql``}
          ${input?.status ? sql`AND pp.status = ${input.status}` : sql``}
        ORDER BY pp.created_at DESC
      `);

      return results.rows.map((r: any) => ({
        id: r.id,
        pessoaId: r.pessoa_id,
        pessoaNome: r.pessoa_nome,
        pessoaTipo: r.pessoa_tipo,
        papelTipo: r.papel_tipo,
        dataInicio: r.data_inicio,
        dataFim: r.data_fim,
        status: r.status,
        atoDesignacao: r.ato_designacao,
        observacoes: r.observacoes,
        createdAt: r.created_at,
        captadorDoacao: r.captador_id ? {
          id: r.captador_id,
          regiaoAtuacao: r.regiao_atuacao,
          metaCaptacaoAnual: parseFloat(r.meta_captacao_anual) || null,
          totalCaptadoAcumulado: parseFloat(r.total_captado_acumulado) || 0,
          quantidadeDoacoes: Number(r.quantidade_doacoes) || 0,
        } : null,
        administradorFinanceiro: r.admin_id ? {
          id: r.admin_id,
          responsabilidades: r.responsabilidades,
          alcadaValorMaximo: parseFloat(r.alcada_valor_maximo) || null,
          podeAprovarPagamentos: r.pode_aprovar_pagamentos,
          acessoContasBancarias: r.acesso_contas_bancarias,
          cargoEstatutario: r.cargo_estatutario,
        } : null,
      }));
    }),

  getById: publicProcedure.input(z.string().uuid()).query(async ({ input }) => {
    const db = await getDb();
    const results = await db.execute(sql`
      SELECT 
        pp.*, p.nome as pessoa_nome, p.tipo as pessoa_tipo,
        cd.id as captador_id, cd.regiao_atuacao, cd.meta_captacao_anual, 
        cd.total_captado_acumulado, cd.quantidade_doacoes,
        af.id as admin_id, af.responsabilidades, af.alcada_valor_maximo,
        af.pode_aprovar_pagamentos, af.acesso_contas_bancarias, af.cargo_estatutario
      FROM pessoa_papel pp
      INNER JOIN pessoa p ON pp.pessoa_id = p.id
      LEFT JOIN captador_doacao cd ON cd.pessoa_papel_id = pp.id
      LEFT JOIN administrador_financeiro af ON af.pessoa_papel_id = pp.id
      WHERE pp.id = ${input}
    `);

    if (!results.rows[0]) throw new TRPCError({ code: 'NOT_FOUND', message: 'Papel não encontrado' });
    
    const r = results.rows[0] as any;
    return {
      id: r.id,
      pessoaId: r.pessoa_id,
      pessoaNome: r.pessoa_nome,
      papelTipo: r.papel_tipo,
      dataInicio: r.data_inicio,
      dataFim: r.data_fim,
      status: r.status,
      atoDesignacao: r.ato_designacao,
      observacoes: r.observacoes,
      captadorDoacao: r.captador_id ? {
        regiaoAtuacao: r.regiao_atuacao,
        metaCaptacaoAnual: parseFloat(r.meta_captacao_anual) || null,
        totalCaptadoAcumulado: parseFloat(r.total_captado_acumulado) || 0,
        quantidadeDoacoes: Number(r.quantidade_doacoes) || 0,
      } : null,
      administradorFinanceiro: r.admin_id ? {
        responsabilidades: r.responsabilidades,
        alcadaValorMaximo: parseFloat(r.alcada_valor_maximo) || null,
        podeAprovarPagamentos: r.pode_aprovar_pagamentos,
        acessoContasBancarias: r.acesso_contas_bancarias,
        cargoEstatutario: r.cargo_estatutario,
      } : null,
    };
  }),

  create: protectedProcedure
    .input(z.object({
      pessoaId: z.string().uuid(),
      papelTipo: z.enum(['captador_doacao', 'administrador_financeiro', 'diretor', 'conselheiro', 'voluntario']),
      dataInicio: z.string(),
      atoDesignacao: z.string().optional(),
      observacoes: z.string().optional(),
      // Campos específicos para captador
      regiaoAtuacao: z.string().optional(),
      metaCaptacaoAnual: z.number().optional(),
      // Campos específicos para admin financeiro
      responsabilidades: z.string().optional(),
      alcadaValorMaximo: z.number().optional(),
      podeAprovarPagamentos: z.boolean().optional(),
      acessoContasBancarias: z.boolean().optional(),
      cargoEstatutario: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Verificar se a pessoa existe
      const [pessoa] = await db.select().from(schema.pessoa).where(eq(schema.pessoa.id, input.pessoaId));
      if (!pessoa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Pessoa não encontrada' });

      // Verificar se já não existe um papel ativo do mesmo tipo
      const existingPapel = await db.execute(sql`
        SELECT id FROM pessoa_papel 
        WHERE pessoa_id = ${input.pessoaId} 
          AND papel_tipo = ${input.papelTipo}
          AND status = 'ativo'
      `);
      if (existingPapel.rows.length > 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Já existe um papel ativo deste tipo para esta pessoa' });
      }

      // Criar o papel
      const newPapelResult = await db.execute(sql`
        INSERT INTO pessoa_papel (pessoa_id, papel_tipo, data_inicio, ato_designacao, observacoes, created_by)
        VALUES (${input.pessoaId}, ${input.papelTipo}, ${input.dataInicio}, ${input.atoDesignacao || null}, ${input.observacoes || null}, ${ctx.user.id})
        RETURNING id
      `);

      const papelId = (newPapelResult.rows[0] as any).id;

      // Criar registro específico se for captador ou admin
      if (input.papelTipo === 'captador_doacao') {
        await db.execute(sql`
          INSERT INTO captador_doacao (pessoa_papel_id, regiao_atuacao, meta_captacao_anual)
          VALUES (${papelId}, ${input.regiaoAtuacao || null}, ${input.metaCaptacaoAnual || null})
        `);
      } else if (input.papelTipo === 'administrador_financeiro') {
        await db.execute(sql`
          INSERT INTO administrador_financeiro (pessoa_papel_id, responsabilidades, alcada_valor_maximo, pode_aprovar_pagamentos, acesso_contas_bancarias, cargo_estatutario)
          VALUES (${papelId}, ${input.responsabilidades || null}, ${input.alcadaValorMaximo || null}, ${input.podeAprovarPagamentos || false}, ${input.acessoContasBancarias || false}, ${input.cargoEstatutario || false})
        `);
      }

      return { id: papelId };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      dataFim: z.string().optional(),
      status: z.enum(['ativo', 'suspenso', 'encerrado']).optional(),
      atoDesignacao: z.string().optional(),
      observacoes: z.string().optional(),
      // Campos específicos para captador
      regiaoAtuacao: z.string().optional(),
      metaCaptacaoAnual: z.number().optional(),
      // Campos específicos para admin financeiro
      responsabilidades: z.string().optional(),
      alcadaValorMaximo: z.number().optional(),
      podeAprovarPagamentos: z.boolean().optional(),
      acessoContasBancarias: z.boolean().optional(),
      cargoEstatutario: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Buscar papel existente
      const papelResult = await db.execute(sql`SELECT * FROM pessoa_papel WHERE id = ${input.id}`);
      if (!papelResult.rows[0]) throw new TRPCError({ code: 'NOT_FOUND', message: 'Papel não encontrado' });
      
      const papel = papelResult.rows[0] as any;

      // Atualizar pessoa_papel
      await db.execute(sql`
        UPDATE pessoa_papel SET
          data_fim = COALESCE(${input.dataFim}, data_fim),
          status = COALESCE(${input.status}, status),
          ato_designacao = COALESCE(${input.atoDesignacao}, ato_designacao),
          observacoes = COALESCE(${input.observacoes}, observacoes),
          updated_at = now(),
          updated_by = ${ctx.user.id}
        WHERE id = ${input.id}
      `);

      // Atualizar tabela específica se necessário
      if (papel.papel_tipo === 'captador_doacao') {
        await db.execute(sql`
          UPDATE captador_doacao SET
            regiao_atuacao = COALESCE(${input.regiaoAtuacao}, regiao_atuacao),
            meta_captacao_anual = COALESCE(${input.metaCaptacaoAnual}, meta_captacao_anual),
            updated_at = now()
          WHERE pessoa_papel_id = ${input.id}
        `);
      } else if (papel.papel_tipo === 'administrador_financeiro') {
        await db.execute(sql`
          UPDATE administrador_financeiro SET
            responsabilidades = COALESCE(${input.responsabilidades}, responsabilidades),
            alcada_valor_maximo = COALESCE(${input.alcadaValorMaximo}, alcada_valor_maximo),
            pode_aprovar_pagamentos = COALESCE(${input.podeAprovarPagamentos}, pode_aprovar_pagamentos),
            acesso_contas_bancarias = COALESCE(${input.acessoContasBancarias}, acesso_contas_bancarias),
            cargo_estatutario = COALESCE(${input.cargoEstatutario}, cargo_estatutario),
            updated_at = now()
          WHERE pessoa_papel_id = ${input.id}
        `);
      }

      return { success: true };
    }),

  encerrar: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      dataFim: z.string(),
      motivo: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      await db.execute(sql`
        UPDATE pessoa_papel SET
          data_fim = ${input.dataFim},
          status = 'encerrado',
          observacoes = CONCAT(COALESCE(observacoes, ''), ${input.motivo ? '\nMotivo encerramento: ' + input.motivo : ''}),
          updated_at = now(),
          updated_by = ${ctx.user.id}
        WHERE id = ${input.id}
      `);

      return { success: true };
    }),

  // Estatísticas dos captadores de doação
  captadoresStats: publicProcedure.query(async () => {
    const db = await getDb();
    const results = await db.execute(sql`
      SELECT 
        p.nome,
        cd.regiao_atuacao,
        cd.meta_captacao_anual,
        cd.total_captado_acumulado,
        cd.quantidade_doacoes,
        CASE 
          WHEN cd.meta_captacao_anual > 0 
          THEN ROUND((cd.total_captado_acumulado / cd.meta_captacao_anual) * 100, 2)
          ELSE 0 
        END as percentual_meta
      FROM pessoa_papel pp
      INNER JOIN pessoa p ON pp.pessoa_id = p.id
      INNER JOIN captador_doacao cd ON cd.pessoa_papel_id = pp.id
      WHERE pp.status = 'ativo' AND pp.papel_tipo = 'captador_doacao'
      ORDER BY cd.total_captado_acumulado DESC
    `);

    return results.rows.map((r: any) => ({
      nome: r.nome,
      regiaoAtuacao: r.regiao_atuacao,
      metaCaptacaoAnual: parseFloat(r.meta_captacao_anual) || 0,
      totalCaptadoAcumulado: parseFloat(r.total_captado_acumulado) || 0,
      quantidadeDoacoes: Number(r.quantidade_doacoes) || 0,
      percentualMeta: parseFloat(r.percentual_meta) || 0,
    }));
  }),

  // Lista administradores financeiros ativos
  administradoresAtivos: publicProcedure.query(async () => {
    const db = await getDb();
    const results = await db.execute(sql`
      SELECT 
        pp.id, p.nome, af.responsabilidades, af.alcada_valor_maximo,
        af.pode_aprovar_pagamentos, af.acesso_contas_bancarias, af.cargo_estatutario,
        pp.data_inicio, pp.ato_designacao
      FROM pessoa_papel pp
      INNER JOIN pessoa p ON pp.pessoa_id = p.id
      INNER JOIN administrador_financeiro af ON af.pessoa_papel_id = pp.id
      WHERE pp.status = 'ativo' AND pp.papel_tipo = 'administrador_financeiro'
      ORDER BY pp.data_inicio ASC
    `);

    return results.rows.map((r: any) => ({
      id: r.id,
      nome: r.nome,
      responsabilidades: r.responsabilidades,
      alcadaValorMaximo: parseFloat(r.alcada_valor_maximo) || null,
      podeAprovarPagamentos: r.pode_aprovar_pagamentos,
      acessoContasBancarias: r.acesso_contas_bancarias,
      cargoEstatutario: r.cargo_estatutario,
      dataInicio: r.data_inicio,
      atoDesignacao: r.ato_designacao,
    }));
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
      if (input?.search) {
        conditions.push(
          or(
            sql`${schema.titulo.descricao} ILIKE ${'%' + input.search + '%'}`,
            sql`${schema.pessoa.nome} ILIKE ${'%' + input.search + '%'}`
          )
        );
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

  // ==================== FLUXO DE CAIXA ====================
  fluxoCaixa: publicProcedure.query(async () => {
    const db = await getDb();
    const hoje = new Date();
    const hojeStr = hoje.toISOString().split('T')[0];
    
    // Datas de projeção
    const d30 = new Date(hoje); d30.setDate(d30.getDate() + 30);
    const d60 = new Date(hoje); d60.setDate(d60.getDate() + 60);
    const d90 = new Date(hoje); d90.setDate(d90.getDate() + 90);
    
    // Projeção 30/60/90 dias - títulos não quitados/cancelados
    const projecaoQuery = await db.execute(sql`
      SELECT 
        SUM(CASE WHEN tipo = 'receber' AND data_vencimento <= ${d30.toISOString().split('T')[0]} THEN valor_liquido::numeric ELSE 0 END) as receber_30d,
        SUM(CASE WHEN tipo = 'pagar' AND data_vencimento <= ${d30.toISOString().split('T')[0]} THEN valor_liquido::numeric ELSE 0 END) as pagar_30d,
        SUM(CASE WHEN tipo = 'receber' AND data_vencimento <= ${d60.toISOString().split('T')[0]} THEN valor_liquido::numeric ELSE 0 END) as receber_60d,
        SUM(CASE WHEN tipo = 'pagar' AND data_vencimento <= ${d60.toISOString().split('T')[0]} THEN valor_liquido::numeric ELSE 0 END) as pagar_60d,
        SUM(CASE WHEN tipo = 'receber' AND data_vencimento <= ${d90.toISOString().split('T')[0]} THEN valor_liquido::numeric ELSE 0 END) as receber_90d,
        SUM(CASE WHEN tipo = 'pagar' AND data_vencimento <= ${d90.toISOString().split('T')[0]} THEN valor_liquido::numeric ELSE 0 END) as pagar_90d
      FROM titulo
      WHERE deleted_at IS NULL 
        AND status NOT IN ('quitado', 'cancelado')
        AND data_vencimento >= ${hojeStr}
    `);
    const proj = projecaoQuery.rows[0] as any || {};
    
    // Aging - títulos vencidos por faixa
    const agingQuery = await db.execute(sql`
      SELECT 
        COUNT(*) FILTER (WHERE data_vencimento >= ${hojeStr}::date - INTERVAL '7 days') as vencidos_1_7,
        SUM(valor_liquido::numeric) FILTER (WHERE data_vencimento >= ${hojeStr}::date - INTERVAL '7 days') as valor_1_7,
        COUNT(*) FILTER (WHERE data_vencimento < ${hojeStr}::date - INTERVAL '7 days' AND data_vencimento >= ${hojeStr}::date - INTERVAL '15 days') as vencidos_8_15,
        SUM(valor_liquido::numeric) FILTER (WHERE data_vencimento < ${hojeStr}::date - INTERVAL '7 days' AND data_vencimento >= ${hojeStr}::date - INTERVAL '15 days') as valor_8_15,
        COUNT(*) FILTER (WHERE data_vencimento < ${hojeStr}::date - INTERVAL '15 days' AND data_vencimento >= ${hojeStr}::date - INTERVAL '30 days') as vencidos_16_30,
        SUM(valor_liquido::numeric) FILTER (WHERE data_vencimento < ${hojeStr}::date - INTERVAL '15 days' AND data_vencimento >= ${hojeStr}::date - INTERVAL '30 days') as valor_16_30,
        COUNT(*) FILTER (WHERE data_vencimento < ${hojeStr}::date - INTERVAL '30 days') as vencidos_30_plus,
        SUM(valor_liquido::numeric) FILTER (WHERE data_vencimento < ${hojeStr}::date - INTERVAL '30 days') as valor_30_plus
      FROM titulo
      WHERE deleted_at IS NULL 
        AND status NOT IN ('quitado', 'cancelado')
        AND data_vencimento < ${hojeStr}
    `);
    const aging = agingQuery.rows[0] as any || {};
    
    // Próximos vencimentos (14 dias)
    const d14 = new Date(hoje); d14.setDate(d14.getDate() + 14);
    const proximosQuery = await db.execute(sql`
      SELECT t.id, t.descricao, t.tipo, t.status, t.valor_liquido, t.data_vencimento,
             p.nome as pessoa_nome
      FROM titulo t
      LEFT JOIN pessoa p ON t.pessoa_id = p.id
      WHERE t.deleted_at IS NULL 
        AND t.status NOT IN ('quitado', 'cancelado')
        AND t.data_vencimento >= ${hojeStr}
        AND t.data_vencimento <= ${d14.toISOString().split('T')[0]}
      ORDER BY t.data_vencimento ASC
      LIMIT 50
    `);
    
    // Totais vencidos
    const [vencidosTotal] = await db.select({
      count: sql<number>`count(*)`,
      valor: sql<number>`COALESCE(SUM(valor_liquido::numeric), 0)`,
    }).from(schema.titulo)
      .where(and(
        isNull(schema.titulo.deletedAt),
        sql`status NOT IN ('quitado', 'cancelado')`,
        sql`data_vencimento < ${hojeStr}`
      ));
    
    // Projeção diária para gráfico (próximos 30 dias)
    const projecaoDiariaQuery = await db.execute(sql`
      SELECT 
        data_vencimento as data,
        SUM(CASE WHEN tipo = 'receber' THEN valor_liquido::numeric ELSE 0 END) as entradas,
        SUM(CASE WHEN tipo = 'pagar' THEN valor_liquido::numeric ELSE 0 END) as saidas
      FROM titulo
      WHERE deleted_at IS NULL 
        AND status NOT IN ('quitado', 'cancelado')
        AND data_vencimento >= ${hojeStr}
        AND data_vencimento <= ${d30.toISOString().split('T')[0]}
      GROUP BY data_vencimento
      ORDER BY data_vencimento
    `);

    return {
      projecao: {
        d30: { receber: Number(proj.receber_30d) || 0, pagar: Number(proj.pagar_30d) || 0, saldo: (Number(proj.receber_30d) || 0) - (Number(proj.pagar_30d) || 0) },
        d60: { receber: Number(proj.receber_60d) || 0, pagar: Number(proj.pagar_60d) || 0, saldo: (Number(proj.receber_60d) || 0) - (Number(proj.pagar_60d) || 0) },
        d90: { receber: Number(proj.receber_90d) || 0, pagar: Number(proj.pagar_90d) || 0, saldo: (Number(proj.receber_90d) || 0) - (Number(proj.pagar_90d) || 0) },
      },
      aging: [
        { faixa: '1-7 dias', count: Number(aging.vencidos_1_7) || 0, valor: Number(aging.valor_1_7) || 0 },
        { faixa: '8-15 dias', count: Number(aging.vencidos_8_15) || 0, valor: Number(aging.valor_8_15) || 0 },
        { faixa: '16-30 dias', count: Number(aging.vencidos_16_30) || 0, valor: Number(aging.valor_16_30) || 0 },
        { faixa: '30+ dias', count: Number(aging.vencidos_30_plus) || 0, valor: Number(aging.valor_30_plus) || 0 },
      ],
      vencidos: { count: vencidosTotal.count, valor: Number(vencidosTotal.valor) },
      proximosVencimentos: (proximosQuery.rows as any[]).map(t => ({
        id: t.id,
        descricao: t.descricao,
        tipo: t.tipo,
        status: t.status,
        valor: Number(t.valor_liquido),
        dataVencimento: t.data_vencimento,
        pessoaNome: t.pessoa_nome,
      })),
      projecaoDiaria: (projecaoDiariaQuery.rows as any[]).map(d => ({
        data: d.data,
        entradas: Number(d.entradas),
        saidas: Number(d.saidas),
      })),
    };
  }),

  // ==================== CRUD MUTATIONS ====================
  
  getById: publicProcedure.input(z.string().uuid()).query(async ({ input }) => {
    const db = await getDb();
    const [titulo] = await db.select({
      titulo: schema.titulo,
      pessoa: schema.pessoa,
      contaContabil: schema.planoContas,
    })
      .from(schema.titulo)
      .leftJoin(schema.pessoa, eq(schema.titulo.pessoaId, schema.pessoa.id))
      .leftJoin(schema.planoContas, eq(schema.titulo.contaContabilId, schema.planoContas.id))
      .where(eq(schema.titulo.id, input));
    
    if (!titulo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Título não encontrado' });
    
    // Buscar baixas
    const baixas = await db.select({
      baixa: schema.tituloBaixa,
      conta: schema.contaFinanceira,
    })
      .from(schema.tituloBaixa)
      .leftJoin(schema.contaFinanceira, eq(schema.tituloBaixa.contaFinanceiraId, schema.contaFinanceira.id))
      .where(eq(schema.tituloBaixa.tituloId, input))
      .orderBy(desc(schema.tituloBaixa.dataPagamento));
    
    const totalBaixado = baixas.reduce((acc, b) => {
      const valor = Number(b.baixa.valorPago) + Number(b.baixa.valorJuros) + Number(b.baixa.valorMulta) - Number(b.baixa.valorDesconto);
      return b.baixa.estorno ? acc - valor : acc + valor;
    }, 0);
    
    return {
      ...titulo.titulo,
      pessoa: titulo.pessoa,
      contaContabil: titulo.contaContabil,
      baixas: baixas.map(b => ({ ...b.baixa, contaFinanceira: b.conta })),
      totalBaixado,
      saldoPendente: Number(titulo.titulo.valorLiquido) - totalBaixado,
    };
  }),

  create: accountantProcedure
    .input(z.object({
      tipo: z.enum(['pagar', 'receber']),
      natureza: z.enum(['contribuicao', 'doacao', 'evento', 'convenio', 'servico', 'utilidade', 'taxa', 'imposto', 'material', 'outros']),
      descricao: z.string().min(3, 'Descrição deve ter no mínimo 3 caracteres').max(500),
      valorOriginal: z.number().positive('Valor deve ser positivo'),
      valorDesconto: z.number().min(0).default(0),
      valorAcrescimo: z.number().min(0).default(0),
      dataEmissao: z.string(),
      dataCompetencia: z.string(),
      dataVencimento: z.string(),
      numeroDocumento: z.string().optional(),
      serieDocumento: z.string().optional(),
      pessoaId: z.string().uuid().optional(),
      contaContabilId: z.string().uuid().optional(),
      centroCustoId: z.string().uuid().optional(),
      projetoId: z.string().uuid().optional(),
      fundoId: z.string().uuid().optional(),
      observacoes: z.string().optional(),
      status: z.enum(['rascunho', 'pendente_aprovacao', 'aprovado']).default('rascunho'),
      // Parcelamento
      parcelas: z.number().min(1).max(60).optional(),
      intervaloParcelas: z.number().min(1).default(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Validar natureza compatível com tipo
      const naturezasReceber = ['contribuicao', 'doacao', 'evento', 'convenio'];
      const naturezasPagar = ['servico', 'utilidade', 'taxa', 'imposto', 'material', 'outros'];
      
      if (input.tipo === 'receber' && naturezasPagar.includes(input.natureza)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Natureza "${input.natureza}" não é válida para títulos a receber` });
      }
      if (input.tipo === 'pagar' && naturezasReceber.includes(input.natureza)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Natureza "${input.natureza}" não é válida para títulos a pagar` });
      }
      
      // Validar pessoa obrigatória para doação com recibo
      if (input.natureza === 'doacao' && input.tipo === 'receber' && !input.pessoaId) {
        // Permitir doação anônima, mas registrar warning
      }
      
      // Calcular valor líquido
      const valorLiquido = input.valorOriginal - input.valorDesconto + input.valorAcrescimo;
      if (valorLiquido <= 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Valor líquido deve ser positivo' });
      }
      
      // Verificar período contábil aberto (se status não for rascunho)
      if (input.status !== 'rascunho') {
        const [ano, mes] = input.dataCompetencia.split('-').map(Number);
        const [periodo] = await db.select().from(schema.periodoContabil)
          .where(and(
            eq(schema.periodoContabil.ano, ano),
            eq(schema.periodoContabil.mes, mes)
          ));
        
        if (periodo && periodo.status === 'fechado') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `Período ${mes}/${ano} está fechado` });
        }
      }
      
      // Verificar alçada de aprovação
      const alcadaConfigs = await db.select().from(schema.configuracaoSistema)
        .where(sql`chave LIKE 'financeiro.alcada.%'`);
      
      // Buscar nível do usuário atual
      const nivelUsuario = await getUserMaxLevel(ctx.user.email);
      
      // Determinar se precisa de aprovação e qual nível
      let requerAprovacao = false;
      let nivelAprovacao = 0;
      
      for (const config of alcadaConfigs) {
        const valorAlcada = Number(config.valor) || 0;
        const nivelMinimo = parseInt(config.chave.split('.').pop() || '100');
        
        if (valorLiquido >= valorAlcada && nivelUsuario < nivelMinimo) {
          requerAprovacao = true;
          nivelAprovacao = Math.max(nivelAprovacao, nivelMinimo);
        }
      }
      
      // Se valor >= R$ 5.000 e não há configuração específica, usar padrão
      if (!requerAprovacao && valorLiquido >= 5000 && nivelUsuario < 60) {
        requerAprovacao = true;
        nivelAprovacao = 60;
      }
      
      // Determinar status baseado em alçada
      let statusFinal = input.status;
      if (requerAprovacao && input.status !== 'rascunho') {
        statusFinal = 'pendente_aprovacao';
      }
      
      const titulosIds: string[] = [];
      const numParcelas = input.parcelas || 1;
      const visitorId = await getVisitorId(ctx.user.email);
      
      // Criar título(s)
      for (let i = 0; i < numParcelas; i++) {
        const valorParcela = i === 0 && numParcelas > 1 
          ? valorLiquido - (Math.floor(valorLiquido / numParcelas) * (numParcelas - 1))
          : Math.floor(valorLiquido / numParcelas);
        
        // Calcular data de vencimento da parcela
        const vencBase = new Date(input.dataVencimento);
        vencBase.setMonth(vencBase.getMonth() + (i * input.intervaloParcelas));
        const dataVencParcela = vencBase.toISOString().split('T')[0];
        
        const [result] = await db.insert(schema.titulo).values({
          tipo: input.tipo,
          natureza: input.natureza,
          descricao: numParcelas > 1 ? `${input.descricao} (${i + 1}/${numParcelas})` : input.descricao,
          valorOriginal: numParcelas > 1 ? String(valorParcela) : String(input.valorOriginal),
          valorDesconto: numParcelas > 1 ? '0' : String(input.valorDesconto),
          valorAcrescimo: numParcelas > 1 ? '0' : String(input.valorAcrescimo),
          valorLiquido: String(valorParcela),
          dataEmissao: input.dataEmissao,
          dataCompetencia: input.dataCompetencia,
          dataVencimento: dataVencParcela,
          numeroDocumento: input.numeroDocumento,
          serieDocumento: input.serieDocumento,
          pessoaId: input.pessoaId,
          contaContabilId: input.contaContabilId,
          centroCustoId: input.centroCustoId,
          projetoId: input.projetoId,
          fundoId: input.fundoId,
          observacoes: input.observacoes,
          status: statusFinal,
          parcelaNumero: numParcelas > 1 ? i + 1 : null,
          parcelaTotal: numParcelas > 1 ? numParcelas : null,
          tituloPaiId: i > 0 ? titulosIds[0] : null,
          createdBy: visitorId || String(ctx.user.id),
        }).returning({ id: schema.titulo.id });
        
        titulosIds.push(result.id);
        
        // Criar aprovação automaticamente se necessário
        if (requerAprovacao && statusFinal === 'pendente_aprovacao') {
          await db.insert(schema.aprovacao).values({
            entidadeTipo: 'titulo',
            entidadeId: result.id,
            solicitanteId: visitorId,
            nivelAprovacao,
            status: 'pendente',
            observacao: `Título ${input.tipo} de R$ ${valorParcela.toFixed(2)} requer aprovação de nível ${nivelAprovacao}`,
          });
          
          // Registrar evento de auditoria
          await db.insert(schema.eventoAuditoria).values({
            usuarioId: visitorId,
            entidadeTipo: 'aprovacao',
            entidadeId: result.id,
            acao: 'criar',
            dadosNovos: { 
              tituloId: result.id, 
              valorLiquido: valorParcela,
              nivelAprovacao,
              motivo: 'Valor acima da alçada do usuário',
            },
            ipOrigem: ctx.ipAddress || null,
            userAgent: ctx.userAgent || null,
          });
        }
      }
      
      return { ids: titulosIds, count: titulosIds.length, requerAprovacao, nivelAprovacao };
    }),

  update: accountantProcedure
    .input(z.object({
      id: z.string().uuid(),
      descricao: z.string().min(3).max(500).optional(),
      valorDesconto: z.number().min(0).optional(),
      valorAcrescimo: z.number().min(0).optional(),
      dataVencimento: z.string().optional(),
      numeroDocumento: z.string().optional(),
      serieDocumento: z.string().optional(),
      pessoaId: z.string().uuid().nullable().optional(),
      contaContabilId: z.string().uuid().nullable().optional(),
      centroCustoId: z.string().uuid().nullable().optional(),
      projetoId: z.string().uuid().nullable().optional(),
      fundoId: z.string().uuid().nullable().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { id, ...data } = input;
      
      const [titulo] = await db.select().from(schema.titulo).where(eq(schema.titulo.id, id));
      if (!titulo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Título não encontrado' });
      
      // Bloquear edição de títulos quitados ou cancelados
      if (['quitado', 'cancelado'].includes(titulo.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Título ${titulo.status} não pode ser editado` });
      }
      
      // Bloquear campos se já aprovado (apenas alguns editáveis)
      const updateData: any = { updatedAt: new Date(), updatedBy: String(ctx.user.id) };
      
      if (titulo.status === 'aprovado') {
        // Só pode editar: desconto, acréscimo, vencimento, observações
        if (data.valorDesconto !== undefined) updateData.valorDesconto = String(data.valorDesconto);
        if (data.valorAcrescimo !== undefined) updateData.valorAcrescimo = String(data.valorAcrescimo);
        if (data.dataVencimento) updateData.dataVencimento = data.dataVencimento;
        if (data.observacoes !== undefined) updateData.observacoes = data.observacoes;
      } else {
        // Rascunho ou pendente - pode editar tudo
        if (data.descricao) updateData.descricao = data.descricao;
        if (data.valorDesconto !== undefined) updateData.valorDesconto = String(data.valorDesconto);
        if (data.valorAcrescimo !== undefined) updateData.valorAcrescimo = String(data.valorAcrescimo);
        if (data.dataVencimento) updateData.dataVencimento = data.dataVencimento;
        if (data.numeroDocumento !== undefined) updateData.numeroDocumento = data.numeroDocumento;
        if (data.serieDocumento !== undefined) updateData.serieDocumento = data.serieDocumento;
        if (data.pessoaId !== undefined) updateData.pessoaId = data.pessoaId;
        if (data.contaContabilId !== undefined) updateData.contaContabilId = data.contaContabilId;
        if (data.centroCustoId !== undefined) updateData.centroCustoId = data.centroCustoId;
        if (data.projetoId !== undefined) updateData.projetoId = data.projetoId;
        if (data.fundoId !== undefined) updateData.fundoId = data.fundoId;
        if (data.observacoes !== undefined) updateData.observacoes = data.observacoes;
      }
      
      // Recalcular valor líquido se desconto ou acréscimo mudaram
      if (updateData.valorDesconto !== undefined || updateData.valorAcrescimo !== undefined) {
        const novoDesconto = updateData.valorDesconto !== undefined ? Number(updateData.valorDesconto) : Number(titulo.valorDesconto);
        const novoAcrescimo = updateData.valorAcrescimo !== undefined ? Number(updateData.valorAcrescimo) : Number(titulo.valorAcrescimo);
        updateData.valorLiquido = String(Number(titulo.valorOriginal) - novoDesconto + novoAcrescimo);
      }
      
      await db.update(schema.titulo).set(updateData).where(eq(schema.titulo.id, id));
      
      return { success: true };
    }),

  aprovar: accountantProcedure
    .input(z.object({
      id: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      const [titulo] = await db.select().from(schema.titulo).where(eq(schema.titulo.id, input.id));
      if (!titulo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Título não encontrado' });
      
      if (!['rascunho', 'pendente_aprovacao'].includes(titulo.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Título com status "${titulo.status}" não pode ser aprovado` });
      }
      
      // Verificar período contábil
      const [ano, mes] = titulo.dataCompetencia.split('-').map(Number);
      const [periodo] = await db.select().from(schema.periodoContabil)
        .where(and(
          eq(schema.periodoContabil.ano, ano),
          eq(schema.periodoContabil.mes, mes)
        ));
      
      if (periodo && periodo.status === 'fechado') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Período ${mes}/${ano} está fechado` });
      }
      
      await db.update(schema.titulo).set({
        status: 'aprovado',
        aprovadoPor: String(ctx.user.id),
        aprovadoEm: new Date(),
        updatedAt: new Date(),
        updatedBy: String(ctx.user.id),
      }).where(eq(schema.titulo.id, input.id));
      
      return { success: true };
    }),

  registrarBaixa: accountantProcedure
    .input(z.object({
      tituloId: z.string().uuid(),
      contaFinanceiraId: z.string().uuid(),
      dataPagamento: z.string(),
      valorPago: z.number().positive('Valor deve ser positivo'),
      valorJuros: z.number().min(0).default(0),
      valorMulta: z.number().min(0).default(0),
      valorDesconto: z.number().min(0).default(0),
      formaPagamento: z.enum(['dinheiro', 'pix', 'ted', 'doc', 'boleto', 'debito', 'credito', 'cheque']),
      documentoReferencia: z.string().optional(),
      gerarLancamento: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Buscar título
      const [titulo] = await db.select().from(schema.titulo).where(eq(schema.titulo.id, input.tituloId));
      if (!titulo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Título não encontrado' });
      
      // Verificar status
      if (!['aprovado', 'parcial', 'vencido'].includes(titulo.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Título com status "${titulo.status}" não pode receber baixa` });
      }
      
      // Verificar conta financeira
      const [conta] = await db.select().from(schema.contaFinanceira).where(eq(schema.contaFinanceira.id, input.contaFinanceiraId));
      if (!conta || !conta.ativo) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Conta financeira inválida ou inativa' });
      }
      
      // Calcular saldo pendente
      const [baixasAnteriores] = await db.select({
        total: sql<number>`COALESCE(SUM(CASE WHEN estorno = false THEN valor_pago::numeric + valor_juros::numeric + valor_multa::numeric - valor_desconto::numeric ELSE -(valor_pago::numeric + valor_juros::numeric + valor_multa::numeric - valor_desconto::numeric) END), 0)`,
      }).from(schema.tituloBaixa).where(eq(schema.tituloBaixa.tituloId, input.tituloId));
      
      const saldoPendente = Number(titulo.valorLiquido) - Number(baixasAnteriores.total);
      const totalBaixa = input.valorPago + input.valorJuros + input.valorMulta - input.valorDesconto;
      
      if (totalBaixa > saldoPendente + 0.01) { // tolerância de centavos
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Valor (${totalBaixa.toFixed(2)}) excede saldo pendente (${saldoPendente.toFixed(2)})` });
      }
      
      // Verificar data não futura
      if (new Date(input.dataPagamento) > new Date()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Data de pagamento não pode ser futura' });
      }
      
      // Criar baixa
      const [baixa] = await db.insert(schema.tituloBaixa).values({
        tituloId: input.tituloId,
        contaFinanceiraId: input.contaFinanceiraId,
        dataPagamento: input.dataPagamento,
        valorPago: String(input.valorPago),
        valorJuros: String(input.valorJuros),
        valorMulta: String(input.valorMulta),
        valorDesconto: String(input.valorDesconto),
        formaPagamento: input.formaPagamento,
        documentoReferencia: input.documentoReferencia,
        createdBy: String(ctx.user.id),
      }).returning({ id: schema.tituloBaixa.id });
      
      // Atualizar status do título
      const novoTotal = Number(baixasAnteriores.total) + totalBaixa;
      const novoStatus = novoTotal >= Number(titulo.valorLiquido) - 0.01 ? 'quitado' : 'parcial';
      
      await db.update(schema.titulo).set({
        status: novoStatus as any,
        updatedAt: new Date(),
        updatedBy: String(ctx.user.id),
      }).where(eq(schema.titulo.id, input.tituloId));
      
      return { baixaId: baixa.id, novoStatus };
    }),

  estornarBaixa: accountantProcedure
    .input(z.object({
      baixaId: z.string().uuid(),
      motivo: z.string().min(10, 'Motivo deve ter no mínimo 10 caracteres'),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Buscar baixa original
      const [baixa] = await db.select().from(schema.tituloBaixa).where(eq(schema.tituloBaixa.id, input.baixaId));
      if (!baixa) throw new TRPCError({ code: 'NOT_FOUND', message: 'Baixa não encontrada' });
      
      if (baixa.estorno) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta baixa já é um estorno' });
      }
      
      // Verificar se já foi estornada
      const [jaEstornada] = await db.select().from(schema.tituloBaixa)
        .where(and(
          eq(schema.tituloBaixa.estornoDeId, input.baixaId),
          eq(schema.tituloBaixa.estorno, true)
        ));
      
      if (jaEstornada) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta baixa já foi estornada' });
      }
      
      // Criar baixa de estorno
      const [estorno] = await db.insert(schema.tituloBaixa).values({
        tituloId: baixa.tituloId,
        contaFinanceiraId: baixa.contaFinanceiraId,
        dataPagamento: new Date().toISOString().split('T')[0],
        valorPago: baixa.valorPago,
        valorJuros: baixa.valorJuros,
        valorMulta: baixa.valorMulta,
        valorDesconto: baixa.valorDesconto,
        formaPagamento: baixa.formaPagamento,
        estorno: true,
        estornoMotivo: input.motivo,
        estornoDeId: input.baixaId,
        createdBy: String(ctx.user.id),
      }).returning({ id: schema.tituloBaixa.id });
      
      // Recalcular status do título
      const [baixasRestantes] = await db.select({
        total: sql<number>`COALESCE(SUM(CASE WHEN estorno = false THEN valor_pago::numeric + valor_juros::numeric + valor_multa::numeric - valor_desconto::numeric ELSE -(valor_pago::numeric + valor_juros::numeric + valor_multa::numeric - valor_desconto::numeric) END), 0)`,
      }).from(schema.tituloBaixa).where(eq(schema.tituloBaixa.tituloId, baixa.tituloId));
      
      const [titulo] = await db.select().from(schema.titulo).where(eq(schema.titulo.id, baixa.tituloId));
      
      let novoStatus: string;
      if (Number(baixasRestantes.total) >= Number(titulo.valorLiquido) - 0.01) {
        novoStatus = 'quitado';
      } else if (Number(baixasRestantes.total) > 0) {
        novoStatus = 'parcial';
      } else {
        // Verificar se está vencido
        novoStatus = new Date(titulo.dataVencimento) < new Date() ? 'vencido' : 'aprovado';
      }
      
      await db.update(schema.titulo).set({
        status: novoStatus as any,
        updatedAt: new Date(),
        updatedBy: String(ctx.user.id),
      }).where(eq(schema.titulo.id, baixa.tituloId));
      
      return { estornoId: estorno.id, novoStatus };
    }),

  cancelar: accountantProcedure
    .input(z.object({
      id: z.string().uuid(),
      motivo: z.string().min(10, 'Motivo deve ter no mínimo 10 caracteres'),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      const [titulo] = await db.select().from(schema.titulo).where(eq(schema.titulo.id, input.id));
      if (!titulo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Título não encontrado' });
      
      // Verificar se tem baixas
      const [baixas] = await db.select({ count: sql<number>`count(*)` })
        .from(schema.tituloBaixa)
        .where(eq(schema.tituloBaixa.tituloId, input.id));
      
      if (baixas.count > 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Título com baixas não pode ser cancelado. Estorne as baixas primeiro.' });
      }
      
      if (titulo.status === 'cancelado') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Título já está cancelado' });
      }
      
      await db.update(schema.titulo).set({
        status: 'cancelado',
        observacoes: titulo.observacoes ? `${titulo.observacoes}\n\n[CANCELADO] ${input.motivo}` : `[CANCELADO] ${input.motivo}`,
        updatedAt: new Date(),
        updatedBy: String(ctx.user.id),
      }).where(eq(schema.titulo.id, input.id));
      
      return { success: true };
    }),

  enviarAprovacao: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      const [titulo] = await db.select().from(schema.titulo).where(eq(schema.titulo.id, input.id));
      if (!titulo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Título não encontrado' });
      
      if (titulo.status !== 'rascunho') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Apenas rascunhos podem ser enviados para aprovação' });
      }
      
      await db.update(schema.titulo).set({
        status: 'pendente_aprovacao',
        updatedAt: new Date(),
      }).where(eq(schema.titulo.id, input.id));
      
      return { success: true };
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

  // Auditoria completa das contas financeiras
  auditoria: publicProcedure.query(async () => {
    const db = await getDb();
    const contas = await db.select().from(schema.contaFinanceira).where(eq(schema.contaFinanceira.ativo, true));

    const problemas: string[] = [];
    let totalEntradasGeral = 0;
    let totalSaidasGeral = 0;

    const contasAuditadas = await Promise.all(contas.map(async (conta) => {
      // Buscar todas as baixas desta conta com detalhes
      const baixasDetalhe = await db.execute(sql`
        SELECT 
          tb.id, tb.titulo_id, tb.valor_pago, tb.data_pagamento,
          t.tipo as titulo_tipo, t.descricao, t.valor_liquido as titulo_valor
        FROM titulo_baixa tb
        LEFT JOIN titulo t ON tb.titulo_id = t.id
        WHERE tb.conta_financeira_id = ${conta.id}
        ORDER BY tb.data_pagamento DESC
      `);

      let entradas = 0;
      let saidas = 0;
      let qtdEntradas = 0;
      let qtdSaidas = 0;
      const baixasSemTitulo: any[] = [];
      const baixasValorInvalido: any[] = [];

      for (const b of baixasDetalhe.rows as any[]) {
        const valor = parseFloat(b.valor_pago) || 0;
        
        // Verificar baixa sem titulo
        if (!b.titulo_tipo) {
          baixasSemTitulo.push(b);
          problemas.push(`Conta ${conta.nome}: Baixa ${b.id} sem título associado`);
        }
        
        // Verificar valor invalido
        if (valor <= 0) {
          baixasValorInvalido.push(b);
          problemas.push(`Conta ${conta.nome}: Baixa ${b.id} com valor inválido: ${valor}`);
        }

        if (b.titulo_tipo === 'receber') {
          entradas += valor;
          qtdEntradas++;
        } else if (b.titulo_tipo === 'pagar') {
          saidas += valor;
          qtdSaidas++;
        }
      }

      const saldoInicial = parseFloat(conta.saldoInicial as string) || 0;
      const saldoCalculado = saldoInicial + entradas - saidas;

      totalEntradasGeral += entradas;
      totalSaidasGeral += saidas;

      return {
        id: conta.id,
        nome: conta.nome,
        tipo: conta.tipo,
        banco: conta.bancoNome || conta.bancoCodigo,
        saldoInicial,
        entradas,
        saidas,
        saldoCalculado,
        qtdEntradas,
        qtdSaidas,
        qtdBaixasTotal: baixasDetalhe.rows.length,
        baixasSemTitulo: baixasSemTitulo.length,
        baixasValorInvalido: baixasValorInvalido.length,
        detalhesBaixas: (baixasDetalhe.rows as any[]).slice(0, 10).map((b: any) => ({
          id: b.id,
          tituloId: b.titulo_id,
          valorPago: parseFloat(b.valor_pago),
          tipo: b.titulo_tipo,
          data: b.data_pagamento,
          descricao: b.descricao,
        })),
      };
    }));

    const saldoTotalCalculado = contasAuditadas.reduce((acc, c) => acc + c.saldoCalculado, 0);

    return {
      contas: contasAuditadas,
      resumo: {
        qtdContas: contas.length,
        saldoTotalCalculado,
        totalEntradas: totalEntradasGeral,
        totalSaidas: totalSaidasGeral,
        qtdProblemas: problemas.length,
        problemas: problemas.slice(0, 20),
      },
    };
  }),

  // Recalcular saldos baseado nos dados crus
  recalcular: publicProcedure.mutation(async () => {
    const db = await getDb();
    const contas = await db.select().from(schema.contaFinanceira).where(eq(schema.contaFinanceira.ativo, true));

    const resultados = [];

    for (const conta of contas) {
      // Calcular entradas e saídas a partir das baixas
      const [totais] = await db.select({
        entradas: sql<number>`COALESCE(SUM(CASE WHEN t.tipo = 'receber' THEN tb.valor_pago::numeric ELSE 0 END), 0)`,
        saidas: sql<number>`COALESCE(SUM(CASE WHEN t.tipo = 'pagar' THEN tb.valor_pago::numeric ELSE 0 END), 0)`,
      })
        .from(schema.tituloBaixa)
        .leftJoin(schema.titulo, eq(schema.tituloBaixa.tituloId, schema.titulo.id))
        .where(eq(schema.tituloBaixa.contaFinanceiraId, conta.id));

      const saldoInicial = parseFloat(conta.saldoInicial as string) || 0;
      const entradas = Number(totais.entradas) || 0;
      const saidas = Number(totais.saidas) || 0;
      const saldoRecalculado = saldoInicial + entradas - saidas;

      resultados.push({
        id: conta.id,
        nome: conta.nome,
        saldoInicial,
        entradas,
        saidas,
        saldoRecalculado,
      });
    }

    const saldoTotal = resultados.reduce((acc, r) => acc + r.saldoRecalculado, 0);

    return {
      contas: resultados,
      saldoTotal,
      recalculadoEm: new Date().toISOString(),
    };
  }),

  // Criar conta financeira
  create: publicProcedure
    .input(z.object({
      tipo: z.enum(['caixa', 'conta_corrente', 'poupanca', 'aplicacao', 'cartao']),
      nome: z.string().min(2).max(100),
      bancoCodigo: z.string().max(10).optional(),
      bancoNome: z.string().max(100).optional(),
      agencia: z.string().max(20).optional(),
      contaNumero: z.string().max(30).optional(),
      contaDigito: z.string().max(5).optional(),
      pixTipo: z.enum(['cpf', 'cnpj', 'email', 'telefone', 'aleatoria']).optional(),
      pixChave: z.string().max(100).optional(),
      saldoInicial: z.string().default('0'),
      dataSaldoInicial: z.string(),
      contaContabilId: z.string().uuid().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      const [result] = await db.insert(schema.contaFinanceira).values({
        tipo: input.tipo,
        nome: input.nome,
        bancoCodigo: input.bancoCodigo,
        bancoNome: input.bancoNome,
        agencia: input.agencia,
        contaNumero: input.contaNumero,
        contaDigito: input.contaDigito,
        pixTipo: input.pixTipo,
        pixChave: input.pixChave,
        saldoInicial: input.saldoInicial,
        dataSaldoInicial: input.dataSaldoInicial,
        contaContabilId: input.contaContabilId,
        ativo: true,
      }).returning({ id: schema.contaFinanceira.id });

      return { id: result.id };
    }),

  // Atualizar conta financeira
  update: publicProcedure
    .input(z.object({
      id: z.string().uuid(),
      nome: z.string().min(2).max(100).optional(),
      pixTipo: z.enum(['cpf', 'cnpj', 'email', 'telefone', 'aleatoria']).optional().nullable(),
      pixChave: z.string().max(100).optional().nullable(),
      contaContabilId: z.string().uuid().optional().nullable(),
      ativo: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const { id, ...data } = input;
      
      const updateData: any = {};
      if (data.nome !== undefined) updateData.nome = data.nome;
      if (data.pixTipo !== undefined) updateData.pixTipo = data.pixTipo;
      if (data.pixChave !== undefined) updateData.pixChave = data.pixChave;
      if (data.contaContabilId !== undefined) updateData.contaContabilId = data.contaContabilId;
      if (data.ativo !== undefined) updateData.ativo = data.ativo;
      updateData.updatedAt = new Date();

      await db.update(schema.contaFinanceira).set(updateData).where(eq(schema.contaFinanceira.id, id));

      return { success: true };
    }),

  // Toggle ativo
  toggleAtivo: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      const [conta] = await db.select().from(schema.contaFinanceira).where(eq(schema.contaFinanceira.id, input.id));
      if (!conta) throw new TRPCError({ code: 'NOT_FOUND', message: 'Conta não encontrada' });

      await db.update(schema.contaFinanceira).set({ 
        ativo: !conta.ativo,
        updatedAt: new Date(),
      }).where(eq(schema.contaFinanceira.id, input.id));

      return { success: true, ativo: !conta.ativo };
    }),

  // Buscar por ID
  getById: publicProcedure
    .input(z.string().uuid())
    .query(async ({ input }) => {
      const db = await getDb();
      const [conta] = await db.select().from(schema.contaFinanceira).where(eq(schema.contaFinanceira.id, input));
      if (!conta) throw new TRPCError({ code: 'NOT_FOUND', message: 'Conta não encontrada' });
      return conta;
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

  getById: publicProcedure.input(z.string().uuid()).query(async ({ input }) => {
    const db = await getDb();
    const [periodo] = await db.select().from(schema.periodoContabil).where(eq(schema.periodoContabil.id, input));
    if (!periodo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Período não encontrado' });
    return periodo;
  }),

  getCurrent: publicProcedure.query(async () => {
    const db = await getDb();
    const now = new Date();
    const [periodo] = await db.select().from(schema.periodoContabil)
      .where(and(eq(schema.periodoContabil.mes, now.getMonth() + 1), eq(schema.periodoContabil.ano, now.getFullYear())));
    return periodo || null;
  }),

  create: accountantProcedure
    .input(z.object({
      ano: z.number().min(2000).max(2100),
      mes: z.number().min(1).max(12),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      // Verificar se já existe
      const [existing] = await db.select().from(schema.periodoContabil)
        .where(and(eq(schema.periodoContabil.ano, input.ano), eq(schema.periodoContabil.mes, input.mes)));
      if (existing) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Período já existe' });
      
      // Verificar sequência (não pular meses)
      const mesAnterior = input.mes === 1 ? 12 : input.mes - 1;
      const anoAnterior = input.mes === 1 ? input.ano - 1 : input.ano;
      const [anterior] = await db.select().from(schema.periodoContabil)
        .where(and(eq(schema.periodoContabil.ano, anoAnterior), eq(schema.periodoContabil.mes, mesAnterior)));
      
      // Se não é o primeiro período e o anterior não existe
      const [primeiro] = await db.select({ count: sql<number>`count(*)` }).from(schema.periodoContabil);
      if (primeiro.count > 0 && !anterior) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Período anterior não existe. Crie os períodos em sequência.' });
      }
      
      // Calcular datas
      const dataInicio = `${input.ano}-${String(input.mes).padStart(2, '0')}-01`;
      const ultimoDia = new Date(input.ano, input.mes, 0).getDate();
      const dataFim = `${input.ano}-${String(input.mes).padStart(2, '0')}-${ultimoDia}`;
      
      const [result] = await db.insert(schema.periodoContabil).values({
        ano: input.ano,
        mes: input.mes,
        dataInicio,
        dataFim,
        status: 'aberto',
        observacoes: input.observacoes,
      }).returning({ id: schema.periodoContabil.id });
      
      return { id: result.id };
    }),

  fechar: accountantProcedure
    .input(z.object({
      id: z.string().uuid(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      const [periodo] = await db.select().from(schema.periodoContabil).where(eq(schema.periodoContabil.id, input.id));
      if (!periodo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Período não encontrado' });
      if (periodo.status === 'fechado') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Período já está fechado' });
      
      // Verificar lançamentos em rascunho
      const [rascunhos] = await db.select({ count: sql<number>`count(*)` })
        .from(schema.lancamentoContabil)
        .where(and(eq(schema.lancamentoContabil.periodoId, input.id), eq(schema.lancamentoContabil.status, 'rascunho')));
      
      if (rascunhos.count > 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Existem ${rascunhos.count} lançamentos em rascunho. Efetive ou exclua antes de fechar.` });
      }
      
      // Calcular saldos de todas as contas analíticas
      const contasAnaliticas = await db.select({ id: schema.planoContas.id, naturezaSaldo: schema.planoContas.naturezaSaldo })
        .from(schema.planoContas)
        .where(and(isNull(schema.planoContas.deletedAt), eq(schema.planoContas.classificacao, 'analitica')));
      
      for (const conta of contasAnaliticas) {
        // Buscar saldo anterior
        const mesAnterior = periodo.mes === 1 ? 12 : periodo.mes - 1;
        const anoAnterior = periodo.mes === 1 ? periodo.ano - 1 : periodo.ano;
        const [periodoAnterior] = await db.select().from(schema.periodoContabil)
          .where(and(eq(schema.periodoContabil.ano, anoAnterior), eq(schema.periodoContabil.mes, mesAnterior)));
        
        let saldoAnterior = 0;
        if (periodoAnterior) {
          const [saldoAnt] = await db.select({ saldoFinal: schema.saldoContaPeriodo.saldoFinal })
            .from(schema.saldoContaPeriodo)
            .where(and(eq(schema.saldoContaPeriodo.contaId, conta.id), eq(schema.saldoContaPeriodo.periodoId, periodoAnterior.id)));
          saldoAnterior = Number(saldoAnt?.saldoFinal || 0);
        }
        
        // Somar débitos e créditos do período
        const [totais] = await db.select({
          debitos: sql<number>`COALESCE(SUM(CASE WHEN tipo = 'debito' THEN valor::numeric ELSE 0 END), 0)`,
          creditos: sql<number>`COALESCE(SUM(CASE WHEN tipo = 'credito' THEN valor::numeric ELSE 0 END), 0)`,
        }).from(schema.lancamentoLinha)
          .innerJoin(schema.lancamentoContabil, eq(schema.lancamentoLinha.lancamentoId, schema.lancamentoContabil.id))
          .where(and(
            eq(schema.lancamentoLinha.contaId, conta.id),
            eq(schema.lancamentoContabil.periodoId, input.id),
            eq(schema.lancamentoContabil.status, 'efetivado')
          ));
        
        const totalDebitos = Number(totais.debitos) || 0;
        const totalCreditos = Number(totais.creditos) || 0;
        
        // Calcular saldo final conforme natureza
        let saldoFinal: number;
        if (conta.naturezaSaldo === 'devedora') {
          saldoFinal = saldoAnterior + totalDebitos - totalCreditos;
        } else {
          saldoFinal = saldoAnterior + totalCreditos - totalDebitos;
        }
        
        // Inserir ou atualizar saldo
        const [existingSaldo] = await db.select().from(schema.saldoContaPeriodo)
          .where(and(eq(schema.saldoContaPeriodo.contaId, conta.id), eq(schema.saldoContaPeriodo.periodoId, input.id)));
        
        if (existingSaldo) {
          await db.update(schema.saldoContaPeriodo).set({
            saldoAnterior: String(saldoAnterior),
            totalDebitos: String(totalDebitos),
            totalCreditos: String(totalCreditos),
            saldoFinal: String(saldoFinal),
          }).where(eq(schema.saldoContaPeriodo.id, existingSaldo.id));
        } else {
          await db.insert(schema.saldoContaPeriodo).values({
            contaId: conta.id,
            periodoId: input.id,
            saldoAnterior: String(saldoAnterior),
            totalDebitos: String(totalDebitos),
            totalCreditos: String(totalCreditos),
            saldoFinal: String(saldoFinal),
          });
        }
      }
      
      // Fechar período
      await db.update(schema.periodoContabil).set({
        status: 'fechado',
        fechadoPor: ctx.user?.id,
        fechadoEm: new Date(),
        observacoes: input.observacoes || periodo.observacoes,
        updatedAt: new Date(),
      }).where(eq(schema.periodoContabil.id, input.id));
      
      // Criar próximo período se não existir
      const proxMes = periodo.mes === 12 ? 1 : periodo.mes + 1;
      const proxAno = periodo.mes === 12 ? periodo.ano + 1 : periodo.ano;
      const [existingProx] = await db.select().from(schema.periodoContabil)
        .where(and(eq(schema.periodoContabil.ano, proxAno), eq(schema.periodoContabil.mes, proxMes)));
      
      if (!existingProx) {
        const dataInicio = `${proxAno}-${String(proxMes).padStart(2, '0')}-01`;
        const ultimoDia = new Date(proxAno, proxMes, 0).getDate();
        const dataFim = `${proxAno}-${String(proxMes).padStart(2, '0')}-${ultimoDia}`;
        
        await db.insert(schema.periodoContabil).values({
          ano: proxAno,
          mes: proxMes,
          dataInicio,
          dataFim,
          status: 'aberto',
        });
      }
      
      return { success: true };
    }),

  reabrir: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      motivoReabertura: z.string().min(20, 'Motivo deve ter no mínimo 20 caracteres'),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      const [periodo] = await db.select().from(schema.periodoContabil).where(eq(schema.periodoContabil.id, input.id));
      if (!periodo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Período não encontrado' });
      if (periodo.status !== 'fechado') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Apenas períodos fechados podem ser reabertos' });
      
      await db.update(schema.periodoContabil).set({
        status: 'reaberto',
        reabertoPor: ctx.user?.id,
        reabertoEm: new Date(),
        motivoReabertura: input.motivoReabertura,
        updatedAt: new Date(),
      }).where(eq(schema.periodoContabil.id, input.id));
      
      return { success: true };
    }),
});

// ==================== LANCAMENTOS CONTABEIS ROUTER ====================
const lancamentosContabeisRouter = router({
  list: publicProcedure
    .input(z.object({
      periodoId: z.string().uuid().optional(),
      contaId: z.string().uuid().optional(),
      origem: z.enum(['manual', 'baixa', 'extrato', 'depreciacao', 'fechamento', 'ajuste']).optional(),
      status: z.enum(['rascunho', 'efetivado', 'estornado']).optional(),
      page: z.number().default(1),
      limit: z.number().min(1).max(100).default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const page = input?.page || 1;
      const limit = input?.limit || 50;
      const offset = (page - 1) * limit;
      
      const conditions = [];
      if (input?.periodoId) conditions.push(eq(schema.lancamentoContabil.periodoId, input.periodoId));
      if (input?.origem) conditions.push(eq(schema.lancamentoContabil.origem, input.origem));
      if (input?.status) conditions.push(eq(schema.lancamentoContabil.status, input.status));
      
      const lancamentos = await db.select({
        lancamento: schema.lancamentoContabil,
        periodo: schema.periodoContabil,
      })
        .from(schema.lancamentoContabil)
        .leftJoin(schema.periodoContabil, eq(schema.lancamentoContabil.periodoId, schema.periodoContabil.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(schema.lancamentoContabil.dataLancamento), desc(schema.lancamentoContabil.numero))
        .limit(limit)
        .offset(offset);
      
      const [countResult] = await db.select({ count: sql<number>`count(*)` })
        .from(schema.lancamentoContabil)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
      
      return {
        lancamentos: lancamentos.map(l => ({ ...l.lancamento, periodo: l.periodo })),
        total: countResult.count,
        page,
        pages: Math.ceil(countResult.count / limit),
      };
    }),

  getById: publicProcedure.input(z.string().uuid()).query(async ({ input }) => {
    const db = await getDb();
    const [lancamento] = await db.select().from(schema.lancamentoContabil).where(eq(schema.lancamentoContabil.id, input));
    if (!lancamento) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lançamento não encontrado' });
    
    const linhas = await db.select({
      linha: schema.lancamentoLinha,
      conta: schema.planoContas,
    })
      .from(schema.lancamentoLinha)
      .leftJoin(schema.planoContas, eq(schema.lancamentoLinha.contaId, schema.planoContas.id))
      .where(eq(schema.lancamentoLinha.lancamentoId, input))
      .orderBy(asc(schema.lancamentoLinha.ordem));
    
    return {
      ...lancamento,
      linhas: linhas.map(l => ({ ...l.linha, conta: l.conta })),
    };
  }),

  create: accountantProcedure
    .input(z.object({
      periodoId: z.string().uuid(),
      dataLancamento: z.string(),
      dataCompetencia: z.string(),
      historico: z.string().min(10, 'Histórico deve ter no mínimo 10 caracteres'),
      origem: z.enum(['manual', 'baixa', 'extrato', 'depreciacao', 'fechamento', 'ajuste']).default('manual'),
      efetivar: z.boolean().default(false),
      linhas: z.array(z.object({
        contaId: z.string().uuid(),
        tipo: z.enum(['debito', 'credito']),
        valor: z.number().positive(),
        historicoComplementar: z.string().optional(),
        centroCustoId: z.string().uuid().optional(),
        projetoId: z.string().uuid().optional(),
        fundoId: z.string().uuid().optional(),
      })).min(2, 'Lançamento deve ter no mínimo 2 linhas'),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Validar período
      const [periodo] = await db.select().from(schema.periodoContabil).where(eq(schema.periodoContabil.id, input.periodoId));
      if (!periodo) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Período não encontrado' });
      if (periodo.status === 'fechado') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Período está fechado' });
      
      // Validar partidas dobradas
      const totalDebitos = input.linhas.filter(l => l.tipo === 'debito').reduce((sum, l) => sum + l.valor, 0);
      const totalCreditos = input.linhas.filter(l => l.tipo === 'credito').reduce((sum, l) => sum + l.valor, 0);
      
      if (Math.abs(totalDebitos - totalCreditos) > 0.01) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Débitos (${totalDebitos.toFixed(2)}) ≠ Créditos (${totalCreditos.toFixed(2)})` });
      }
      
      // Validar contas (devem ser analíticas e ativas)
      for (const linha of input.linhas) {
        const [conta] = await db.select().from(schema.planoContas).where(eq(schema.planoContas.id, linha.contaId));
        if (!conta) throw new TRPCError({ code: 'BAD_REQUEST', message: `Conta ${linha.contaId} não encontrada` });
        if (!conta.aceitaLancamento) throw new TRPCError({ code: 'BAD_REQUEST', message: `Conta ${conta.codigo} é sintética e não aceita lançamentos` });
        if (!conta.ativo) throw new TRPCError({ code: 'BAD_REQUEST', message: `Conta ${conta.codigo} está inativa` });
      }
      
      // Criar lançamento
      const [lancamento] = await db.insert(schema.lancamentoContabil).values({
        periodoId: input.periodoId,
        dataLancamento: input.dataLancamento,
        dataCompetencia: input.dataCompetencia,
        historico: input.historico,
        origem: input.origem,
        status: input.efetivar ? 'efetivado' : 'rascunho',
        totalDebito: String(totalDebitos),
        totalCredito: String(totalCreditos),
        createdBy: ctx.user?.id,
      }).returning({ id: schema.lancamentoContabil.id, numero: schema.lancamentoContabil.numero });
      
      // Criar linhas
      for (let i = 0; i < input.linhas.length; i++) {
        const linha = input.linhas[i];
        await db.insert(schema.lancamentoLinha).values({
          lancamentoId: lancamento.id,
          ordem: i + 1,
          contaId: linha.contaId,
          tipo: linha.tipo,
          valor: String(linha.valor),
          historicoComplementar: linha.historicoComplementar,
          centroCustoId: linha.centroCustoId,
          projetoId: linha.projetoId,
          fundoId: linha.fundoId,
        });
      }
      
      return { id: lancamento.id, numero: lancamento.numero };
    }),

  efetivar: accountantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      const [lancamento] = await db.select().from(schema.lancamentoContabil).where(eq(schema.lancamentoContabil.id, input.id));
      if (!lancamento) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lançamento não encontrado' });
      if (lancamento.status !== 'rascunho') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Apenas rascunhos podem ser efetivados' });
      
      // Verificar período
      const [periodo] = await db.select().from(schema.periodoContabil).where(eq(schema.periodoContabil.id, lancamento.periodoId));
      if (periodo?.status === 'fechado') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Período está fechado' });
      
      await db.update(schema.lancamentoContabil).set({
        status: 'efetivado',
        updatedAt: new Date(),
      }).where(eq(schema.lancamentoContabil.id, input.id));
      
      return { success: true };
    }),

  estornar: accountantProcedure
    .input(z.object({
      id: z.string().uuid(),
      motivo: z.string().min(10, 'Motivo deve ter no mínimo 10 caracteres'),
      dataEstorno: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      const [lancamento] = await db.select().from(schema.lancamentoContabil).where(eq(schema.lancamentoContabil.id, input.id));
      if (!lancamento) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lançamento não encontrado' });
      if (lancamento.status !== 'efetivado') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Apenas lançamentos efetivados podem ser estornados' });
      
      // Verificar período
      const [periodo] = await db.select().from(schema.periodoContabil).where(eq(schema.periodoContabil.id, lancamento.periodoId));
      if (periodo?.status === 'fechado') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Período está fechado' });
      
      // Buscar linhas originais
      const linhasOriginais = await db.select().from(schema.lancamentoLinha)
        .where(eq(schema.lancamentoLinha.lancamentoId, input.id))
        .orderBy(asc(schema.lancamentoLinha.ordem));
      
      // Criar lançamento de estorno (inverte D/C)
      const dataEstorno = input.dataEstorno || new Date().toISOString().split('T')[0];
      const [estorno] = await db.insert(schema.lancamentoContabil).values({
        periodoId: lancamento.periodoId,
        dataLancamento: dataEstorno,
        dataCompetencia: lancamento.dataCompetencia,
        historico: `ESTORNO: ${input.motivo} - Ref: Lançamento nº ${lancamento.numero}`,
        origem: 'ajuste',
        status: 'efetivado',
        estornoDeId: lancamento.id,
        totalDebito: lancamento.totalCredito,
        totalCredito: lancamento.totalDebito,
        createdBy: ctx.user?.id,
      }).returning({ id: schema.lancamentoContabil.id, numero: schema.lancamentoContabil.numero });
      
      // Criar linhas invertidas
      for (let i = 0; i < linhasOriginais.length; i++) {
        const linha = linhasOriginais[i];
        await db.insert(schema.lancamentoLinha).values({
          lancamentoId: estorno.id,
          ordem: i + 1,
          contaId: linha.contaId,
          tipo: linha.tipo === 'debito' ? 'credito' : 'debito',
          valor: linha.valor,
          historicoComplementar: linha.historicoComplementar,
          centroCustoId: linha.centroCustoId,
          projetoId: linha.projetoId,
          fundoId: linha.fundoId,
        });
      }
      
      // Marcar original como estornado
      await db.update(schema.lancamentoContabil).set({
        status: 'estornado',
        updatedAt: new Date(),
      }).where(eq(schema.lancamentoContabil.id, input.id));
      
      return { id: estorno.id, numero: estorno.numero };
    }),

  delete: accountantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      const [lancamento] = await db.select().from(schema.lancamentoContabil).where(eq(schema.lancamentoContabil.id, input.id));
      if (!lancamento) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lançamento não encontrado' });
      if (lancamento.status !== 'rascunho') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Apenas rascunhos podem ser excluídos' });
      
      // Excluir linhas e lançamento
      await db.delete(schema.lancamentoLinha).where(eq(schema.lancamentoLinha.lancamentoId, input.id));
      await db.delete(schema.lancamentoContabil).where(eq(schema.lancamentoContabil.id, input.id));
      
      return { success: true };
    }),

  stats: publicProcedure.query(async () => {
    const db = await getDb();
    const [total] = await db.select({ count: sql<number>`count(*)` }).from(schema.lancamentoContabil);
    const [rascunhos] = await db.select({ count: sql<number>`count(*)` }).from(schema.lancamentoContabil).where(eq(schema.lancamentoContabil.status, 'rascunho'));
    const [efetivados] = await db.select({ count: sql<number>`count(*)` }).from(schema.lancamentoContabil).where(eq(schema.lancamentoContabil.status, 'efetivado'));
    const [estornados] = await db.select({ count: sql<number>`count(*)` }).from(schema.lancamentoContabil).where(eq(schema.lancamentoContabil.status, 'estornado'));
    return { total: total.count, rascunhos: rascunhos.count, efetivados: efetivados.count, estornados: estornados.count };
  }),
});

// ==================== SALDOS CONTABEIS ROUTER ====================
const saldosContabeisRouter = router({
  getByPeriodo: publicProcedure
    .input(z.string().uuid())
    .query(async ({ input }) => {
      const db = await getDb();
      
      const saldos = await db.select({
        saldo: schema.saldoContaPeriodo,
        conta: schema.planoContas,
      })
        .from(schema.saldoContaPeriodo)
        .leftJoin(schema.planoContas, eq(schema.saldoContaPeriodo.contaId, schema.planoContas.id))
        .where(eq(schema.saldoContaPeriodo.periodoId, input))
        .orderBy(asc(schema.planoContas.codigo));
      
      return saldos.map(s => ({
        ...s.saldo,
        conta: s.conta,
      }));
    }),

  getBalancete: publicProcedure
    .input(z.string().uuid())
    .query(async ({ input }) => {
      const db = await getDb();
      
      const [periodo] = await db.select().from(schema.periodoContabil).where(eq(schema.periodoContabil.id, input));
      if (!periodo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Período não encontrado' });
      
      // Buscar todas contas e seus saldos
      const contas = await db.select({
        id: schema.planoContas.id,
        codigo: schema.planoContas.codigo,
        nome: schema.planoContas.nome,
        tipo: schema.planoContas.tipo,
        naturezaSaldo: schema.planoContas.naturezaSaldo,
        classificacao: schema.planoContas.classificacao,
        nivel: schema.planoContas.nivel,
      }).from(schema.planoContas)
        .where(and(isNull(schema.planoContas.deletedAt), eq(schema.planoContas.ativo, true)))
        .orderBy(asc(schema.planoContas.codigo));
      
      const saldos = await db.select().from(schema.saldoContaPeriodo)
        .where(eq(schema.saldoContaPeriodo.periodoId, input));
      
      const saldosMap = new Map(saldos.map(s => [s.contaId, s]));
      
      let totalDebitosGeral = 0;
      let totalCreditosGeral = 0;
      let totalSaldosDevedores = 0;
      let totalSaldosCredores = 0;
      
      const linhas = contas.map(c => {
        const saldo = saldosMap.get(c.id);
        const saldoAnterior = Number(saldo?.saldoAnterior || 0);
        const debitos = Number(saldo?.totalDebitos || 0);
        const creditos = Number(saldo?.totalCreditos || 0);
        const saldoFinal = Number(saldo?.saldoFinal || 0);
        
        totalDebitosGeral += debitos;
        totalCreditosGeral += creditos;
        
        if (saldoFinal > 0 && c.naturezaSaldo === 'devedora') totalSaldosDevedores += saldoFinal;
        if (saldoFinal > 0 && c.naturezaSaldo === 'credora') totalSaldosCredores += saldoFinal;
        if (saldoFinal < 0 && c.naturezaSaldo === 'devedora') totalSaldosCredores += Math.abs(saldoFinal);
        if (saldoFinal < 0 && c.naturezaSaldo === 'credora') totalSaldosDevedores += Math.abs(saldoFinal);
        
        return {
          ...c,
          saldoAnterior,
          debitos,
          creditos,
          saldoFinal,
        };
      });
      
      return {
        periodo,
        linhas,
        totais: {
          debitos: totalDebitosGeral,
          creditos: totalCreditosGeral,
          saldosDevedores: totalSaldosDevedores,
          saldosCredores: totalSaldosCredores,
          balanceado: Math.abs(totalSaldosDevedores - totalSaldosCredores) < 0.01,
        },
      };
    }),

  recalcular: adminProcedure
    .input(z.string().uuid())
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      const [periodo] = await db.select().from(schema.periodoContabil).where(eq(schema.periodoContabil.id, input));
      if (!periodo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Período não encontrado' });
      
      // Limpar saldos existentes
      await db.delete(schema.saldoContaPeriodo).where(eq(schema.saldoContaPeriodo.periodoId, input));
      
      // Recalcular para todas contas analíticas
      const contasAnaliticas = await db.select({ id: schema.planoContas.id, naturezaSaldo: schema.planoContas.naturezaSaldo })
        .from(schema.planoContas)
        .where(and(isNull(schema.planoContas.deletedAt), eq(schema.planoContas.classificacao, 'analitica')));
      
      for (const conta of contasAnaliticas) {
        // Buscar saldo anterior
        const mesAnterior = periodo.mes === 1 ? 12 : periodo.mes - 1;
        const anoAnterior = periodo.mes === 1 ? periodo.ano - 1 : periodo.ano;
        const [periodoAnterior] = await db.select().from(schema.periodoContabil)
          .where(and(eq(schema.periodoContabil.ano, anoAnterior), eq(schema.periodoContabil.mes, mesAnterior)));
        
        let saldoAnterior = 0;
        if (periodoAnterior) {
          const [saldoAnt] = await db.select({ saldoFinal: schema.saldoContaPeriodo.saldoFinal })
            .from(schema.saldoContaPeriodo)
            .where(and(eq(schema.saldoContaPeriodo.contaId, conta.id), eq(schema.saldoContaPeriodo.periodoId, periodoAnterior.id)));
          saldoAnterior = Number(saldoAnt?.saldoFinal || 0);
        }
        
        // Somar débitos e créditos
        const [totais] = await db.select({
          debitos: sql<number>`COALESCE(SUM(CASE WHEN tipo = 'debito' THEN valor::numeric ELSE 0 END), 0)`,
          creditos: sql<number>`COALESCE(SUM(CASE WHEN tipo = 'credito' THEN valor::numeric ELSE 0 END), 0)`,
        }).from(schema.lancamentoLinha)
          .innerJoin(schema.lancamentoContabil, eq(schema.lancamentoLinha.lancamentoId, schema.lancamentoContabil.id))
          .where(and(
            eq(schema.lancamentoLinha.contaId, conta.id),
            eq(schema.lancamentoContabil.periodoId, input),
            eq(schema.lancamentoContabil.status, 'efetivado')
          ));
        
        const totalDebitos = Number(totais.debitos) || 0;
        const totalCreditos = Number(totais.creditos) || 0;
        
        let saldoFinal: number;
        if (conta.naturezaSaldo === 'devedora') {
          saldoFinal = saldoAnterior + totalDebitos - totalCreditos;
        } else {
          saldoFinal = saldoAnterior + totalCreditos - totalDebitos;
        }
        
        await db.insert(schema.saldoContaPeriodo).values({
          contaId: conta.id,
          periodoId: input,
          saldoAnterior: String(saldoAnterior),
          totalDebitos: String(totalDebitos),
          totalCreditos: String(totalCreditos),
          saldoFinal: String(saldoFinal),
        });
      }
      
      return { success: true, contasProcessadas: contasAnaliticas.length };
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
    const [conciliados] = await db.select({ count: sql<number>`count(*)` }).from(schema.extratoLinha).where(eq(schema.extratoLinha.status, 'conciliado'));
    const [ignorados] = await db.select({ count: sql<number>`count(*)` }).from(schema.extratoLinha).where(eq(schema.extratoLinha.status, 'ignorado'));
    const [duplicados] = await db.select({ count: sql<number>`count(*)` }).from(schema.extratoLinha).where(eq(schema.extratoLinha.status, 'duplicado'));
    return { 
      extratos: extratos.count, 
      linhas: linhas.count, 
      pendentes: pendentes.count,
      conciliados: conciliados.count,
      ignorados: ignorados.count,
      duplicados: duplicados.count,
    };
  }),

  // Estatísticas avançadas para o hub de conciliação
  statsAvancados: publicProcedure.query(async () => {
    const db = await getDb();
    
    // Títulos a receber (contribuições)
    const [titulosReceber] = await db.select({
      total: sql<number>`count(*)`,
      pendentes: sql<number>`count(*) FILTER (WHERE status NOT IN ('quitado', 'cancelado'))`,
      valor: sql<number>`COALESCE(SUM(valor_liquido::numeric), 0)`,
    }).from(schema.titulo).where(and(eq(schema.titulo.tipo, 'receber'), isNull(schema.titulo.deletedAt)));
    
    // Títulos a pagar (despesas)
    const [titulosPagar] = await db.select({
      total: sql<number>`count(*)`,
      pendentes: sql<number>`count(*) FILTER (WHERE status NOT IN ('quitado', 'cancelado'))`,
      valor: sql<number>`COALESCE(SUM(valor_liquido::numeric), 0)`,
    }).from(schema.titulo).where(and(eq(schema.titulo.tipo, 'pagar'), isNull(schema.titulo.deletedAt)));
    
    // Baixas (pagamentos)
    const [baixas] = await db.select({
      total: sql<number>`count(*)`,
      valor: sql<number>`COALESCE(SUM(valor_pago::numeric), 0)`,
    }).from(schema.tituloBaixa);
    
    // Lançamentos contábeis
    const [lancamentos] = await db.select({
      total: sql<number>`count(*)`,
      efetivados: sql<number>`count(*) FILTER (WHERE status = 'efetivado')`,
    }).from(schema.lancamentoContabil);
    
    // Linhas de extrato
    const [extratoLinhas] = await db.select({
      total: sql<number>`count(*)`,
      pendentes: sql<number>`count(*) FILTER (WHERE status = 'pendente')`,
      valorTotal: sql<number>`COALESCE(SUM(ABS(valor::numeric)), 0)`,
    }).from(schema.extratoLinha);

    return {
      contribuicoes: { total: titulosReceber.total, pendentes: titulosReceber.pendentes, valor: Number(titulosReceber.valor) },
      despesas: { total: titulosPagar.total, pendentes: titulosPagar.pendentes, valor: Number(titulosPagar.valor) },
      baixas: { total: baixas.total, valor: Number(baixas.valor) },
      lancamentos: { total: lancamentos.total, efetivados: lancamentos.efetivados },
      extratos: { total: extratoLinhas.total, pendentes: extratoLinhas.pendentes, valor: Number(extratoLinhas.valorTotal) },
    };
  }),

  // Inconsistências de conciliação
  inconsistencias: publicProcedure.query(async () => {
    const db = await getDb();
    const inconsistencias: Array<{
      codigo: string;
      titulo: string;
      descricao: string;
      severidade: 'erro' | 'aviso' | 'info';
      quantidade: number;
      itens: any[];
    }> = [];

    // CON-001: Linhas de extrato sem vínculo (pendentes)
    const linhasPendentes = await db.select({
      id: schema.extratoLinha.id,
      data: schema.extratoLinha.dataMovimento,
      descricao: schema.extratoLinha.descricaoOriginal,
      valor: schema.extratoLinha.valor,
      tipo: schema.extratoLinha.tipo,
    })
      .from(schema.extratoLinha)
      .where(eq(schema.extratoLinha.status, 'pendente'))
      .limit(50);

    if (linhasPendentes.length > 0) {
      inconsistencias.push({
        codigo: 'CON-001',
        titulo: 'Linhas de Extrato Não Conciliadas',
        descricao: 'Movimentações bancárias sem vínculo com títulos ou lançamentos',
        severidade: 'aviso',
        quantidade: linhasPendentes.length,
        itens: linhasPendentes,
      });
    }

    // DOA-001: Títulos de doação sem pessoa vinculada
    const titulosSemPessoa = await db.select({
      id: schema.titulo.id,
      descricao: schema.titulo.descricao,
      valor: schema.titulo.valorLiquido,
      data: schema.titulo.dataCompetencia,
    })
      .from(schema.titulo)
      .where(and(
        isNull(schema.titulo.pessoaId),
        eq(schema.titulo.tipo, 'receber'),
        isNull(schema.titulo.deletedAt)
      ))
      .limit(50);

    if (titulosSemPessoa.length > 0) {
      inconsistencias.push({
        codigo: 'DOA-001',
        titulo: 'Contribuições Sem Doador Identificado',
        descricao: 'Títulos de recebimento sem pessoa vinculada',
        severidade: 'aviso',
        quantidade: titulosSemPessoa.length,
        itens: titulosSemPessoa,
      });
    }

    // DOA-002: Duplicatas potenciais (mesmo valor, data e descrição similar)
    const duplicatasPotenciais = await db.execute(sql`
      SELECT t1.id, t1.descricao, t1.valor_liquido as valor, t1.data_competencia as data,
             COUNT(*) OVER (PARTITION BY t1.valor_liquido, t1.data_competencia) as duplicatas
      FROM titulo t1
      WHERE t1.deleted_at IS NULL
        AND t1.tipo = 'receber'
      HAVING COUNT(*) OVER (PARTITION BY t1.valor_liquido, t1.data_competencia) > 1
      LIMIT 20
    `);

    if (duplicatasPotenciais.rows && duplicatasPotenciais.rows.length > 0) {
      inconsistencias.push({
        codigo: 'DOA-004',
        titulo: 'Títulos Potencialmente Duplicados',
        descricao: 'Títulos com mesmo valor e data de competência',
        severidade: 'erro',
        quantidade: duplicatasPotenciais.rows.length,
        itens: duplicatasPotenciais.rows,
      });
    }

    // CTB-001: Lançamentos desbalanceados
    const lancamentosDesbalanceados = await db.select({
      id: schema.lancamentoContabil.id,
      numero: schema.lancamentoContabil.numero,
      historico: schema.lancamentoContabil.historico,
      totalDebito: schema.lancamentoContabil.totalDebito,
      totalCredito: schema.lancamentoContabil.totalCredito,
    })
      .from(schema.lancamentoContabil)
      .where(sql`total_debito::numeric != total_credito::numeric`)
      .limit(20);

    if (lancamentosDesbalanceados.length > 0) {
      inconsistencias.push({
        codigo: 'CTB-001',
        titulo: 'Lançamentos Desbalanceados',
        descricao: 'Partidas com débito diferente de crédito',
        severidade: 'erro',
        quantidade: lancamentosDesbalanceados.length,
        itens: lancamentosDesbalanceados,
      });
    }

    return inconsistencias;
  }),

  // Doadores sem CPF cadastrado
  doadoresSemCpf: publicProcedure.query(async () => {
    const db = await getDb();
    
    const doadoresSemCpf = await db.execute(sql`
      SELECT DISTINCT 
        p.id,
        p.nome,
        p.tipo,
        COUNT(t.id) as total_doacoes,
        COALESCE(SUM(t.valor_liquido::numeric), 0) as valor_total
      FROM pessoa p
      INNER JOIN titulo t ON t.pessoa_id = p.id AND t.tipo = 'receber' AND t.deleted_at IS NULL
      LEFT JOIN pessoa_documento pd ON pd.pessoa_id = p.id AND pd.tipo = 'cpf'
      WHERE p.deleted_at IS NULL
        AND pd.id IS NULL
      GROUP BY p.id, p.nome, p.tipo
      ORDER BY valor_total DESC
      LIMIT 100
    `);

    return doadoresSemCpf.rows.map((r: any) => ({
      id: r.id,
      nome: r.nome,
      tipo: r.tipo,
      totalDoacoes: Number(r.total_doacoes),
      valorTotal: Number(r.valor_total),
    }));
  }),

  // Sugestões de conciliação automática
  sugestoesConciliacao: publicProcedure
    .input(z.object({ linhaId: z.string().uuid() }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      // Buscar a linha do extrato
      const [linha] = await db.select()
        .from(schema.extratoLinha)
        .where(eq(schema.extratoLinha.id, input.linhaId));

      if (!linha) return { sugestoes: [], linha: null };

      const valorAbs = Math.abs(Number(linha.valor));
      const tolerancia = 0.01; // R$ 0,01

      // Buscar títulos com valor e data similares
      const sugestoes = await db.execute(sql`
        SELECT 
          t.id,
          t.descricao,
          t.valor_liquido as valor,
          t.data_competencia as data,
          t.tipo,
          t.natureza,
          p.nome as pessoa_nome,
          ABS(t.valor_liquido::numeric - ${valorAbs}) as diferenca_valor,
          ABS(t.data_competencia::date - ${linha.dataMovimento}::date) as diferenca_dias
        FROM titulo t
        LEFT JOIN pessoa p ON p.id = t.pessoa_id
        WHERE t.deleted_at IS NULL
          AND ABS(t.valor_liquido::numeric - ${valorAbs}) <= ${tolerancia * 100}
        ORDER BY 
          ABS(t.data_competencia::date - ${linha.dataMovimento}::date) ASC,
          ABS(t.valor_liquido::numeric - ${valorAbs}) ASC
        LIMIT 10
      `);

      return {
        linha: {
          id: linha.id,
          data: linha.dataMovimento,
          descricao: linha.descricaoOriginal,
          valor: Number(linha.valor),
          tipo: linha.tipo,
        },
        sugestoes: sugestoes.rows.map((s: any) => ({
          id: s.id,
          descricao: s.descricao,
          valor: Number(s.valor),
          data: s.data,
          tipo: s.tipo,
          natureza: s.natureza,
          pessoaNome: s.pessoa_nome,
          diferencaValor: Number(s.diferenca_valor),
          diferencaDias: Number(s.diferenca_dias),
          confianca: Math.max(0, 100 - Number(s.diferenca_dias) * 5 - Number(s.diferenca_valor) * 10),
        })),
      };
    }),

  // Mutation: Conciliar linha com título
  conciliar: protectedProcedure
    .input(z.object({
      linhaId: z.string().uuid(),
      tituloId: z.string().uuid().optional(),
      lancamentoId: z.string().uuid().optional(),
      tipoVinculo: z.enum(['titulo', 'lancamento_manual', 'tarifa', 'rendimento']),
      metodo: z.enum(['automatico', 'manual', 'sugerido']).default('manual'),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Atualizar status da linha
      await db.update(schema.extratoLinha)
        .set({ status: 'conciliado' })
        .where(eq(schema.extratoLinha.id, input.linhaId));

      // Criar registro de conciliação
      const confiancaValor = input.metodo === 'automatico' ? '95' : input.metodo === 'sugerido' ? '80' : '100';
      // Use default UUID since ctx.user.id may be a number in dev mode
      const userId = '00000000-0000-0000-0000-000000000000';
      
      await db.insert(schema.conciliacao).values({
        extratoLinhaId: input.linhaId,
        tipoVinculo: input.tipoVinculo,
        tituloId: input.tituloId ?? null,
        lancamentoId: input.lancamentoId ?? null,
        metodo: input.metodo,
        confianca: confiancaValor,
        conciliadoPor: userId,
        conciliadoEm: new Date(),
      });

      return { success: true };
    }),

  // Mutation: Ignorar linha
  ignorar: protectedProcedure
    .input(z.object({
      linhaId: z.string().uuid(),
      motivo: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      await db.update(schema.extratoLinha)
        .set({ 
          status: 'ignorado',
          motivoIgnorado: input.motivo || 'Ignorado manualmente',
        })
        .where(eq(schema.extratoLinha.id, input.linhaId));

      return { success: true };
    }),

  // Mutation: Marcar como duplicado
  marcarDuplicado: protectedProcedure
    .input(z.object({ linhaId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      await db.update(schema.extratoLinha)
        .set({ status: 'duplicado' })
        .where(eq(schema.extratoLinha.id, input.linhaId));

      return { success: true };
    }),

  // Transações órfãs (baixas sem título ou linha de extrato vinculada)
  transacoesOrfas: publicProcedure.query(async () => {
    const db = await getDb();
    
    // Baixas que não estão vinculadas a nenhuma conciliação
    const baixasOrfas = await db.execute(sql`
      SELECT 
        tb.id,
        tb.data_pagamento as data,
        tb.valor_pago as valor,
        tb.forma_pagamento as forma,
        t.descricao,
        cf.nome as conta_nome
      FROM titulo_baixa tb
      INNER JOIN titulo t ON t.id = tb.titulo_id
      INNER JOIN conta_financeira cf ON cf.id = tb.conta_financeira_id
      LEFT JOIN conciliacao c ON c.titulo_id = t.id
      WHERE c.id IS NULL
      ORDER BY tb.data_pagamento DESC
      LIMIT 50
    `);

    return baixasOrfas.rows.map((r: any) => ({
      id: r.id,
      data: r.data,
      valor: Number(r.valor),
      forma: r.forma,
      descricao: r.descricao,
      contaNome: r.conta_nome,
    }));
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

// ==================== CONCILIAÇÃO ROUTER ====================
const conciliacaoRouter = router({
  // Listar linhas pendentes de conciliação
  pendentes: publicProcedure
    .input(z.object({ 
      contaId: z.string().uuid().optional(),
      extratoId: z.string().uuid().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions = [eq(schema.extratoLinha.status, 'pendente')];
      
      if (input?.extratoId) {
        conditions.push(eq(schema.extratoLinha.extratoId, input.extratoId));
      }

      const linhas = await db.select({
        linha: schema.extratoLinha,
        extrato: schema.extratoBancario,
      })
        .from(schema.extratoLinha)
        .leftJoin(schema.extratoBancario, eq(schema.extratoLinha.extratoId, schema.extratoBancario.id))
        .where(and(...conditions))
        .orderBy(desc(schema.extratoLinha.dataMovimento));

      // Filtrar por conta se especificado
      if (input?.contaId) {
        return linhas.filter(l => l.extrato?.contaFinanceiraId === input.contaId);
      }

      return linhas;
    }),

  // Sugestões de match automático
  sugestoes: publicProcedure
    .input(z.object({ 
      contaId: z.string().uuid().optional(),
      extratoId: z.string().uuid().optional(),
      minScore: z.number().min(0).max(100).default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      
      // Buscar linhas pendentes
      const conditions = [eq(schema.extratoLinha.status, 'pendente')];
      if (input?.extratoId) {
        conditions.push(eq(schema.extratoLinha.extratoId, input.extratoId));
      }

      const linhasPendentes = await db.select()
        .from(schema.extratoLinha)
        .where(and(...conditions))
        .limit(50);

      // Buscar títulos pendentes
      const titulosPendentes = await db.select()
        .from(schema.titulo)
        .where(and(
          or(eq(schema.titulo.status, 'pendente'), eq(schema.titulo.status, 'aprovado')),
          isNull(schema.titulo.deletedAt)
        ))
        .limit(100);

      // Calcular matches
      const sugestoes: any[] = [];

      for (const linha of linhasPendentes) {
        const valor = Number(linha.valor);
        const descricaoLower = (linha.descricaoNormalizada || linha.descricaoOriginal).toLowerCase();
        
        for (const titulo of titulosPendentes) {
          const tituloValor = Number(titulo.valorLiquido);
          
          // Score baseado em valor
          const diffValor = Math.abs(valor - tituloValor);
          const valorScore = diffValor === 0 ? 50 : diffValor < 1 ? 40 : diffValor < 10 ? 20 : 0;
          
          // Score baseado em descrição
          const descTitulo = titulo.descricao.toLowerCase();
          const descScore = descricaoLower.includes(descTitulo.slice(0, 10)) ? 30 : 0;
          
          // Score baseado em tipo (credito = receber, debito = pagar)
          const tipoMatch = (linha.tipo === 'credito' && titulo.tipo === 'receber') || 
                           (linha.tipo === 'debito' && titulo.tipo === 'pagar');
          const tipoScore = tipoMatch ? 20 : 0;

          const totalScore = valorScore + descScore + tipoScore;

          if (totalScore >= (input?.minScore || 50)) {
            sugestoes.push({
              linha,
              titulo,
              score: totalScore,
            });
          }
        }
      }

      // Ordenar por score e limitar
      return sugestoes
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);
    }),

  // Conciliar manualmente
  conciliar: publicProcedure
    .input(z.object({
      linhaId: z.string().uuid(),
      tituloId: z.string().uuid(),
      criarBaixa: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();

      // Buscar linha
      const [linha] = await db.select().from(schema.extratoLinha).where(eq(schema.extratoLinha.id, input.linhaId));
      if (!linha) throw new TRPCError({ code: 'NOT_FOUND', message: 'Linha não encontrada' });
      if (linha.status !== 'pendente') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Linha já conciliada' });

      // Buscar título
      const [titulo] = await db.select().from(schema.titulo).where(eq(schema.titulo.id, input.tituloId));
      if (!titulo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Título não encontrado' });

      // Buscar conta financeira do extrato
      const [extrato] = await db.select().from(schema.extratoBancario).where(eq(schema.extratoBancario.id, linha.extratoId));
      if (!extrato) throw new TRPCError({ code: 'NOT_FOUND', message: 'Extrato não encontrado' });

      // Criar conciliação
      const [conciliacao] = await db.insert(schema.conciliacao).values({
        extratoLinhaId: input.linhaId,
        tipoVinculo: 'titulo',
        tituloId: input.tituloId,
        metodo: 'manual',
        conciliadoPor: '00000000-0000-0000-0000-000000000000', // TODO: usar usuário real
        conciliadoEm: new Date(),
      }).returning();

      // Atualizar status da linha
      await db.update(schema.extratoLinha).set({ status: 'conciliado' }).where(eq(schema.extratoLinha.id, input.linhaId));

      // Criar baixa se solicitado
      if (input.criarBaixa) {
        await db.insert(schema.tituloBaixa).values({
          tituloId: input.tituloId,
          contaFinanceiraId: extrato.contaFinanceiraId,
          dataPagamento: linha.dataMovimento,
          valorPago: linha.valor,
          formaPagamento: 'pix', // TODO: detectar forma de pagamento
        });

        // Atualizar status do título
        await db.update(schema.titulo).set({ status: 'quitado' }).where(eq(schema.titulo.id, input.tituloId));
      }

      // Atualizar contador do extrato
      await db.update(schema.extratoBancario).set({
        linhasConciliadas: sql`${schema.extratoBancario.linhasConciliadas} + 1`,
      }).where(eq(schema.extratoBancario.id, linha.extratoId));

      return { success: true, conciliacaoId: conciliacao.id };
    }),

  // Ignorar linha
  ignorar: publicProcedure
    .input(z.object({
      linhaId: z.string().uuid(),
      motivo: z.string().min(3).max(500),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();

      const [linha] = await db.select().from(schema.extratoLinha).where(eq(schema.extratoLinha.id, input.linhaId));
      if (!linha) throw new TRPCError({ code: 'NOT_FOUND', message: 'Linha não encontrada' });

      await db.update(schema.extratoLinha).set({
        status: 'ignorado',
        motivoIgnorado: input.motivo,
      }).where(eq(schema.extratoLinha.id, input.linhaId));

      return { success: true };
    }),

  // Desconciliar
  desconciliar: publicProcedure
    .input(z.object({
      linhaId: z.string().uuid(),
      motivo: z.string().min(3).max(500),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();

      // Buscar conciliação
      const [conciliacao] = await db.select().from(schema.conciliacao).where(eq(schema.conciliacao.extratoLinhaId, input.linhaId));
      if (!conciliacao) throw new TRPCError({ code: 'NOT_FOUND', message: 'Conciliação não encontrada' });

      // Remover conciliação
      await db.delete(schema.conciliacao).where(eq(schema.conciliacao.id, conciliacao.id));

      // Voltar status da linha para pendente
      await db.update(schema.extratoLinha).set({ status: 'pendente' }).where(eq(schema.extratoLinha.id, input.linhaId));

      // Atualizar contador do extrato
      const [linha] = await db.select().from(schema.extratoLinha).where(eq(schema.extratoLinha.id, input.linhaId));
      if (linha) {
        await db.update(schema.extratoBancario).set({
          linhasConciliadas: sql`GREATEST(${schema.extratoBancario.linhasConciliadas} - 1, 0)`,
        }).where(eq(schema.extratoBancario.id, linha.extratoId));
      }

      return { success: true };
    }),

  // Estatísticas de conciliação
  stats: publicProcedure
    .input(z.object({ contaId: z.string().uuid().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();

      let extratoCondition: any = undefined;
      if (input?.contaId) {
        const extratos = await db.select({ id: schema.extratoBancario.id })
          .from(schema.extratoBancario)
          .where(eq(schema.extratoBancario.contaFinanceiraId, input.contaId));
        const extratoIds = extratos.map(e => e.id);
        if (extratoIds.length > 0) {
          extratoCondition = sql`${schema.extratoLinha.extratoId} IN (${sql.join(extratoIds.map(id => sql`${id}`), sql`, `)})`;
        }
      }

      const [total] = await db.select({ count: sql<number>`count(*)` })
        .from(schema.extratoLinha)
        .where(extratoCondition);

      const [pendentes] = await db.select({ count: sql<number>`count(*)` })
        .from(schema.extratoLinha)
        .where(extratoCondition ? and(extratoCondition, eq(schema.extratoLinha.status, 'pendente')) : eq(schema.extratoLinha.status, 'pendente'));

      const [conciliados] = await db.select({ count: sql<number>`count(*)` })
        .from(schema.extratoLinha)
        .where(extratoCondition ? and(extratoCondition, eq(schema.extratoLinha.status, 'conciliado')) : eq(schema.extratoLinha.status, 'conciliado'));

      const [ignorados] = await db.select({ count: sql<number>`count(*)` })
        .from(schema.extratoLinha)
        .where(extratoCondition ? and(extratoCondition, eq(schema.extratoLinha.status, 'ignorado')) : eq(schema.extratoLinha.status, 'ignorado'));

      return {
        total: total.count,
        pendentes: pendentes.count,
        conciliados: conciliados.count,
        ignorados: ignorados.count,
        percentual: total.count > 0 ? Math.round((conciliados.count / total.count) * 100) : 0,
      };
    }),
});

// ==================== GRUPOS DE ESTUDO ROUTER ====================
// Centro Espírita - Estudos Doutrinários
const gruposEstudoRouter = router({
  list: publicProcedure.query(async () => {
    const db = await getDb();
    const grupos = await db.select().from(schema.grupoEstudo).where(isNull(sql`deleted_at`));
    
    // Buscar orientadores
    const result = await Promise.all(grupos.map(async (g) => {
      let orientador = null;
      if (g.orientadorId) {
        const [o] = await db.select({ id: schema.pessoa.id, nome: schema.pessoa.nome })
          .from(schema.pessoa).where(eq(schema.pessoa.id, g.orientadorId));
        orientador = o || null;
      }
      return { ...g, orientador };
    }));
    
    return result;
  }),

  create: protectedProcedure
    .input(z.object({
      nome: z.string().min(2).max(100),
      descricao: z.string().optional(),
      diaSemana: z.number().min(0).max(6).optional(),
      horario: z.string().max(10).optional(),
      sala: z.string().max(50).optional(),
      orientadorId: z.string().uuid().optional(),
      obraEstudo: z.string().max(200).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const [grupo] = await db.insert(schema.grupoEstudo).values({
        ...input,
        createdBy: ctx.user.id,
      }).returning();
      return grupo;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      nome: z.string().min(2).max(100).optional(),
      descricao: z.string().nullable().optional(),
      diaSemana: z.number().min(0).max(6).nullable().optional(),
      horario: z.string().max(10).nullable().optional(),
      sala: z.string().max(50).nullable().optional(),
      orientadorId: z.string().uuid().nullable().optional(),
      obraEstudo: z.string().max(200).nullable().optional(),
      ativo: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { id, ...data } = input;
      await db.update(schema.grupoEstudo)
        .set({ ...data, updatedAt: new Date(), updatedBy: ctx.user.id })
        .where(eq(schema.grupoEstudo.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.delete(schema.grupoEstudo).where(eq(schema.grupoEstudo.id, input));
      return { success: true };
    }),
});

// ==================== MÓDULO E: CENTROS DE CUSTO ====================
const centroCustoRouter = router({
  list: publicProcedure
    .input(z.object({
      ativo: z.boolean().optional(),
      responsavelId: z.string().uuid().optional(),
      busca: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions = [];
      
      if (input?.ativo !== undefined) {
        conditions.push(eq(schema.centroCusto.ativo, input.ativo));
      }
      if (input?.responsavelId) {
        conditions.push(eq(schema.centroCusto.responsavelId, input.responsavelId));
      }
      if (input?.busca) {
        conditions.push(or(
          like(schema.centroCusto.codigo, `%${input.busca}%`),
          like(schema.centroCusto.nome, `%${input.busca}%`)
        ));
      }

      const centros = await db.select().from(schema.centroCusto)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(schema.centroCusto.codigo));

      // Contar projetos por centro
      const result = await Promise.all(centros.map(async (c) => {
        const [projetosCount] = await db.select({ count: sql<number>`count(*)` })
          .from(schema.projeto)
          .where(eq(schema.projeto.centroCustoId, c.id));
        
        let responsavel = null;
        if (c.responsavelId) {
          const [r] = await db.select({ id: schema.pessoa.id, nome: schema.pessoa.nome })
            .from(schema.pessoa).where(eq(schema.pessoa.id, c.responsavelId));
          responsavel = r || null;
        }
        
        return { ...c, projetosCount: projetosCount.count, responsavel };
      }));

      return result;
    }),

  byId: publicProcedure
    .input(z.string().uuid())
    .query(async ({ input }) => {
      const db = await getDb();
      const [centro] = await db.select().from(schema.centroCusto).where(eq(schema.centroCusto.id, input));
      if (!centro) throw new TRPCError({ code: 'NOT_FOUND', message: 'Centro de custo não encontrado' });
      
      let responsavel = null;
      if (centro.responsavelId) {
        const [r] = await db.select({ id: schema.pessoa.id, nome: schema.pessoa.nome })
          .from(schema.pessoa).where(eq(schema.pessoa.id, centro.responsavelId));
        responsavel = r || null;
      }
      
      return { ...centro, responsavel };
    }),

  create: protectedProcedure
    .input(z.object({
      codigo: z.string().min(1).max(20),
      nome: z.string().min(3).max(100),
      descricao: z.string().optional(),
      responsavelId: z.string().uuid().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      const [existing] = await db.select().from(schema.centroCusto)
        .where(eq(schema.centroCusto.codigo, input.codigo));
      if (existing) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Este código já está em uso' });
      }
      
      const [centro] = await db.insert(schema.centroCusto).values({
        ...input,
        createdBy: ctx.user.id,
      }).returning();
      
      return centro;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      nome: z.string().min(3).max(100).optional(),
      descricao: z.string().nullable().optional(),
      responsavelId: z.string().uuid().nullable().optional(),
      ativo: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { id, ...data } = input;
      
      await db.update(schema.centroCusto)
        .set({ ...data, updatedAt: new Date(), updatedBy: ctx.user.id })
        .where(eq(schema.centroCusto.id, id));
      
      return { success: true };
    }),

  inativar: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Verificar se há projetos ativos vinculados
      const [projetosAtivos] = await db.select({ count: sql<number>`count(*)` })
        .from(schema.projeto)
        .where(and(
          eq(schema.projeto.centroCustoId, input),
          or(
            eq(schema.projeto.status, 'planejamento'),
            eq(schema.projeto.status, 'em_andamento')
          )
        ));
      
      if (projetosAtivos.count > 0) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'Conclua ou cancele os projetos deste centro' 
        });
      }
      
      await db.update(schema.centroCusto)
        .set({ ativo: false, updatedAt: new Date(), updatedBy: ctx.user.id })
        .where(eq(schema.centroCusto.id, input));
      
      return { success: true };
    }),
});

// ==================== MÓDULO E: PROJETOS ====================
const projetoRouter = router({
  list: publicProcedure
    .input(z.object({
      status: z.array(z.enum(['planejamento', 'em_andamento', 'suspenso', 'concluido', 'cancelado'])).optional(),
      parceriaMrosc: z.boolean().optional(),
      centroCustoId: z.string().uuid().optional(),
      responsavelId: z.string().uuid().optional(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
      busca: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions = [];
      
      if (input?.status && input.status.length > 0) {
        conditions.push(or(...input.status.map(s => eq(schema.projeto.status, s))));
      }
      if (input?.parceriaMrosc !== undefined) {
        conditions.push(eq(schema.projeto.parceriaMrosc, input.parceriaMrosc));
      }
      if (input?.centroCustoId) {
        conditions.push(eq(schema.projeto.centroCustoId, input.centroCustoId));
      }
      if (input?.responsavelId) {
        conditions.push(eq(schema.projeto.responsavelId, input.responsavelId));
      }
      if (input?.busca) {
        conditions.push(or(
          like(schema.projeto.codigo, `%${input.busca}%`),
          like(schema.projeto.nome, `%${input.busca}%`)
        ));
      }

      const projetos = await db.select().from(schema.projeto)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(schema.projeto.codigo));

      const result = await Promise.all(projetos.map(async (p) => {
        let centroCusto = null;
        if (p.centroCustoId) {
          const [cc] = await db.select({ id: schema.centroCusto.id, codigo: schema.centroCusto.codigo, nome: schema.centroCusto.nome })
            .from(schema.centroCusto).where(eq(schema.centroCusto.id, p.centroCustoId));
          centroCusto = cc || null;
        }
        
        let responsavel = null;
        if (p.responsavelId) {
          const [r] = await db.select({ id: schema.pessoa.id, nome: schema.pessoa.nome })
            .from(schema.pessoa).where(eq(schema.pessoa.id, p.responsavelId));
          responsavel = r || null;
        }
        
        return { ...p, centroCusto, responsavel };
      }));

      return result;
    }),

  byId: publicProcedure
    .input(z.string().uuid())
    .query(async ({ input }) => {
      const db = await getDb();
      const [projeto] = await db.select().from(schema.projeto).where(eq(schema.projeto.id, input));
      if (!projeto) throw new TRPCError({ code: 'NOT_FOUND', message: 'Projeto não encontrado' });
      
      let centroCusto = null;
      if (projeto.centroCustoId) {
        const [cc] = await db.select().from(schema.centroCusto).where(eq(schema.centroCusto.id, projeto.centroCustoId));
        centroCusto = cc || null;
      }
      
      let responsavel = null;
      if (projeto.responsavelId) {
        const [r] = await db.select({ id: schema.pessoa.id, nome: schema.pessoa.nome })
          .from(schema.pessoa).where(eq(schema.pessoa.id, projeto.responsavelId));
        responsavel = r || null;
      }
      
      // Calcular orçamento executado (soma de títulos vinculados quitados)
      const [orcamentoExecutado] = await db.select({ total: sql<string>`COALESCE(SUM(valor_liquido), 0)` })
        .from(schema.titulo)
        .where(and(
          eq(schema.titulo.projetoId, input),
          eq(schema.titulo.status, 'quitado')
        ));
      
      return { 
        ...projeto, 
        centroCusto, 
        responsavel,
        orcamentoExecutado: parseFloat(orcamentoExecutado?.total || '0')
      };
    }),

  create: protectedProcedure
    .input(z.object({
      codigo: z.string().min(1).max(20),
      nome: z.string().min(3).max(200),
      descricao: z.string().optional(),
      dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      dataFimPrevista: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      orcamentoPrevisto: z.number().positive().optional(),
      status: z.enum(['planejamento', 'em_andamento', 'suspenso', 'concluido', 'cancelado']).default('planejamento'),
      centroCustoId: z.string().uuid().optional(),
      responsavelId: z.string().uuid().optional(),
      parceriaMrosc: z.boolean().default(false),
      numeroTermoParceria: z.string().max(50).optional(),
      orgaoParceiro: z.string().max(200).optional(),
    }).refine(data => {
      if (data.parceriaMrosc) {
        return !!data.numeroTermoParceria && !!data.orgaoParceiro;
      }
      return true;
    }, { message: 'Informe o número do termo e órgão parceiro' }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      const [existing] = await db.select().from(schema.projeto)
        .where(eq(schema.projeto.codigo, input.codigo));
      if (existing) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Este código já está em uso' });
      }
      
      const [projeto] = await db.insert(schema.projeto).values({
        ...input,
        orcamentoPrevisto: input.orcamentoPrevisto?.toString(),
        createdBy: ctx.user.id,
      }).returning();
      
      return projeto;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      nome: z.string().min(3).max(200).optional(),
      descricao: z.string().nullable().optional(),
      dataFimPrevista: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      orcamentoPrevisto: z.number().positive().optional(),
      responsavelId: z.string().uuid().nullable().optional(),
      status: z.enum(['planejamento', 'em_andamento', 'suspenso', 'concluido', 'cancelado']).optional(),
      parceriaMrosc: z.boolean().optional(),
      numeroTermoParceria: z.string().max(50).optional(),
      orgaoParceiro: z.string().max(200).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { id, orcamentoPrevisto, ...data } = input;
      
      const updateData: any = { ...data, updatedAt: new Date(), updatedBy: ctx.user.id };
      if (orcamentoPrevisto !== undefined) {
        updateData.orcamentoPrevisto = orcamentoPrevisto.toString();
      }
      
      await db.update(schema.projeto).set(updateData).where(eq(schema.projeto.id, id));
      
      return { success: true };
    }),

  concluir: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      dataFimReal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      await db.update(schema.projeto).set({
        status: 'concluido',
        dataFimReal: input.dataFimReal,
        updatedAt: new Date(),
        updatedBy: ctx.user.id,
      }).where(eq(schema.projeto.id, input.id));
      
      return { success: true };
    }),

  cancelar: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      motivo: z.string().min(10),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      await db.update(schema.projeto).set({
        status: 'cancelado',
        updatedAt: new Date(),
        updatedBy: ctx.user.id,
      }).where(eq(schema.projeto.id, input.id));
      
      return { success: true };
    }),
});

// ==================== MÓDULO E: FUNDOS ====================
const fundoRouter = router({
  list: publicProcedure
    .input(z.object({
      tipo: z.array(z.enum(['restrito', 'designado', 'livre'])).optional(),
      ativo: z.boolean().optional(),
      comDataLimite: z.boolean().optional(),
      saldoPositivo: z.boolean().optional(),
      busca: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions = [];
      
      if (input?.tipo && input.tipo.length > 0) {
        conditions.push(or(...input.tipo.map(t => eq(schema.fundo.tipo, t))));
      }
      if (input?.ativo !== undefined) {
        conditions.push(eq(schema.fundo.ativo, input.ativo));
      }
      if (input?.comDataLimite) {
        conditions.push(sql`${schema.fundo.dataLimite} IS NOT NULL`);
      }
      if (input?.saldoPositivo) {
        conditions.push(sql`CAST(${schema.fundo.saldoAtual} AS NUMERIC) > 0`);
      }
      if (input?.busca) {
        conditions.push(or(
          like(schema.fundo.codigo, `%${input.busca}%`),
          like(schema.fundo.nome, `%${input.busca}%`)
        ));
      }

      const fundos = await db.select().from(schema.fundo)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(schema.fundo.codigo));

      return fundos;
    }),

  byId: publicProcedure
    .input(z.string().uuid())
    .query(async ({ input }) => {
      const db = await getDb();
      const [fundo] = await db.select().from(schema.fundo).where(eq(schema.fundo.id, input));
      if (!fundo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Fundo não encontrado' });
      
      const regras = await db.select().from(schema.fundoRegra)
        .where(eq(schema.fundoRegra.fundoId, input))
        .orderBy(desc(schema.fundoRegra.createdAt));
      
      return { ...fundo, regras };
    }),

  create: protectedProcedure
    .input(z.object({
      codigo: z.string().min(1).max(20),
      nome: z.string().min(3).max(200),
      descricao: z.string().optional(),
      tipo: z.enum(['restrito', 'designado', 'livre']),
      finalidade: z.string().optional(),
      dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      dataLimite: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      metaValor: z.number().positive().optional(),
      saldoInicial: z.number().min(0).default(0),
      regras: z.array(z.object({
        tipoRegra: z.enum(['percentual_receita', 'categoria_permitida', 'categoria_proibida', 'valor_maximo', 'aprovador_obrigatorio']),
        parametroTexto: z.string().optional(),
        parametroNumerico: z.number().optional(),
        parametroLista: z.array(z.string()).optional(),
      })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      const [existing] = await db.select().from(schema.fundo)
        .where(eq(schema.fundo.codigo, input.codigo));
      if (existing) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Este código já está em uso' });
      }
      
      const { regras, saldoInicial, metaValor, ...fundoData } = input;
      
      const [fundo] = await db.insert(schema.fundo).values({
        ...fundoData,
        metaValor: metaValor?.toString(),
        saldoAtual: saldoInicial.toString(),
        createdBy: ctx.user.id,
      }).returning();
      
      // Inserir regras
      if (regras && regras.length > 0) {
        await db.insert(schema.fundoRegra).values(
          regras.map(r => ({
            fundoId: fundo.id,
            tipoRegra: r.tipoRegra,
            parametroTexto: r.parametroTexto,
            parametroNumerico: r.parametroNumerico?.toString(),
            parametroLista: r.parametroLista,
            createdBy: ctx.user.id,
          }))
        );
      }
      
      return fundo;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      nome: z.string().min(3).max(200).optional(),
      descricao: z.string().nullable().optional(),
      tipo: z.enum(['restrito', 'designado', 'livre']).optional(),
      finalidade: z.string().nullable().optional(),
      dataLimite: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      metaValor: z.number().positive().optional(),
      ativo: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { id, metaValor, tipo, ...data } = input;
      
      // Verificar se está tentando mudar tipo restrito para livre
      if (tipo) {
        const [fundoAtual] = await db.select().from(schema.fundo).where(eq(schema.fundo.id, id));
        if (fundoAtual && fundoAtual.tipo === 'restrito' && tipo === 'livre') {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Fundos restritos não podem mudar de tipo' 
          });
        }
      }
      
      const updateData: any = { ...data, updatedAt: new Date(), updatedBy: ctx.user.id };
      if (metaValor !== undefined) updateData.metaValor = metaValor.toString();
      if (tipo !== undefined) updateData.tipo = tipo;
      
      await db.update(schema.fundo).set(updateData).where(eq(schema.fundo.id, id));
      
      return { success: true };
    }),

  inativar: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      await db.update(schema.fundo)
        .set({ ativo: false, updatedAt: new Date(), updatedBy: ctx.user.id })
        .where(eq(schema.fundo.id, input));
      
      return { success: true };
    }),
});

// ==================== MÓDULO E: REGRAS DE FUNDO ====================
const fundoRegraRouter = router({
  list: publicProcedure
    .input(z.string().uuid())
    .query(async ({ input }) => {
      const db = await getDb();
      return db.select().from(schema.fundoRegra)
        .where(eq(schema.fundoRegra.fundoId, input))
        .orderBy(desc(schema.fundoRegra.createdAt));
    }),

  create: protectedProcedure
    .input(z.object({
      fundoId: z.string().uuid(),
      tipoRegra: z.enum(['percentual_receita', 'categoria_permitida', 'categoria_proibida', 'valor_maximo', 'aprovador_obrigatorio']),
      parametroTexto: z.string().optional(),
      parametroNumerico: z.number().optional(),
      parametroLista: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      const [regra] = await db.insert(schema.fundoRegra).values({
        ...input,
        parametroNumerico: input.parametroNumerico?.toString(),
        createdBy: ctx.user.id,
      }).returning();
      
      return regra;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      parametroTexto: z.string().optional(),
      parametroNumerico: z.number().optional(),
      parametroLista: z.array(z.string()).optional(),
      ativo: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { id, parametroNumerico, ...data } = input;
      
      const updateData: any = { ...data, updatedAt: new Date(), updatedBy: ctx.user.id };
      if (parametroNumerico !== undefined) updateData.parametroNumerico = parametroNumerico.toString();
      
      await db.update(schema.fundoRegra).set(updateData).where(eq(schema.fundoRegra.id, id));
      
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.string().uuid())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      await db.update(schema.fundoRegra)
        .set({ ativo: false, updatedAt: new Date(), updatedBy: ctx.user.id })
        .where(eq(schema.fundoRegra.id, input));
      return { success: true };
    }),
});

// ==================== MÓDULO E: ALOCAÇÕES DE FUNDO ====================
const fundoAlocacaoRouter = router({
  list: publicProcedure
    .input(z.object({
      fundoId: z.string().uuid().optional(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions = [];
      
      if (input?.fundoId) {
        conditions.push(eq(schema.fundoAlocacao.fundoId, input.fundoId));
      }
      if (input?.dataInicio && input?.dataFim) {
        conditions.push(between(schema.fundoAlocacao.dataAlocacao, input.dataInicio, input.dataFim));
      }

      const alocacoes = await db.select().from(schema.fundoAlocacao)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(schema.fundoAlocacao.dataAlocacao));

      const result = await Promise.all(alocacoes.map(async (a) => {
        const [fundo] = await db.select({ id: schema.fundo.id, codigo: schema.fundo.codigo, nome: schema.fundo.nome })
          .from(schema.fundo).where(eq(schema.fundo.id, a.fundoId));
        return { ...a, fundo };
      }));

      return result;
    }),

  create: protectedProcedure
    .input(z.object({
      fundoId: z.string().uuid(),
      valor: z.number().positive(),
      dataAlocacao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      origemDescricao: z.string().min(1).max(500),
      lancamentoLinhaId: z.string().uuid().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Buscar fundo atual
      const [fundo] = await db.select().from(schema.fundo).where(eq(schema.fundo.id, input.fundoId));
      if (!fundo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Fundo não encontrado' });
      
      // Criar alocação (lancamentoLinhaId pode ser null para alocações manuais)
      const [alocacao] = await db.insert(schema.fundoAlocacao).values({
        fundoId: input.fundoId,
        valor: input.valor.toString(),
        dataAlocacao: input.dataAlocacao,
        origemDescricao: input.origemDescricao,
        lancamentoLinhaId: input.lancamentoLinhaId || null as any,
        createdBy: ctx.user.id,
      }).returning();
      
      // Atualizar saldo do fundo
      const novoSaldo = parseFloat(fundo.saldoAtual) + input.valor;
      await db.update(schema.fundo)
        .set({ saldoAtual: novoSaldo.toString(), updatedAt: new Date() })
        .where(eq(schema.fundo.id, input.fundoId));
      
      return { alocacao, novoSaldo };
    }),
});

// ==================== MÓDULO E: CONSUMOS DE FUNDO ====================
const fundoConsumoRouter = router({
  list: publicProcedure
    .input(z.object({
      fundoId: z.string().uuid().optional(),
      status: z.enum(['pendente', 'aprovado', 'rejeitado']).optional(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions = [];
      
      if (input?.fundoId) {
        conditions.push(eq(schema.fundoConsumo.fundoId, input.fundoId));
      }
      if (input?.dataInicio && input?.dataFim) {
        conditions.push(between(schema.fundoConsumo.dataConsumo, input.dataInicio, input.dataFim));
      }

      const consumos = await db.select().from(schema.fundoConsumo)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(schema.fundoConsumo.dataConsumo));

      const result = await Promise.all(consumos.map(async (c) => {
        const [fundo] = await db.select({ id: schema.fundo.id, codigo: schema.fundo.codigo, nome: schema.fundo.nome })
          .from(schema.fundo).where(eq(schema.fundo.id, c.fundoId));
        return { ...c, fundo, status: c.aprovadoPor ? 'aprovado' : 'pendente' };
      }));

      return result;
    }),

  pendentes: publicProcedure.query(async () => {
    const db = await getDb();
    
    const consumos = await db.select().from(schema.fundoConsumo)
      .where(isNull(schema.fundoConsumo.aprovadoPor))
      .orderBy(desc(schema.fundoConsumo.dataConsumo));

    const result = await Promise.all(consumos.map(async (c) => {
      const [fundo] = await db.select().from(schema.fundo).where(eq(schema.fundo.id, c.fundoId));
      
      // Buscar regra que exige aprovação
      const regras = await db.select().from(schema.fundoRegra)
        .where(and(
          eq(schema.fundoRegra.fundoId, c.fundoId),
          eq(schema.fundoRegra.tipoRegra, 'aprovador_obrigatorio'),
          eq(schema.fundoRegra.ativo, true)
        ));
      
      return { ...c, fundo, regraAprovacao: regras[0] || null };
    }));

    return result;
  }),

  create: protectedProcedure
    .input(z.object({
      fundoId: z.string().uuid(),
      valor: z.number().positive(),
      dataConsumo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      justificativa: z.string().min(10).max(1000),
      tituloId: z.string().uuid().optional(),
      lancamentoLinhaId: z.string().uuid().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Buscar fundo
      const [fundo] = await db.select().from(schema.fundo).where(eq(schema.fundo.id, input.fundoId));
      if (!fundo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Fundo não encontrado' });
      
      // Validar saldo
      const saldoAtual = parseFloat(fundo.saldoAtual);
      if (input.valor > saldoAtual) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: `Saldo insuficiente. Disponível: R$ ${saldoAtual.toFixed(2).replace('.', ',')}` 
        });
      }
      
      // Buscar regras do fundo
      const regras = await db.select().from(schema.fundoRegra)
        .where(and(eq(schema.fundoRegra.fundoId, input.fundoId), eq(schema.fundoRegra.ativo, true)));
      
      // Validar regra de valor máximo
      const regraValorMaximo = regras.find(r => r.tipoRegra === 'valor_maximo');
      if (regraValorMaximo && regraValorMaximo.parametroNumerico) {
        const limite = parseFloat(regraValorMaximo.parametroNumerico);
        if (input.valor > limite) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: `Valor excede limite de R$ ${limite.toFixed(2).replace('.', ',')} por operação` 
          });
        }
      }
      
      // Verificar se precisa de aprovação
      const regraAprovador = regras.find(r => r.tipoRegra === 'aprovador_obrigatorio');
      
      // Criar consumo (lancamentoLinhaId pode ser null para consumos manuais)
      const [consumo] = await db.insert(schema.fundoConsumo).values({
        fundoId: input.fundoId,
        valor: input.valor.toString(),
        dataConsumo: input.dataConsumo,
        justificativa: input.justificativa,
        tituloId: input.tituloId,
        lancamentoLinhaId: input.lancamentoLinhaId || null as any,
        createdBy: ctx.user.id,
      }).returning();
      
      // Se não precisa de aprovação, aprovar automaticamente e baixar saldo
      if (!regraAprovador) {
        const novoSaldo = saldoAtual - input.valor;
        await db.update(schema.fundo)
          .set({ saldoAtual: novoSaldo.toString(), updatedAt: new Date() })
          .where(eq(schema.fundo.id, input.fundoId));
        
        await db.update(schema.fundoConsumo)
          .set({ aprovadoPor: ctx.user.id, aprovadoEm: new Date() })
          .where(eq(schema.fundoConsumo.id, consumo.id));
        
        return { consumo, status: 'aprovado', novoSaldo };
      }
      
      return { consumo, status: 'pendente', requerAprovacao: true };
    }),

  aprovar: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      observacao: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      const [consumo] = await db.select().from(schema.fundoConsumo).where(eq(schema.fundoConsumo.id, input.id));
      if (!consumo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Consumo não encontrado' });
      
      const [fundo] = await db.select().from(schema.fundo).where(eq(schema.fundo.id, consumo.fundoId));
      if (!fundo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Fundo não encontrado' });
      
      const valorConsumo = parseFloat(consumo.valor);
      const saldoAtual = parseFloat(fundo.saldoAtual);
      
      if (valorConsumo > saldoAtual) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: `Saldo insuficiente. Disponível: R$ ${saldoAtual.toFixed(2).replace('.', ',')}` 
        });
      }
      
      // Aprovar consumo
      await db.update(schema.fundoConsumo)
        .set({ aprovadoPor: ctx.user.id, aprovadoEm: new Date() })
        .where(eq(schema.fundoConsumo.id, input.id));
      
      // Baixar saldo
      const novoSaldo = saldoAtual - valorConsumo;
      await db.update(schema.fundo)
        .set({ saldoAtual: novoSaldo.toString(), updatedAt: new Date() })
        .where(eq(schema.fundo.id, consumo.fundoId));
      
      return { success: true, novoSaldo };
    }),

  rejeitar: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      observacao: z.string().min(5),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Deletar o consumo rejeitado
      await db.delete(schema.fundoConsumo).where(eq(schema.fundoConsumo.id, input.id));
      
      return { success: true };
    }),
});

// ==================== MÓDULO G: GOVERNANÇA E AUDITORIA ====================

// Papéis padrão protegidos
const PAPEIS_PROTEGIDOS = ['admin', 'contador', 'financeiro', 'auditor', 'visualizador', 'diretor', 'operador'];

// Usuários Router
const usuariosRouter = router({
  // Endpoint para obter usuário atual e suas permissões
  me: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!ctx.user?.email) return null;

    const [usuario] = await db.select().from(schema.usuario)
      .where(eq(schema.usuario.email, ctx.user.email));

    if (!usuario) return null;

    // Buscar papéis e permissões ativos
    const permissoesResult = await db.execute(sql`
      SELECT DISTINCT p.codigo
      FROM usuario_papel up
      INNER JOIN papel_permissao pp ON up.papel_id = pp.papel_id
      INNER JOIN permissao p ON pp.permissao_id = p.id
      WHERE up.usuario_id = ${usuario.id}
        AND (up.data_fim IS NULL OR up.data_fim > CURRENT_DATE)
    `);

    const papeisResult = await db.execute(sql`
      SELECT p.codigo, p.nome, p.nivel
      FROM usuario_papel up
      INNER JOIN papel p ON up.papel_id = p.id
      WHERE up.usuario_id = ${usuario.id}
        AND (up.data_fim IS NULL OR up.data_fim > CURRENT_DATE)
    `);

    return {
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      avatarUrl: usuario.avatarUrl,
      ativo: usuario.ativo,
      papeis: papeisResult.rows as { codigo: string; nome: string; nivel: number }[],
      permissoes: (permissoesResult.rows as { codigo: string }[]).map(r => r.codigo),
      nivelMaximo: Math.max(0, ...((papeisResult.rows as { nivel: number }[]).map(r => r.nivel))),
    };
  }),

  // Verificar se o usuário tem uma permissão específica
  temPermissao: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.email) return false;

      const db = await getDb();
      const [usuario] = await db.select({ id: schema.usuario.id }).from(schema.usuario)
        .where(and(eq(schema.usuario.email, ctx.user.email), eq(schema.usuario.ativo, true)));

      if (!usuario) return false;

      const result = await db.execute(sql`
        SELECT 1 FROM usuario_papel up
        INNER JOIN papel_permissao pp ON up.papel_id = pp.papel_id
        INNER JOIN permissao p ON pp.permissao_id = p.id
        WHERE up.usuario_id = ${usuario.id}
          AND (up.data_fim IS NULL OR up.data_fim > CURRENT_DATE)
          AND p.codigo = ${input}
        LIMIT 1
      `);

      return result.rows.length > 0;
    }),

  list: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      ativo: z.boolean().optional(),
      papelId: z.string().uuid().optional(),
      page: z.number().default(1),
      limit: z.number().min(1).max(100).default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const page = input?.page || 1;
      const limit = input?.limit || 50;
      const offset = (page - 1) * limit;

      const results = await db.execute(sql`
        SELECT 
          u.id, u.auth_provider_id, u.email, u.nome, u.avatar_url, u.ativo, u.ultimo_acesso,
          u.created_at, u.updated_at,
          COALESCE(
            json_agg(
              json_build_object('papelId', p.id, 'codigo', p.codigo, 'nome', p.nome, 'nivel', p.nivel, 'dataInicio', up.data_inicio, 'dataFim', up.data_fim)
            ) FILTER (WHERE p.id IS NOT NULL AND (up.data_fim IS NULL OR up.data_fim > CURRENT_DATE)),
            '[]'
          ) as papeis_ativos
        FROM usuario u
        LEFT JOIN usuario_papel up ON u.id = up.usuario_id AND (up.data_fim IS NULL OR up.data_fim > CURRENT_DATE)
        LEFT JOIN papel p ON up.papel_id = p.id
        WHERE 1=1
          ${input?.search ? sql`AND (u.nome ILIKE ${'%' + input.search + '%'} OR u.email ILIKE ${'%' + input.search + '%'})` : sql``}
          ${input?.ativo !== undefined ? sql`AND u.ativo = ${input.ativo}` : sql``}
          ${input?.papelId ? sql`AND up.papel_id = ${input.papelId}` : sql``}
        GROUP BY u.id
        ORDER BY u.nome ASC
        LIMIT ${limit} OFFSET ${offset}
      `);

      const countResult = await db.execute(sql`
        SELECT COUNT(DISTINCT u.id) as total FROM usuario u
        LEFT JOIN usuario_papel up ON u.id = up.usuario_id
        WHERE 1=1
          ${input?.search ? sql`AND (u.nome ILIKE ${'%' + input.search + '%'} OR u.email ILIKE ${'%' + input.search + '%'})` : sql``}
          ${input?.ativo !== undefined ? sql`AND u.ativo = ${input.ativo}` : sql``}
          ${input?.papelId ? sql`AND up.papel_id = ${input.papelId}` : sql``}
      `);

      const total = Number(countResult.rows[0]?.total || 0);
      return {
        usuarios: results.rows,
        total,
        pages: Math.ceil(total / limit),
      };
    }),

  getById: adminProcedure
    .input(z.string().uuid())
    .query(async ({ input }) => {
      const db = await getDb();
      const [usuario] = await db.select().from(schema.usuario).where(eq(schema.usuario.id, input));
      if (!usuario) throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });

      const papeis = await db.select({
        papelId: schema.usuarioPapel.papelId,
        dataInicio: schema.usuarioPapel.dataInicio,
        dataFim: schema.usuarioPapel.dataFim,
        papel: schema.papel,
      })
        .from(schema.usuarioPapel)
        .leftJoin(schema.papel, eq(schema.usuarioPapel.papelId, schema.papel.id))
        .where(eq(schema.usuarioPapel.usuarioId, input));

      return { ...usuario, papeis };
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      nome: z.string().min(2).max(255).optional(),
      avatarUrl: z.string().url().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { id, ...updateData } = input;

      const filteredData: any = {};
      if (updateData.nome !== undefined) filteredData.nome = updateData.nome;
      if (updateData.avatarUrl !== undefined) filteredData.avatarUrl = updateData.avatarUrl;
      filteredData.updatedAt = new Date();
      filteredData.updatedBy = ctx.user?.id;

      await db.update(schema.usuario).set(filteredData).where(eq(schema.usuario.id, id));

      const visitorId = await getVisitorId(ctx.user?.email || null);
      await db.insert(schema.eventoAuditoria).values({
        usuarioId: visitorId,
        entidadeTipo: 'usuario',
        entidadeId: id,
        acao: 'atualizar',
        dadosNovos: filteredData,
        ipOrigem: ctx.ipAddress || null,
        userAgent: ctx.userAgent || null,
      });

      return { success: true };
    }),

  desativar: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      motivo: z.string().min(10).max(500),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Verificar se não é o último admin
      const adminCount = await db.execute(sql`
        SELECT COUNT(DISTINCT u.id) as total 
        FROM usuario u
        INNER JOIN usuario_papel up ON u.id = up.usuario_id
        INNER JOIN papel p ON up.papel_id = p.id
        WHERE u.ativo = true AND p.codigo = 'admin'
        AND (up.data_fim IS NULL OR up.data_fim > CURRENT_DATE)
      `);

      const [usuario] = await db.select().from(schema.usuario).where(eq(schema.usuario.id, input.id));
      if (!usuario) throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });

      // Verificar se este usuário é admin
      const isAdmin = await db.execute(sql`
        SELECT 1 FROM usuario_papel up
        INNER JOIN papel p ON up.papel_id = p.id
        WHERE up.usuario_id = ${input.id} AND p.codigo = 'admin'
        AND (up.data_fim IS NULL OR up.data_fim > CURRENT_DATE)
        LIMIT 1
      `);

      if (isAdmin.rows.length > 0 && Number(adminCount.rows[0]?.total || 0) <= 1) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Deve haver pelo menos um administrador ativo no sistema' });
      }

      // Desativar usuário e encerrar papéis
      await db.update(schema.usuario).set({ ativo: false, updatedAt: new Date(), updatedBy: ctx.user?.id }).where(eq(schema.usuario.id, input.id));
      await db.update(schema.usuarioPapel).set({ dataFim: new Date().toISOString().split('T')[0] }).where(and(eq(schema.usuarioPapel.usuarioId, input.id), isNull(schema.usuarioPapel.dataFim)));

      const visitorId = await getVisitorId(ctx.user?.email || null);
      await db.insert(schema.eventoAuditoria).values({
        usuarioId: visitorId,
        entidadeTipo: 'usuario',
        entidadeId: input.id,
        acao: 'excluir',
        dadosAnteriores: { ativo: true },
        dadosNovos: { ativo: false, motivo: input.motivo },
        ipOrigem: ctx.ipAddress || null,
        userAgent: ctx.userAgent || null,
      });

      return { success: true };
    }),

  atribuirPapel: adminProcedure
    .input(z.object({
      usuarioId: z.string().uuid(),
      papelId: z.string().uuid(),
      dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Verificar se já não tem esse papel ativo
      const existing = await db.select().from(schema.usuarioPapel)
        .where(and(
          eq(schema.usuarioPapel.usuarioId, input.usuarioId),
          eq(schema.usuarioPapel.papelId, input.papelId),
        ));

      if (existing.length > 0) {
        // Atualizar existente
        await db.update(schema.usuarioPapel)
          .set({ dataInicio: input.dataInicio, dataFim: input.dataFim || null })
          .where(and(eq(schema.usuarioPapel.usuarioId, input.usuarioId), eq(schema.usuarioPapel.papelId, input.papelId)));
      } else {
        await db.insert(schema.usuarioPapel).values({
          usuarioId: input.usuarioId,
          papelId: input.papelId,
          dataInicio: input.dataInicio,
          dataFim: input.dataFim || null,
        });
      }

      const visitorId = await getVisitorId(ctx.user?.email || null);
      await db.insert(schema.eventoAuditoria).values({
        usuarioId: visitorId,
        entidadeTipo: 'usuario_papel',
        entidadeId: input.usuarioId,
        acao: 'criar',
        dadosNovos: input,
        ipOrigem: ctx.ipAddress || null,
        userAgent: ctx.userAgent || null,
      });

      return { success: true };
    }),

  removerPapel: adminProcedure
    .input(z.object({
      usuarioId: z.string().uuid(),
      papelId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Verificar se não é o último admin
      const [papel] = await db.select().from(schema.papel).where(eq(schema.papel.id, input.papelId));
      if (papel?.codigo === 'admin') {
        const adminCount = await db.execute(sql`
          SELECT COUNT(DISTINCT u.id) as total 
          FROM usuario u
          INNER JOIN usuario_papel up ON u.id = up.usuario_id
          INNER JOIN papel p ON up.papel_id = p.id
          WHERE u.ativo = true AND p.codigo = 'admin'
          AND (up.data_fim IS NULL OR up.data_fim > CURRENT_DATE)
        `);
        if (Number(adminCount.rows[0]?.total || 0) <= 1) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Deve haver pelo menos um administrador ativo no sistema' });
        }
      }

      await db.update(schema.usuarioPapel)
        .set({ dataFim: new Date().toISOString().split('T')[0] })
        .where(and(eq(schema.usuarioPapel.usuarioId, input.usuarioId), eq(schema.usuarioPapel.papelId, input.papelId)));

      const visitorId = await getVisitorId(ctx.user?.email || null);
      await db.insert(schema.eventoAuditoria).values({
        usuarioId: visitorId,
        entidadeTipo: 'usuario_papel',
        entidadeId: input.usuarioId,
        acao: 'excluir',
        dadosNovos: { papelId: input.papelId, encerradoEm: new Date() },
        ipOrigem: ctx.ipAddress || null,
        userAgent: ctx.userAgent || null,
      });

      return { success: true };
    }),

  countAdmins: adminProcedure.query(async () => {
    const db = await getDb();
    const result = await db.execute(sql`
      SELECT COUNT(DISTINCT u.id) as total 
      FROM usuario u
      INNER JOIN usuario_papel up ON u.id = up.usuario_id
      INNER JOIN papel p ON up.papel_id = p.id
      WHERE u.ativo = true AND p.codigo = 'admin'
      AND (up.data_fim IS NULL OR up.data_fim > CURRENT_DATE)
    `);
    return { count: Number(result.rows[0]?.total || 0) };
  }),
});

// Papéis Router
const papeisRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    const results = await db.execute(sql`
      SELECT 
        p.*,
        COUNT(DISTINCT CASE WHEN up.data_fim IS NULL OR up.data_fim > CURRENT_DATE THEN up.usuario_id END) as usuarios_count,
        CASE WHEN p.codigo IN ('admin', 'contador', 'financeiro', 'auditor', 'visualizador', 'diretor', 'operador') THEN true ELSE false END as protegido
      FROM papel p
      LEFT JOIN usuario_papel up ON p.id = up.papel_id
      GROUP BY p.id
      ORDER BY p.nivel DESC, p.nome ASC
    `);
    return results.rows;
  }),

  getById: protectedProcedure
    .input(z.string().uuid())
    .query(async ({ input }) => {
      const db = await getDb();
      const [papel] = await db.select().from(schema.papel).where(eq(schema.papel.id, input));
      if (!papel) throw new TRPCError({ code: 'NOT_FOUND', message: 'Papel não encontrado' });

      const permissoes = await db.select({ permissao: schema.permissao })
        .from(schema.papelPermissao)
        .leftJoin(schema.permissao, eq(schema.papelPermissao.permissaoId, schema.permissao.id))
        .where(eq(schema.papelPermissao.papelId, input));

      return { ...papel, permissoes: permissoes.map(p => p.permissao), protegido: PAPEIS_PROTEGIDOS.includes(papel.codigo) };
    }),

  create: adminProcedure
    .input(z.object({
      codigo: z.string().min(3).max(50).regex(/^[a-z_]+$/, 'Use apenas letras minúsculas e underscore'),
      nome: z.string().min(3).max(100),
      descricao: z.string().optional(),
      nivel: z.number().min(1).max(100),
      permissoes: z.array(z.string().uuid()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      const [existing] = await db.select().from(schema.papel).where(eq(schema.papel.codigo, input.codigo));
      if (existing) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Este código já está em uso' });

      const [papel] = await db.insert(schema.papel).values({
        codigo: input.codigo,
        nome: input.nome,
        descricao: input.descricao,
        nivel: input.nivel,
      }).returning();

      if (input.permissoes?.length) {
        await db.insert(schema.papelPermissao).values(
          input.permissoes.map(permissaoId => ({ papelId: papel.id, permissaoId }))
        );
      }

      const visitorId = await getVisitorId(ctx.user?.email || null);
      await db.insert(schema.eventoAuditoria).values({
        usuarioId: visitorId,
        entidadeTipo: 'papel',
        entidadeId: papel.id,
        acao: 'criar',
        dadosNovos: input,
        ipOrigem: ctx.ipAddress || null,
        userAgent: ctx.userAgent || null,
      });

      return papel;
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      nome: z.string().min(3).max(100).optional(),
      descricao: z.string().nullable().optional(),
      nivel: z.number().min(1).max(100).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { id, ...updateData } = input;

      const [papel] = await db.select().from(schema.papel).where(eq(schema.papel.id, id));
      if (!papel) throw new TRPCError({ code: 'NOT_FOUND', message: 'Papel não encontrado' });

      const filteredData: any = {};
      if (updateData.nome !== undefined) filteredData.nome = updateData.nome;
      if (updateData.descricao !== undefined) filteredData.descricao = updateData.descricao;
      if (updateData.nivel !== undefined) filteredData.nivel = updateData.nivel;

      await db.update(schema.papel).set(filteredData).where(eq(schema.papel.id, id));

      const visitorId = await getVisitorId(ctx.user?.email || null);
      await db.insert(schema.eventoAuditoria).values({
        usuarioId: visitorId,
        entidadeTipo: 'papel',
        entidadeId: id,
        acao: 'atualizar',
        dadosAnteriores: papel,
        dadosNovos: filteredData,
        ipOrigem: ctx.ipAddress || null,
        userAgent: ctx.userAgent || null,
      });

      return { success: true };
    }),

  delete: adminProcedure
    .input(z.string().uuid())
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      const [papel] = await db.select().from(schema.papel).where(eq(schema.papel.id, input));
      if (!papel) throw new TRPCError({ code: 'NOT_FOUND', message: 'Papel não encontrado' });
      if (PAPEIS_PROTEGIDOS.includes(papel.codigo)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Este papel é protegido pelo sistema' });
      }

      // Verificar se há usuários vinculados
      const usuarios = await db.select().from(schema.usuarioPapel)
        .where(and(eq(schema.usuarioPapel.papelId, input), or(isNull(schema.usuarioPapel.dataFim), sql`data_fim > CURRENT_DATE`)));
      if (usuarios.length > 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Existem ${usuarios.length} usuário(s) com este papel ativo` });
      }

      await db.delete(schema.papelPermissao).where(eq(schema.papelPermissao.papelId, input));
      await db.delete(schema.papel).where(eq(schema.papel.id, input));

      const visitorId = await getVisitorId(ctx.user?.email || null);
      await db.insert(schema.eventoAuditoria).values({
        usuarioId: visitorId,
        entidadeTipo: 'papel',
        entidadeId: input,
        acao: 'excluir',
        dadosAnteriores: papel,
        ipOrigem: ctx.ipAddress || null,
        userAgent: ctx.userAgent || null,
      });

      return { success: true };
    }),

  duplicar: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      novoCodigo: z.string().min(3).max(50).regex(/^[a-z_]+$/, 'Use apenas letras minúsculas e underscore'),
      novoNome: z.string().min(3).max(100),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      const [original] = await db.select().from(schema.papel).where(eq(schema.papel.id, input.id));
      if (!original) throw new TRPCError({ code: 'NOT_FOUND', message: 'Papel original não encontrado' });

      const [existing] = await db.select().from(schema.papel).where(eq(schema.papel.codigo, input.novoCodigo));
      if (existing) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Este código já está em uso' });

      const [novo] = await db.insert(schema.papel).values({
        codigo: input.novoCodigo,
        nome: input.novoNome,
        descricao: original.descricao,
        nivel: original.nivel,
      }).returning();

      // Copiar permissões
      const permissoes = await db.select().from(schema.papelPermissao).where(eq(schema.papelPermissao.papelId, input.id));
      if (permissoes.length > 0) {
        await db.insert(schema.papelPermissao).values(
          permissoes.map(p => ({ papelId: novo.id, permissaoId: p.permissaoId }))
        );
      }

      const visitorId = await getVisitorId(ctx.user?.email || null);
      await db.insert(schema.eventoAuditoria).values({
        usuarioId: visitorId,
        entidadeTipo: 'papel',
        entidadeId: novo.id,
        acao: 'criar',
        dadosNovos: { ...novo, copiadoDe: input.id },
        ipOrigem: ctx.ipAddress || null,
        userAgent: ctx.userAgent || null,
      });

      return novo;
    }),
});

// Permissões Router
const permissoesRouter = router({
  list: protectedProcedure
    .input(z.object({ modulo: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      let query = db.select().from(schema.permissao);
      if (input?.modulo) {
        query = query.where(eq(schema.permissao.modulo, input.modulo)) as any;
      }
      return query.orderBy(asc(schema.permissao.modulo), asc(schema.permissao.codigo));
    }),

  modulos: protectedProcedure.query(async () => {
    const db = await getDb();
    const results = await db.execute(sql`SELECT DISTINCT modulo FROM permissao ORDER BY modulo`);
    return results.rows.map((r: any) => r.modulo);
  }),

  matriz: protectedProcedure.query(async () => {
    const db = await getDb();
    const papeis = await db.select().from(schema.papel).orderBy(desc(schema.papel.nivel));
    const permissoes = await db.select().from(schema.permissao).orderBy(asc(schema.permissao.modulo), asc(schema.permissao.codigo));
    const vinculos = await db.select().from(schema.papelPermissao);

    const matriz: Record<string, Record<string, boolean>> = {};
    papeis.forEach(p => {
      matriz[p.id] = {};
      permissoes.forEach(perm => { matriz[p.id][perm.id] = false; });
    });
    vinculos.forEach(v => {
      if (matriz[v.papelId]) matriz[v.papelId][v.permissaoId] = true;
    });

    return { papeis, permissoes, matriz };
  }),

  updatePapelPermissoes: adminProcedure
    .input(z.object({
      papelId: z.string().uuid(),
      permissoes: z.array(z.string().uuid()),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      const anteriores = await db.select().from(schema.papelPermissao).where(eq(schema.papelPermissao.papelId, input.papelId));
      
      await db.delete(schema.papelPermissao).where(eq(schema.papelPermissao.papelId, input.papelId));
      if (input.permissoes.length > 0) {
        await db.insert(schema.papelPermissao).values(
          input.permissoes.map(permissaoId => ({ papelId: input.papelId, permissaoId }))
        );
      }

      const visitorId = await getVisitorId(ctx.user?.email || null);
      await db.insert(schema.eventoAuditoria).values({
        usuarioId: visitorId,
        entidadeTipo: 'papel_permissao',
        entidadeId: input.papelId,
        acao: 'atualizar',
        dadosAnteriores: { permissoes: anteriores.map(a => a.permissaoId) },
        dadosNovos: { permissoes: input.permissoes },
        ipOrigem: ctx.ipAddress || null,
        userAgent: ctx.userAgent || null,
      });

      return { success: true };
    }),
});

// Aprovações Router
const aprovacoesRouter = router({
  listPendentes: protectedProcedure
    .input(z.object({
      entidadeTipo: z.enum(['titulo', 'lancamento', 'fundo_consumo']).optional(),
      page: z.number().default(1),
      limit: z.number().min(1).max(100).default(20),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const page = input?.page || 1;
      const limit = input?.limit || 20;
      const offset = (page - 1) * limit;

      // Buscar nível do usuário atual
      const nivelResult = await db.execute(sql`
        SELECT MAX(p.nivel) as nivel FROM usuario_papel up
        INNER JOIN papel p ON up.papel_id = p.id
        WHERE up.usuario_id = ${ctx.user?.id}
        AND (up.data_fim IS NULL OR up.data_fim > CURRENT_DATE)
      `);
      const nivelUsuario = Number(nivelResult.rows[0]?.nivel || 0);

      const conditions = [
        sql`a.status = 'pendente'`,
        sql`a.nivel_aprovacao <= ${nivelUsuario}`,
      ];
      if (input?.entidadeTipo) conditions.push(sql`a.entidade_tipo = ${input.entidadeTipo}`);

      const results = await db.execute(sql`
        SELECT 
          a.*,
          u.nome as criador_nome,
          CASE 
            WHEN a.entidade_tipo = 'titulo' THEN (SELECT descricao FROM titulo WHERE id = a.entidade_id)
            WHEN a.entidade_tipo = 'lancamento' THEN (SELECT historico FROM lancamento_contabil WHERE id = a.entidade_id)
            WHEN a.entidade_tipo = 'fundo_consumo' THEN (SELECT justificativa FROM fundo_consumo WHERE id = a.entidade_id)
          END as entidade_descricao,
          CASE 
            WHEN a.entidade_tipo = 'titulo' THEN (SELECT valor_liquido::text FROM titulo WHERE id = a.entidade_id)
            WHEN a.entidade_tipo = 'lancamento' THEN (SELECT total_debito::text FROM lancamento_contabil WHERE id = a.entidade_id)
            WHEN a.entidade_tipo = 'fundo_consumo' THEN (SELECT valor::text FROM fundo_consumo WHERE id = a.entidade_id)
          END as entidade_valor
        FROM aprovacao a
        LEFT JOIN usuario u ON a.created_by = u.id
        WHERE ${sql.join(conditions, sql` AND `)}
        ORDER BY a.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);

      return results.rows;
    }),

  getById: protectedProcedure
    .input(z.string().uuid())
    .query(async ({ input }) => {
      const db = await getDb();
      const [aprovacao] = await db.select().from(schema.aprovacao).where(eq(schema.aprovacao.id, input));
      if (!aprovacao) throw new TRPCError({ code: 'NOT_FOUND', message: 'Aprovação não encontrada' });
      return aprovacao;
    }),

  decidir: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      decisao: z.enum(['aprovado', 'rejeitado']),
      observacao: z.string().max(1000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      const [aprovacao] = await db.select().from(schema.aprovacao).where(eq(schema.aprovacao.id, input.id));
      if (!aprovacao) throw new TRPCError({ code: 'NOT_FOUND', message: 'Aprovação não encontrada' });
      if (aprovacao.status !== 'pendente') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta aprovação já foi decidida' });

      // Verificar anti-autoaprovação
      if (aprovacao.createdBy === ctx.user?.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Não é permitido aprovar suas próprias operações' });
      }

      // Verificar alçada
      const nivelResult = await db.execute(sql`
        SELECT MAX(p.nivel) as nivel FROM usuario_papel up
        INNER JOIN papel p ON up.papel_id = p.id
        WHERE up.usuario_id = ${ctx.user?.id}
        AND (up.data_fim IS NULL OR up.data_fim > CURRENT_DATE)
      `);
      const nivelUsuario = Number(nivelResult.rows[0]?.nivel || 0);
      if (nivelUsuario < aprovacao.nivelAprovacao) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Você não tem alçada para esta aprovação (nível mínimo: ${aprovacao.nivelAprovacao})` });
      }

      await db.update(schema.aprovacao).set({
        status: input.decisao,
        aprovadorId: ctx.user?.id,
        dataDecisao: new Date(),
        observacao: input.observacao,
        updatedAt: new Date(),
        updatedBy: ctx.user?.id,
      }).where(eq(schema.aprovacao.id, input.id));

      // Atualizar status da entidade
      if (aprovacao.entidadeTipo === 'titulo') {
        await db.update(schema.titulo).set({
          status: input.decisao === 'aprovado' ? 'aprovado' : 'rascunho',
          aprovadoPor: input.decisao === 'aprovado' ? ctx.user?.id : null,
          aprovadoEm: input.decisao === 'aprovado' ? new Date() : null,
        }).where(eq(schema.titulo.id, aprovacao.entidadeId));
      }

      const visitorId = await getVisitorId(ctx.user?.email || null);
      await db.insert(schema.eventoAuditoria).values({
        usuarioId: visitorId,
        entidadeTipo: 'aprovacao',
        entidadeId: input.id,
        acao: input.decisao === 'aprovado' ? 'aprovar' : 'rejeitar',
        dadosAnteriores: { status: 'pendente' },
        dadosNovos: { status: input.decisao, observacao: input.observacao },
        ipOrigem: ctx.ipAddress || null,
        userAgent: ctx.userAgent || null,
      });

      return { success: true };
    }),

  getHistorico: protectedProcedure
    .input(z.object({
      entidadeTipo: z.enum(['titulo', 'lancamento', 'fundo_consumo']).optional(),
      page: z.number().default(1),
      limit: z.number().min(1).max(100).default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const page = input?.page || 1;
      const limit = input?.limit || 50;
      const offset = (page - 1) * limit;

      const conditions = [sql`a.status != 'pendente'`];
      if (input?.entidadeTipo) conditions.push(sql`a.entidade_tipo = ${input.entidadeTipo}`);

      const results = await db.execute(sql`
        SELECT a.*, u.nome as aprovador_nome
        FROM aprovacao a
        LEFT JOIN usuario u ON a.aprovador_id = u.id
        WHERE ${sql.join(conditions, sql` AND `)}
        ORDER BY a.data_decisao DESC
        LIMIT ${limit} OFFSET ${offset}
      `);

      return results.rows;
    }),
});

// Configuração do Sistema Router
const configSistemaRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    const configs = await db.select().from(schema.configuracaoSistema).orderBy(asc(schema.configuracaoSistema.chave));
    
    // Agrupar por categoria
    const grouped: Record<string, any[]> = {
      organizacao: [],
      financeiro: [],
      contabilidade: [],
      notificacoes: [],
      outros: [],
    };
    
    configs.forEach(c => {
      const categoria = c.chave.split('.')[0] || 'outros';
      if (grouped[categoria]) grouped[categoria].push(c);
      else grouped.outros.push(c);
    });

    return grouped;
  }),

  getByChave: protectedProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const db = await getDb();
      const [config] = await db.select().from(schema.configuracaoSistema).where(eq(schema.configuracaoSistema.chave, input));
      return config || null;
    }),

  update: adminProcedure
    .input(z.object({
      chave: z.string().min(1).max(100),
      valor: z.any(),
      descricao: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      const [existing] = await db.select().from(schema.configuracaoSistema).where(eq(schema.configuracaoSistema.chave, input.chave));
      
      const visitorId = await getVisitorId(ctx.user?.email || null);

      if (existing) {
        await db.update(schema.configuracaoSistema).set({
          valor: input.valor,
          descricao: input.descricao || existing.descricao,
          updatedAt: new Date(),
          updatedBy: visitorId,
        }).where(eq(schema.configuracaoSistema.chave, input.chave));

        await db.insert(schema.eventoAuditoria).values({
          usuarioId: visitorId,
          entidadeTipo: 'configuracao_sistema',
          entidadeId: existing.id,
          acao: 'atualizar',
          dadosAnteriores: { valor: existing.valor },
          dadosNovos: { valor: input.valor },
          ipOrigem: ctx.ipAddress || null,
          userAgent: ctx.userAgent || null,
        });
      } else {
        const [novo] = await db.insert(schema.configuracaoSistema).values({
          chave: input.chave,
          valor: input.valor,
          descricao: input.descricao,
          createdBy: visitorId,
          updatedBy: visitorId,
        }).returning();

        await db.insert(schema.eventoAuditoria).values({
          usuarioId: visitorId,
          entidadeTipo: 'configuracao_sistema',
          entidadeId: novo.id,
          acao: 'criar',
          dadosNovos: input,
          ipOrigem: ctx.ipAddress || null,
          userAgent: ctx.userAgent || null,
        });
      }

      return { success: true };
    }),
});

// Auditoria Router (aprimorado)
const auditoriaRouter = router({
  list: protectedProcedure
    .input(z.object({
      entidadeTipo: z.string().optional(),
      entidadeId: z.string().uuid().optional(),
      usuarioId: z.string().uuid().optional(),
      acao: z.enum(['criar', 'atualizar', 'excluir', 'visualizar', 'exportar', 'fechar', 'reabrir', 'aprovar', 'rejeitar']).optional(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().min(1).max(100).default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const page = input?.page || 1;
      const limit = input?.limit || 50;
      const offset = (page - 1) * limit;

      const conditions = [];
      if (input?.entidadeTipo) conditions.push(sql`ea.entidade_tipo = ${input.entidadeTipo}`);
      if (input?.entidadeId) conditions.push(sql`ea.entidade_id = ${input.entidadeId}`);
      if (input?.usuarioId) conditions.push(sql`ea.usuario_id = ${input.usuarioId}`);
      if (input?.acao) conditions.push(sql`ea.acao = ${input.acao}`);
      if (input?.dataInicio) conditions.push(sql`ea.created_at >= ${input.dataInicio}::timestamp`);
      if (input?.dataFim) conditions.push(sql`ea.created_at <= ${input.dataFim}::timestamp + interval '1 day'`);

      const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

      const results = await db.execute(sql`
        SELECT ea.*, u.nome as usuario_nome, u.email as usuario_email
        FROM evento_auditoria ea
        LEFT JOIN usuario u ON ea.usuario_id = u.id
        ${whereClause}
        ORDER BY ea.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `);

      const countResult = await db.execute(sql`
        SELECT COUNT(*) as total FROM evento_auditoria ea ${whereClause}
      `);

      const total = Number(countResult.rows[0]?.total || 0);
      return {
        eventos: results.rows,
        total,
        pages: Math.ceil(total / limit),
      };
    }),

  getById: protectedProcedure
    .input(z.string().uuid())
    .query(async ({ input }) => {
      const db = await getDb();
      const results = await db.execute(sql`
        SELECT ea.*, u.nome as usuario_nome, u.email as usuario_email
        FROM evento_auditoria ea
        LEFT JOIN usuario u ON ea.usuario_id = u.id
        WHERE ea.id = ${input}
      `);
      if (results.rows.length === 0) throw new TRPCError({ code: 'NOT_FOUND', message: 'Evento não encontrado' });
      return results.rows[0];
    }),

  stats: protectedProcedure
    .input(z.object({
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      
      const conditions = [];
      if (input?.dataInicio) conditions.push(sql`created_at >= ${input.dataInicio}::timestamp`);
      if (input?.dataFim) conditions.push(sql`created_at <= ${input.dataFim}::timestamp + interval '1 day'`);
      const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

      const porAcao = await db.execute(sql`
        SELECT acao, COUNT(*) as total FROM evento_auditoria ${whereClause} GROUP BY acao ORDER BY total DESC
      `);

      const porEntidade = await db.execute(sql`
        SELECT entidade_tipo, COUNT(*) as total FROM evento_auditoria ${whereClause} GROUP BY entidade_tipo ORDER BY total DESC
      `);

      const porUsuario = await db.execute(sql`
        SELECT u.nome, COUNT(*) as total 
        FROM evento_auditoria ea
        LEFT JOIN usuario u ON ea.usuario_id = u.id
        ${whereClause}
        GROUP BY u.id, u.nome ORDER BY total DESC LIMIT 10
      `);

      return {
        porAcao: porAcao.rows,
        porEntidade: porEntidade.rows,
        porUsuario: porUsuario.rows,
      };
    }),

  entidadeTipos: protectedProcedure.query(async () => {
    const db = await getDb();
    const results = await db.execute(sql`SELECT DISTINCT entidade_tipo FROM evento_auditoria ORDER BY entidade_tipo`);
    return results.rows.map((r: any) => r.entidade_tipo);
  }),

  usuariosComEventos: protectedProcedure.query(async () => {
    const db = await getDb();
    const results = await db.execute(sql`
      SELECT DISTINCT u.id, u.nome, u.email
      FROM evento_auditoria ea
      INNER JOIN usuario u ON ea.usuario_id = u.id
      ORDER BY u.nome
    `);
    return results.rows;
  }),

  // Endpoint de exportação CSV/JSON
  exportar: protectedProcedure
    .input(z.object({
      formato: z.enum(['csv', 'json']).default('csv'),
      entidadeTipo: z.string().optional(),
      entidadeId: z.string().uuid().optional(),
      usuarioId: z.string().uuid().optional(),
      acao: z.enum(['criar', 'atualizar', 'excluir', 'visualizar', 'exportar', 'fechar', 'reabrir', 'aprovar', 'rejeitar']).optional(),
      dataInicio: z.string(),
      dataFim: z.string(),
      limit: z.number().min(1).max(10000).default(1000),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      const conditions = [
        sql`ea.created_at >= ${input.dataInicio}::timestamp`,
        sql`ea.created_at <= ${input.dataFim}::timestamp + interval '1 day'`,
      ];
      if (input.entidadeTipo) conditions.push(sql`ea.entidade_tipo = ${input.entidadeTipo}`);
      if (input.entidadeId) conditions.push(sql`ea.entidade_id = ${input.entidadeId}`);
      if (input.usuarioId) conditions.push(sql`ea.usuario_id = ${input.usuarioId}`);
      if (input.acao) conditions.push(sql`ea.acao = ${input.acao}`);

      const results = await db.execute(sql`
        SELECT 
          ea.id,
          ea.created_at as data_hora,
          ea.entidade_tipo,
          ea.entidade_id,
          ea.acao,
          u.nome as usuario_nome,
          u.email as usuario_email,
          ea.ip_origem,
          ea.user_agent,
          ea.dados_anteriores,
          ea.dados_novos
        FROM evento_auditoria ea
        LEFT JOIN usuario u ON ea.usuario_id = u.id
        WHERE ${sql.join(conditions, sql` AND `)}
        ORDER BY ea.created_at DESC
        LIMIT ${input.limit}
      `);

      // Registrar evento de exportação
      const visitorId = await getVisitorId(ctx.user?.email || null);
      await db.insert(schema.eventoAuditoria).values({
        usuarioId: visitorId,
        entidadeTipo: 'auditoria_export',
        entidadeId: 'export',
        acao: 'exportar',
        dadosNovos: { 
          formato: input.formato,
          filtros: { 
            dataInicio: input.dataInicio, 
            dataFim: input.dataFim,
            entidadeTipo: input.entidadeTipo,
            acao: input.acao,
          },
          registros: results.rows.length,
        },
        ipOrigem: ctx.ipAddress || null,
        userAgent: ctx.userAgent || null,
      });

      if (input.formato === 'json') {
        return { dados: results.rows, formato: 'json' as const };
      }

      // Gerar CSV
      const headers = ['id', 'data_hora', 'entidade_tipo', 'entidade_id', 'acao', 'usuario_nome', 'usuario_email', 'ip_origem', 'user_agent', 'dados_anteriores', 'dados_novos'];
      const csvRows = [headers.join(';')];
      
      for (const row of results.rows as any[]) {
        const values = headers.map(h => {
          let val = row[h];
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') val = JSON.stringify(val);
          // Escape CSV special chars
          val = String(val).replace(/"/g, '""');
          if (val.includes(';') || val.includes('\n') || val.includes('"')) {
            val = `"${val}"`;
          }
          return val;
        });
        csvRows.push(values.join(';'));
      }

      return { dados: csvRows.join('\n'), formato: 'csv' as const };
    }),
});

// ==================== MÓDULO F: PATRIMÔNIO ROUTER ====================
const patrimonioRouter = router({
  list: publicProcedure
    .input(z.object({
      categoria: z.array(z.enum(['imovel', 'veiculo', 'equipamento', 'mobiliario', 'informatica', 'outro'])).optional(),
      status: z.array(z.enum(['em_uso', 'em_manutencao', 'baixado', 'alienado', 'perdido'])).optional(),
      busca: z.string().optional(),
      projetoId: z.string().uuid().optional(),
      fundoId: z.string().uuid().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions = [];
      
      if (input?.categoria && input.categoria.length > 0) {
        conditions.push(or(...input.categoria.map(c => eq(schema.bemPatrimonial.categoria, c))));
      }
      if (input?.status && input.status.length > 0) {
        conditions.push(or(...input.status.map(s => eq(schema.bemPatrimonial.status, s))));
      }
      if (input?.projetoId) {
        conditions.push(eq(schema.bemPatrimonial.projetoId, input.projetoId));
      }
      if (input?.fundoId) {
        conditions.push(eq(schema.bemPatrimonial.fundoId, input.fundoId));
      }
      if (input?.busca) {
        conditions.push(or(
          like(schema.bemPatrimonial.codigo, `%${input.busca}%`),
          like(schema.bemPatrimonial.descricao, `%${input.busca}%`),
          like(schema.bemPatrimonial.numeroNotaFiscal, `%${input.busca}%`)
        ));
      }

      const bens = await db.select().from(schema.bemPatrimonial)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(schema.bemPatrimonial.codigo));

      // Calcular depreciação acumulada e valor contábil
      const result = await Promise.all(bens.map(async (bem) => {
        const depreciacoes = await db.select().from(schema.bemDepreciacao)
          .where(eq(schema.bemDepreciacao.bemId, bem.id))
          .orderBy(desc(schema.bemDepreciacao.depreciacaoAcumulada))
          .limit(1);
        
        const depreciacaoAcumulada = depreciacoes.length > 0 
          ? parseFloat(depreciacoes[0].depreciacaoAcumulada) 
          : 0;
        const valorContabil = parseFloat(bem.valorAquisicao) - depreciacaoAcumulada;
        
        return { ...bem, depreciacaoAcumulada, valorContabil };
      }));

      return result;
    }),

  byId: publicProcedure
    .input(z.string().uuid())
    .query(async ({ input }) => {
      const db = await getDb();
      const [bem] = await db.select().from(schema.bemPatrimonial).where(eq(schema.bemPatrimonial.id, input));
      if (!bem) throw new TRPCError({ code: 'NOT_FOUND', message: 'Bem não encontrado' });
      
      const depreciacoes = await db.select().from(schema.bemDepreciacao)
        .where(eq(schema.bemDepreciacao.bemId, input))
        .orderBy(desc(schema.bemDepreciacao.depreciacaoAcumulada));
      
      const transferencias = await db.select().from(schema.bemTransferencia)
        .where(eq(schema.bemTransferencia.bemId, input))
        .orderBy(desc(schema.bemTransferencia.dataTransferencia));

      const depreciacaoAcumulada = depreciacoes.length > 0 
        ? parseFloat(depreciacoes[0].depreciacaoAcumulada) 
        : 0;
      const valorContabil = parseFloat(bem.valorAquisicao) - depreciacaoAcumulada;
      
      return { ...bem, depreciacaoAcumulada, valorContabil, depreciacoes, transferencias };
    }),

  codigoExiste: publicProcedure
    .input(z.string())
    .query(async ({ input }) => {
      const db = await getDb();
      const [existing] = await db.select({ id: schema.bemPatrimonial.id })
        .from(schema.bemPatrimonial)
        .where(eq(schema.bemPatrimonial.codigo, input));
      return !!existing;
    }),

  create: protectedProcedure
    .input(z.object({
      codigo: z.string().min(1).max(30),
      descricao: z.string().min(3).max(500),
      categoria: z.enum(['imovel', 'veiculo', 'equipamento', 'mobiliario', 'informatica', 'outro']),
      dataAquisicao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      valorAquisicao: z.number().positive(),
      valorResidual: z.number().min(0).default(0),
      vidaUtilMeses: z.number().min(1).max(600),
      metodoDepreciacao: z.enum(['linear', 'nenhum']).default('linear'),
      contaAtivoId: z.string().uuid(),
      contaDepreciacaoId: z.string().uuid().optional(),
      contaDepreciacaoAcumId: z.string().uuid().optional(),
      fornecedorId: z.string().uuid().optional(),
      numeroNotaFiscal: z.string().max(50).optional(),
      localizacao: z.string().max(200).optional(),
      responsavelId: z.string().uuid().optional(),
      projetoId: z.string().uuid().optional(),
      fundoId: z.string().uuid().optional(),
    }).refine(data => data.valorResidual < data.valorAquisicao, {
      message: 'Valor residual deve ser menor que valor de aquisição',
    }).refine(data => {
      if (data.metodoDepreciacao === 'linear') {
        return !!data.contaDepreciacaoId && !!data.contaDepreciacaoAcumId;
      }
      return true;
    }, { message: 'Depreciação linear requer contas contábeis configuradas' }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      const [existing] = await db.select().from(schema.bemPatrimonial)
        .where(eq(schema.bemPatrimonial.codigo, input.codigo));
      if (existing) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Código já está em uso' });
      
      const [result] = await db.insert(schema.bemPatrimonial).values({
        ...input,
        status: 'em_uso',
        createdBy: ctx.user?.id,
      }).returning();
      
      return result;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      descricao: z.string().min(3).max(500).optional(),
      localizacao: z.string().max(200).nullable().optional(),
      responsavelId: z.string().uuid().nullable().optional(),
      categoria: z.enum(['imovel', 'veiculo', 'equipamento', 'mobiliario', 'informatica', 'outro']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { id, ...data } = input;
      
      const [bem] = await db.select().from(schema.bemPatrimonial).where(eq(schema.bemPatrimonial.id, id));
      if (!bem) throw new TRPCError({ code: 'NOT_FOUND', message: 'Bem não encontrado' });
      
      await db.update(schema.bemPatrimonial)
        .set({ ...data, updatedBy: ctx.user?.id, updatedAt: new Date() })
        .where(eq(schema.bemPatrimonial.id, id));
      
      return { success: true };
    }),

  transferir: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      novaLocalizacao: z.string().max(200).optional(),
      novoResponsavelId: z.string().uuid().optional(),
      motivo: z.string().min(10).max(500),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { id, novaLocalizacao, novoResponsavelId, motivo } = input;
      
      const [bem] = await db.select().from(schema.bemPatrimonial).where(eq(schema.bemPatrimonial.id, id));
      if (!bem) throw new TRPCError({ code: 'NOT_FOUND', message: 'Bem não encontrado' });
      
      if (['baixado', 'alienado', 'perdido'].includes(bem.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Não é possível transferir bem baixado' });
      }
      
      await db.insert(schema.bemTransferencia).values({
        bemId: id,
        localizacaoAnterior: bem.localizacao,
        localizacaoNova: novaLocalizacao || bem.localizacao,
        responsavelAnteriorId: bem.responsavelId,
        responsavelNovoId: novoResponsavelId || bem.responsavelId,
        motivo,
        createdBy: ctx.user?.id,
      });
      
      const updateData: any = { updatedBy: ctx.user?.id, updatedAt: new Date() };
      if (novaLocalizacao) updateData.localizacao = novaLocalizacao;
      if (novoResponsavelId) updateData.responsavelId = novoResponsavelId;
      
      await db.update(schema.bemPatrimonial).set(updateData).where(eq(schema.bemPatrimonial.id, id));
      
      return { success: true };
    }),

  baixar: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      dataBaixa: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      status: z.enum(['baixado', 'alienado', 'perdido']),
      motivoBaixa: z.string().min(10).max(1000),
      valorBaixa: z.number().min(0).optional(),
    }).refine(data => {
      if (data.status === 'alienado') return data.valorBaixa !== undefined && data.valorBaixa > 0;
      return true;
    }, { message: 'Informe o valor recebido na venda' }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { id, dataBaixa, status, motivoBaixa, valorBaixa } = input;
      
      const [bem] = await db.select().from(schema.bemPatrimonial).where(eq(schema.bemPatrimonial.id, id));
      if (!bem) throw new TRPCError({ code: 'NOT_FOUND', message: 'Bem não encontrado' });
      
      if (['baixado', 'alienado', 'perdido'].includes(bem.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Bem já está baixado' });
      }
      
      await db.update(schema.bemPatrimonial).set({
        status,
        dataBaixa,
        motivoBaixa,
        valorBaixa: valorBaixa?.toString(),
        updatedBy: ctx.user?.id,
        updatedAt: new Date(),
      }).where(eq(schema.bemPatrimonial.id, id));
      
      return { success: true };
    }),

  calcularDepreciacao: protectedProcedure
    .input(z.object({
      periodoId: z.string().uuid(),
      simular: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { periodoId, simular } = input;
      
      const [periodo] = await db.select().from(schema.periodoContabil)
        .where(eq(schema.periodoContabil.id, periodoId));
      if (!periodo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Período não encontrado' });
      if (periodo.status === 'fechado') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Período já está fechado' });
      }
      
      const bensAtivos = await db.select().from(schema.bemPatrimonial)
        .where(and(
          eq(schema.bemPatrimonial.status, 'em_uso'),
          eq(schema.bemPatrimonial.metodoDepreciacao, 'linear')
        ));
      
      const roundMoney = (v: number) => Math.round(v * 100) / 100;
      const results: Array<{bemId: string; codigo: string; valorDepreciacao: number; novoAcumulado: number; novoContabil: number}> = [];
      
      for (const bem of bensAtivos) {
        const [existente] = await db.select().from(schema.bemDepreciacao)
          .where(and(
            eq(schema.bemDepreciacao.bemId, bem.id),
            eq(schema.bemDepreciacao.periodoId, periodoId)
          ));
        if (existente) continue;
        
        const dataAquisicao = new Date(bem.dataAquisicao);
        const dataInicioPeriodo = new Date(periodo.dataInicio);
        if (dataAquisicao >= dataInicioPeriodo) continue;
        
        const valorAquisicao = parseFloat(bem.valorAquisicao);
        const valorResidual = parseFloat(bem.valorResidual);
        const depreciacaoMensal = roundMoney((valorAquisicao - valorResidual) / bem.vidaUtilMeses);
        
        const [ultimaDeprec] = await db.select().from(schema.bemDepreciacao)
          .where(eq(schema.bemDepreciacao.bemId, bem.id))
          .orderBy(desc(schema.bemDepreciacao.depreciacaoAcumulada))
          .limit(1);
        
        const acumuladoAnterior = ultimaDeprec ? parseFloat(ultimaDeprec.depreciacaoAcumulada) : 0;
        const novoAcumulado = roundMoney(Math.min(acumuladoAnterior + depreciacaoMensal, valorAquisicao - valorResidual));
        const valorDepreciacao = roundMoney(novoAcumulado - acumuladoAnterior);
        
        if (valorDepreciacao <= 0) continue;
        
        const novoContabil = roundMoney(valorAquisicao - novoAcumulado);
        
        results.push({
          bemId: bem.id,
          codigo: bem.codigo,
          valorDepreciacao,
          novoAcumulado,
          novoContabil,
        });
        
        if (!simular) {
          await db.insert(schema.bemDepreciacao).values({
            bemId: bem.id,
            periodoId,
            valorDepreciacao: valorDepreciacao.toString(),
            depreciacaoAcumulada: novoAcumulado.toString(),
            valorContabil: novoContabil.toString(),
          });
        }
      }
      
      const totalDepreciacao = roundMoney(results.reduce((sum, r) => sum + r.valorDepreciacao, 0));
      
      return {
        simular,
        bensProcessados: results.length,
        totalDepreciacao,
        detalhes: results,
      };
    }),

  stats: publicProcedure.query(async () => {
    const db = await getDb();
    
    const bens = await db.select().from(schema.bemPatrimonial);
    
    const bensAtivos = bens.filter(b => b.status === 'em_uso');
    const valorAquisicao = bens.reduce((sum, b) => sum + parseFloat(b.valorAquisicao), 0);
    
    const deprecAcumulada = await Promise.all(bens.map(async (bem) => {
      const [dep] = await db.select().from(schema.bemDepreciacao)
        .where(eq(schema.bemDepreciacao.bemId, bem.id))
        .orderBy(desc(schema.bemDepreciacao.depreciacaoAcumulada))
        .limit(1);
      return dep ? parseFloat(dep.depreciacaoAcumulada) : 0;
    }));
    
    const totalDeprecAcum = deprecAcumulada.reduce((sum, d) => sum + d, 0);
    const valorContabil = valorAquisicao - totalDeprecAcum;
    
    return {
      total: bens.length,
      ativos: bensAtivos.length,
      valorAquisicao: Math.round(valorAquisicao * 100) / 100,
      depreciacaoAcumulada: Math.round(totalDeprecAcum * 100) / 100,
      valorContabil: Math.round(valorContabil * 100) / 100,
    };
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
  pessoaPapel: pessoaPapelRouter,
  titulos: titulosRouter,
  contasFinanceiras: contasFinanceirasRouter,
  periodosContabeis: periodosContabeisRouter,
  lancamentosContabeis: lancamentosContabeisRouter,
  saldosContabeis: saldosContabeisRouter,
  extratos: extratosRouter,
  dashboard: dashboardRouter,
  conciliacao: conciliacaoRouter,
  gruposEstudo: gruposEstudoRouter,
  // Módulo E: Projetos, Centros de Custo e Fundos
  centroCusto: centroCustoRouter,
  projeto: projetoRouter,
  fundo: fundoRouter,
  fundoRegra: fundoRegraRouter,
  fundoAlocacao: fundoAlocacaoRouter,
  fundoConsumo: fundoConsumoRouter,
  // Módulo F: Patrimônio
  patrimonio: patrimonioRouter,
  // Módulo G: Governança e Auditoria
  usuarios: usuariosRouter,
  papeis: papeisRouter,
  permissoes: permissoesRouter,
  aprovacoes: aprovacoesRouter,
  configSistema: configSistemaRouter,
  auditoria: auditoriaRouter,
});

export type AppRouter = typeof appRouter;

