import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { getDb, schema } from './db';
import { eq, and, isNull, sql } from 'drizzle-orm';

export interface Context {
  user: {
    id: number;
    visitorId?: string; // ID do novo sistema de usuarios (uuid)
    openId: string;
    name: string | null;
    email: string | null;
    role: 'admin' | 'accountant' | 'manager' | 'viewer';
  } | null;
  // Novos campos para auditoria
  ipAddress?: string;
  userAgent?: string;
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Você precisa estar autenticado' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// Legacy adminProcedure - mantido para compatibilidade
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito a administradores' });
  }
  return next({ ctx });
});

export const accountantProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!['admin', 'accountant'].includes(ctx.user.role)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito a contadores' });
  }
  return next({ ctx });
});

// ============================================================================
// NOVO SISTEMA RBAC - Baseado em papel_permissao
// ============================================================================

/**
 * Verifica se o usuário possui uma permissão específica via sistema papel_permissao.
 * Retorna true se possui a permissão, false caso contrário.
 */
export async function checkUserPermission(
  userEmail: string | null,
  permissionCode: string
): Promise<boolean> {
  if (!userEmail) return false;

  const db = await getDb();

  // Buscar usuário pelo email no novo sistema
  const [usuario] = await db
    .select({ id: schema.usuario.id })
    .from(schema.usuario)
    .where(and(eq(schema.usuario.email, userEmail), eq(schema.usuario.ativo, true)));

  if (!usuario) return false;

  // Verificar se algum dos papéis ativos do usuário possui a permissão
  const result = await db.execute(sql`
    SELECT 1 FROM usuario_papel up
    INNER JOIN papel_permissao pp ON up.papel_id = pp.papel_id
    INNER JOIN permissao p ON pp.permissao_id = p.id
    WHERE up.usuario_id = ${usuario.id}
      AND (up.data_fim IS NULL OR up.data_fim > CURRENT_DATE)
      AND p.codigo = ${permissionCode}
    LIMIT 1
  `);

  return result.rows.length > 0;
}

/**
 * Busca o nível máximo do usuário entre seus papéis ativos.
 * Usado para verificação de alçada em aprovações.
 */
export async function getUserMaxLevel(userEmail: string | null): Promise<number> {
  if (!userEmail) return 0;

  const db = await getDb();

  const [usuario] = await db
    .select({ id: schema.usuario.id })
    .from(schema.usuario)
    .where(and(eq(schema.usuario.email, userEmail), eq(schema.usuario.ativo, true)));

  if (!usuario) return 0;

  const result = await db.execute(sql`
    SELECT COALESCE(MAX(p.nivel), 0) as nivel
    FROM usuario_papel up
    INNER JOIN papel p ON up.papel_id = p.id
    WHERE up.usuario_id = ${usuario.id}
      AND (up.data_fim IS NULL OR up.data_fim > CURRENT_DATE)
  `);

  return Number(result.rows[0]?.nivel || 0);
}

/**
 * Busca o ID do usuário no novo sistema pelo email.
 */
export async function getVisitorId(userEmail: string | null): Promise<string | null> {
  if (!userEmail) return null;

  const db = await getDb();
  const [usuario] = await db
    .select({ id: schema.usuario.id })
    .from(schema.usuario)
    .where(eq(schema.usuario.email, userEmail));

  return usuario?.id || null;
}

/**
 * Factory para criar procedures que verificam permissões específicas.
 * Combina verificação do sistema legado (role) com novo sistema (papel_permissao).
 * 
 * @param permissionCode - Código da permissão no formato "modulo.entidade.acao"
 * @param fallbackToLegacyAdmin - Se true, permite acesso se role legado for 'admin'
 */
export function withPermission(permissionCode: string, fallbackToLegacyAdmin = true) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    // Fallback: admin legado sempre tem acesso (durante transição)
    if (fallbackToLegacyAdmin && ctx.user.role === 'admin') {
      return next({ ctx });
    }

    // Verificar permissão no novo sistema RBAC
    const hasPermission = await checkUserPermission(ctx.user.email, permissionCode);
    if (!hasPermission) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Você não tem permissão para esta ação (${permissionCode})`,
      });
    }

    return next({ ctx });
  });
}

/**
 * Procedure que verifica se usuário é admin no novo sistema (papel 'admin').
 * Mais seguro que adminProcedure legado.
 */
export const rbacAdminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  // Fallback legado
  if (ctx.user.role === 'admin') {
    return next({ ctx });
  }

  // Verificar se tem papel 'admin' no novo sistema
  const hasAdminRole = await checkUserPermission(ctx.user.email, 'sistema.usuario.gerenciar');
  if (!hasAdminRole) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito a administradores' });
  }

  return next({ ctx });
});

/**
 * Procedure para auditores - somente visualização.
 */
export const auditorProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  // Fallback: admin e accountant legados têm acesso
  if (['admin', 'accountant'].includes(ctx.user.role)) {
    return next({ ctx });
  }

  const hasPermission = await checkUserPermission(ctx.user.email, 'sistema.auditoria.visualizar');
  if (!hasPermission) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito a auditores' });
  }

  return next({ ctx });
});
