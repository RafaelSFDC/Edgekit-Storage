import React from 'react';
import {
  Globe,
  Sun,
  Moon,
  LogOut,
  User,
} from 'lucide-react';
import { EdgekitLogo } from '../common/EdgekitLogo';
import { useI18n } from '../../i18n/context';
import { useTheme } from '../../theme/context';
import { useAuth } from '../../context/auth-context';
import { useSidebar, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Link, useRouterState } from '@tanstack/react-router';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export const TopHeader: React.FC = () => {
  const { locale, setLocale, t } = useI18n();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const { state, isMobile } = useSidebar();

  // Rota ativa para os breadcrumbs integrados no header
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  const getBreadcrumbs = () => {
    switch (pathname) {
      case '/console':
        return t.breadcrumbs.console;
      case '/snippets':
        return t.breadcrumbs.snippets;
      case '/webhooks':
        return t.breadcrumbs.webhooks;
      case '/':
      default:
        return t.breadcrumbs.overview;
    }
  };

  const currentPage = getBreadcrumbs();
  const isDesktopCollapsed = !isMobile && state === 'collapsed';

  return (
    <header className="sticky top-0 z-40 flex h-12 w-full border-b border-border bg-card/90 backdrop-blur-md select-none">
      {/* 1. Célula Superior Esquerda (Alinhada com a largura da Sidebar no desktop) */}
      <div
        className={cn(
          'hidden lg:flex h-full items-center border-r border-border bg-card transition-[width] duration-200 ease-in-out shrink-0 px-3',
          isDesktopCollapsed
            ? 'w-[var(--sidebar-width-icon)] justify-center px-0'
            : 'w-[var(--sidebar-width)]'
        )}
      >
        <Link to="/" className="flex items-center gap-2 overflow-hidden outline-hidden">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary shadow-xs">
            <EdgekitLogo size={20} module="storage" />
          </div>

          {!isDesktopCollapsed && (
            <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
              <span className="font-bold tracking-tight text-foreground text-sm">Edgekit</span>
              <span className="font-semibold text-primary text-sm">Storage</span>
            </div>
          )}
        </Link>
      </div>

      {/* 2. Barra Superior Direita com Breadcrumbs e Ações */}
      <div className="flex flex-1 items-center justify-between px-3 sm:px-4 gap-3 overflow-hidden">
        {/* Esquerda: Breadcrumbs na barra superior + Trigger desktop & mobile */}
        <div className="flex items-center gap-2 overflow-hidden">
          <SidebarTrigger className="shrink-0" />
          <Breadcrumb className="hidden sm:flex">
            <BreadcrumbList className="text-xs whitespace-nowrap">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/" className="text-muted-foreground hover:text-foreground">
                    {t.breadcrumbs.home}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>

              {pathname !== '/' && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="font-semibold text-foreground">
                      {currentPage}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Direita: Avatar e Menu do Usuário */}
        <div className="ml-auto flex items-center gap-2 sm:gap-3 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full border border-border"
                />
              }
            >
              <User className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <p className="font-semibold text-foreground truncate">edgekit-storage</p>
                  <p className="text-[11px] text-muted-foreground font-mono font-normal truncate">
                    Cloudflare R2 Bucket
                  </p>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => setLocale(locale === 'pt-BR' ? 'en' : 'pt-BR')}
                  className="justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="size-4" />
                    <span>{locale === 'pt-BR' ? 'Idioma' : 'Language'}</span>
                  </div>
                  <span className="font-semibold text-[10px] uppercase bg-muted px-1.5 py-0.5 rounded border border-border/70 text-foreground">
                    {locale === 'pt-BR' ? 'PT-BR' : 'EN'}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleTheme} className="justify-between">
                  <div className="flex items-center gap-2">
                    {resolvedTheme === 'dark' ? (
                      <Moon className="size-4 text-primary" />
                    ) : (
                      <Sun className="size-4 text-amber-500" />
                    )}
                    <span>{locale === 'pt-BR' ? 'Aparência' : 'Appearance'}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {resolvedTheme === 'dark'
                      ? (locale === 'pt-BR' ? 'Escuro' : 'Dark')
                      : (locale === 'pt-BR' ? 'Claro' : 'Light')}
                  </span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => logout()}
              >
                <LogOut className="size-4" />
                <span>{locale === 'pt-BR' ? 'Finalizar sessão' : 'Sign out'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
