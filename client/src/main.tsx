import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import { trpc } from './lib/trpc';
import { getOrgId } from './lib/org';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { 
    queries: { 
      staleTime: 5 * 60 * 1000, 
      refetchOnWindowFocus: false 
    } 
  },
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({ 
      url: '/api/trpc', 
      transformer: superjson,
      headers() {
        const orgId = getOrgId();
        return orgId ? { 'X-Organization-Id': orgId } : {};
      },
    })
  ],
});

/**
 * Invalidate all queries when organization changes
 * Call this from OrgSwitcher when user switches org
 */
export function invalidateAllQueries() {
  queryClient.invalidateQueries();
}

/**
 * Clear all cached data when organization changes
 * More aggressive than invalidate - removes all cached data
 */
export function clearQueryCache() {
  queryClient.clear();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </QueryClientProvider>
    </trpc.Provider>
  </React.StrictMode>
);
