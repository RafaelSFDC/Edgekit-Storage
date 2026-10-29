import React from 'react';
import { HardDrive, LogOut, RotateCw, Code2, ExternalLink, KeyRound } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useI18n } from '../i18n';

interface NavbarProps {
  isAuthenticated: boolean;
  onOpenKeyModal: () => void;
  onOpenSnippetModal: () => void;
  onLogout: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  isAuthenticated,
  onOpenKeyModal,
  onOpenSnippetModal,
  onLogout,
  onRefresh,
  isLoading,
}) => {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
            <HardDrive className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-tight text-foreground">
              EdgeKit Storage
            </span>
            <Badge variant="secondary" className="text-[11px] font-normal hidden sm:inline-flex">
              {t.navbar.brandSubtitle}
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Refresh files */}
          <Tooltip>
            <TooltipTrigger render={
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={onRefresh}
                disabled={isLoading || !isAuthenticated}
              />
            }>
              <RotateCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </TooltipTrigger>
            <TooltipContent>{t.navbar.refreshTooltip}</TooltipContent>
          </Tooltip>

          {/* Snippet Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenSnippetModal}
            className="h-8 text-xs gap-1.5"
          >
            <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">{t.navbar.clientSnippet}</span>
            <span className="sm:hidden">{t.navbar.clientSnippetShort}</span>
          </Button>

          {/* API Docs Button */}
          <Tooltip>
            <TooltipTrigger render={
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-foreground hidden md:inline-flex gap-1"
                onClick={() => window.open('/api', '_blank')}
              />
            }>
              <span>API</span>
              <ExternalLink className="h-3 w-3" />
            </TooltipTrigger>
            <TooltipContent>{t.navbar.apiDocsTooltip}</TooltipContent>
          </Tooltip>

          {/* Auth State */}
          {isAuthenticated ? (
            <div className="flex items-center gap-1.5 ml-1">
              <Badge variant="outline" className="hidden sm:inline-flex py-1 px-2.5 text-xs font-normal gap-1.5 border-border">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>{t.navbar.httpOnlyActive}</span>
              </Badge>

              <Tooltip>
                <TooltipTrigger render={
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onLogout}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  />
                }>
                  <LogOut className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent>{t.navbar.logoutTooltip}</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={onOpenKeyModal}
              className="h-8 text-xs gap-1.5 ml-1"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>{t.navbar.connectApiKey}</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
