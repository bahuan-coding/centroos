import express from 'express';
import cors from 'cors';
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from './routers';
import type { Context } from './trpc';

const app = express();

app.use(cors());
app.use(express.json());

const createContext = ({ req }: trpcExpress.CreateExpressContextOptions): Context => {
  // Capturar IP e User-Agent para auditoria
  const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
    || req.socket?.remoteAddress 
    || req.ip 
    || undefined;
  const userAgent = req.headers['user-agent'] || undefined;

  // Mock user for development - replace with real auth
  return {
    user: {
      id: 1,
      openId: 'dev-user',
      name: 'Desenvolvedor',
      email: 'dev@centroos.local',
      role: 'admin',
    },
    ipAddress,
    userAgent,
  };
};

app.use('/api/trpc', trpcExpress.createExpressMiddleware({ router: appRouter, createContext }));

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

