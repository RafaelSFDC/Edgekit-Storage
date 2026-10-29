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

          {/* GitHub Link */}
          <Tooltip>
            <TooltipTrigger render={
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hidden sm:inline-flex"
                onClick={() => window.open('https://github.com/RafaelSFDC/Edgekit-Storage', '_blank')}
              />
            }>
              <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </TooltipTrigger>
            <TooltipContent>GitHub</TooltipContent>
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
