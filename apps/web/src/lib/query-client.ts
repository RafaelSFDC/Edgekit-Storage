import { QueryClient } from '@tanstack/react-query';

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

/**
 * Utility functions for cache management
 */
export const cacheUtils = {
  /**
   * Clear all cache
   */
  clearAll: () => {
    queryClient.clear();
  },

  /**
   * Remove specific query from cache
   */
  removeQuery: (queryKey: ReadonlyArray<unknown>) => {
    queryClient.removeQueries({ queryKey });
  },

  /**
   * Set query data manually
   */
  setQueryData: <T>(queryKey: ReadonlyArray<unknown>, data: T) => {
    queryClient.setQueryData(queryKey, data);
  },

  /**
   * Get query data from cache
   */
  getQueryData: <T>(queryKey: ReadonlyArray<unknown>): T | undefined => {
    return queryClient.getQueryData<T>(queryKey);
  },

  /**
   * Prefetch query
   */
  prefetchQuery: async (
    queryKey: ReadonlyArray<unknown>,
    queryFn: () => Promise<any>
  ) => {
    await queryClient.prefetchQuery({ queryKey, queryFn });
  },
};
