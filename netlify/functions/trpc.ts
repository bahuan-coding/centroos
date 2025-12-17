import type { Handler } from '@netlify/functions';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '../../server/routers';
import type { Context } from '../../server/trpc';

const createContext = (): Context => {
  return {
    user: {
      id: 1,
      openId: 'netlify-user',
      name: 'Usuário',
      email: 'user@centroos.local',
      role: 'admin',
    },
  };
};

export const handler: Handler = async (event) => {
  // Build URL for the request
  const url = new URL(event.rawUrl);
  
  // Build headers
  const headers = new Headers();
  for (const [key, value] of Object.entries(event.headers)) {
    if (value) headers.set(key, value);
  }

  // Build request
  const request = new Request(url, {
    method: event.httpMethod,
    headers,
    body: event.body && event.httpMethod !== 'GET' ? event.body : undefined,
  });

  try {
    const response = await fetchRequestHandler({
      endpoint: '/api/trpc',
      req: request,
      router: appRouter,
      createContext,
    });

    const body = await response.text();
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      statusCode: response.status,
      headers: responseHeaders,
      body,
    };
  } catch (error) {
    console.error('TRPC Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};
