import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '../../server/routers';
import type { Context } from '../../server/trpc';

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Build a Request object from the Netlify event
  const url = new URL(event.rawUrl || `https://${event.headers.host}${event.path}`);
  
  const request = new Request(url.toString(), {
    method: event.httpMethod,
    headers: new Headers(event.headers as Record<string, string>),
    body: event.body ? event.body : undefined,
  });

  // Handle the request with tRPC fetch adapter
  const response = await fetchRequestHandler({
    endpoint: '/.netlify/functions/trpc',
    req: request,
    router: appRouter,
    createContext: (): Context => ({
      user: { id: 1, openId: 'netlify-user', name: 'Usuário', email: 'user@centroos.local', role: 'admin' },
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
