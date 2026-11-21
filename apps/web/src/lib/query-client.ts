import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../services/api';

/**
 * React Query client configuration
 * Provides caching, background updates, and error handling
 * Optimized for realtime updates with offline recovery
 */

let _queryClient: QueryClient | null = null;

export function getQueryClient(): QueryClient {
  if (!_queryClient) {
    _queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30 * 1000,
          gcTime: 5 * 60 * 1000,
          retry: (failureCount, error: any) => {
            // Halt retries immediately on client errors (4xx)
            if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
              return false;
            }
            if (error?.status >= 400 && error?.status < 500) {
              return false;
            }
            return failureCount < 3;
          },
          retryDelay: (attemptIndex) =>
            Math.min(1000 * 2 ** attemptIndex, 30000),
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
          refetchOnMount: false,
        },
        mutations: {
          retry: false,
        },
      },
    });
  }
  return _queryClient;
}

export const queryClient = getQueryClient();

/**
 * Mark active queries as stale when going online.
 * Debounced to avoid thundering herd.
 */
if (typeof window !== 'undefined') {
  let onlineRefetchTimeout: ReturnType<typeof setTimeout> | null = null;
  window.addEventListener('online', () => {
    if (onlineRefetchTimeout) clearTimeout(onlineRefetchTimeout);
    onlineRefetchTimeout = setTimeout(() => {
      queryClient.refetchQueries({ predicate: (q) => q.isStale() });
    }, 800);
  });
}
