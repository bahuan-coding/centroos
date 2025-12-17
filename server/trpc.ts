import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';

export interface Context {
  user: {
    id: number;
    openId: string;
    name: string | null;
    email: string | null;
    role: 'admin' | 'accountant' | 'manager' | 'viewer';
  } | null;
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

