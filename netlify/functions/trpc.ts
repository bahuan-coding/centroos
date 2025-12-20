import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '../../server/routers';
import type { Context } from '../../server/trpc';

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Build the URL - handle both direct and redirected paths
  const host = event.headers.host || 'localhost';
  let path = event.path;
  
  // If coming from /api/trpc redirect, normalize the path
  if (path.startsWith('/api/trpc')) {
    path = '/.netlify/functions/trpc' + path.substring('/api/trpc'.length);
  }
  
  const url = new URL(path, `https://${host}`);
  if (event.queryStringParameters) {
    for (const [key, value] of Object.entries(event.queryStringParameters)) {
      if (value) url.searchParams.set(key, value);
    }
  }
  
  const request = new Request(url.toString(), {
    method: event.httpMethod,
    headers: new Headers(event.headers as Record<string, string>),
    body: event.body ? event.body : undefined,
  });

  // Capturar IP e User-Agent para auditoria
  const ipAddress = (event.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || event.headers['client-ip']
    || undefined;
  const userAgent = event.headers['user-agent'] || undefined;

  // Handle the request with tRPC fetch adapter
  const response = await fetchRequestHandler({
    endpoint: '/.netlify/functions/trpc',
    req: request,
    router: appRouter,
    createContext: (): Context => ({
      user: { id: 1, openId: 'netlify-user', name: 'Usuário', email: 'user@centroos.local', role: 'admin' },
      ipAddress,
      userAgent,
    }),
  });

  // Convert Response to Netlify format
  const body = await response.text();
  
  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body,
  };
};
