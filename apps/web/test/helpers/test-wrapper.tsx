import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createRootRoute,
  createRouter,
  RouterProvider,
  createMemoryHistory,
} from '@tanstack/react-router';
import { I18nProvider } from '../../src/i18n/context';
import { ThemeProvider } from '../../src/theme/context';
import { AuthProvider } from '../../src/context/auth-context';
import { TooltipProvider } from '@/components/ui/tooltip';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export const TestWrapper: React.FC<{ children: ReactNode; queryClient?: QueryClient }> = ({
  children,
  queryClient = createTestQueryClient(),
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export const RouterTestWrapper: React.FC<{
  children: ReactNode;
  queryClient?: QueryClient;
  initialEntries?: string[];
}> = ({ children, queryClient = createTestQueryClient(), initialEntries = ['/'] }) => {
  const rootRoute = createRootRoute({
    component: () => <>{children}</>,
  });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries }),
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <TooltipProvider>
              <RouterProvider router={router} />
            </TooltipProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
