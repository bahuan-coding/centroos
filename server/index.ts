import express from 'express';
import cors from 'cors';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './routers';
import type { Context } from './trpc';

const app = express();

app.use(cors());
app.use(express.json());

const createContext = ({ req }: trpcExpress.CreateExpressContextOptions): Context => {
  // Mock user for development - replace with real auth
  return {
    user: {
      id: 1,
      openId: 'dev-user',
      name: 'Desenvolvedor',
      email: 'dev@centroos.local',
      role: 'admin',
    },
  };
};

app.use('/api/trpc', trpcExpress.createExpressMiddleware({ router: appRouter, createContext }));

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

