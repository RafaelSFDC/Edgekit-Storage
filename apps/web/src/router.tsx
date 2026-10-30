import React from 'react';
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  Navigate,
} from '@tanstack/react-router';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { ConsolePage } from './pages/ConsolePage';
import { SnippetsPage } from './pages/SnippetsPage';
import { WebhooksPage } from './pages/WebhooksPage';
import { useAuth } from './context/auth-context';
import { EdgekitLogo } from './components/common/EdgekitLogo';

/**
 * Componente Guardião da Dashboard:
 * Se o usuário não estiver autenticado, redireciona para /login.
 * Se estiver autenticado, renderiza o DashboardLayout.
 */
const DashboardGuard: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-svh w-full flex-col items-center justify-center bg-background text-foreground gap-3">
        <div className="flex size-12 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-500 animate-pulse">
          <EdgekitLogo size={28} module="storage" />
        </div>
        <p className="text-xs text-muted-foreground animate-pulse">Carregando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <DashboardLayout />;
};

// 1. Rota raiz vazia que renderiza o Outlet
const rootRoute = createRootRoute({
  component: Outlet,
});

// 2. Rota pública de Login (fora do DashboardLayout)
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

// 3. Layout Route da Dashboard protegida pelo DashboardGuard
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_dashboard',
  component: DashboardGuard,
});

// 4. Rotas filhas do Dashboard
const indexRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/',
  component: OverviewPage,
});

const consoleRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/console',
  component: ConsolePage,
});

const snippetsRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/snippets',
  component: SnippetsPage,
});

const webhooksRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/webhooks',
  component: WebhooksPage,
});

// 5. Montagem da Árvore de Rotas
const routeTree = rootRoute.addChildren([
  loginRoute,
  dashboardRoute.addChildren([
    indexRoute,
    consoleRoute,
    snippetsRoute,
    webhooksRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

// Tipagem global estrita para o TanStack Router
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
