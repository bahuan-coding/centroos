import { awsLambdaRequestHandler } from '@trpc/server/adapters/aws-lambda';
import { appRouter } from '../../server/routers';
import type { Context } from '../../server/trpc';

export const handler = awsLambdaRequestHandler({
  router: appRouter,
  createContext: (): Context => ({
    user: { id: 1, openId: 'netlify-user', name: 'Usuário', email: 'user@centroos.local', role: 'admin' },
  }),
});
