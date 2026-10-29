import React from 'react';
import { Cloud, ShieldCheck, LogOut, RefreshCw, Code, ExternalLink, Key } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';

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
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 p-0.5 shadow-lg shadow-orange-500/20">
            <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
              <Cloud className="w-5 h-5 text-orange-500" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white">
                Cloudflare Storage
              </span>
              <Badge variant="default">R2 Bucket</Badge>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">
              Open-Source Edge Media Backend
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Refresh files */}
          <Tooltip>
            <TooltipTrigger render={
              <Button
                variant="outline"
                size="icon"
                onClick={onRefresh}
                disabled={isLoading || !isAuthenticated}
              />
            }>
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-orange-400' : ''}`} />
            </TooltipTrigger>
            <TooltipContent>Recarregar arquivos do R2</TooltipContent>
          </Tooltip>

          {/* Snippet Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenSnippetModal}
          >
            <Code className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden sm:inline">Snippet do Cliente</span>
            <span className="sm:hidden">Snippet</span>
          </Button>

          {/* Auth State Button */}
          {isAuthenticated ? (
            <div className="flex items-center gap-1.5">
              <Badge variant="success" className="hidden sm:inline-flex py-1 px-2.5">
                <ShieldCheck className="w-3 h-3 mr-1 text-emerald-400" />
                <span>HttpOnly Conectado</span>
              </Badge>

              <Tooltip>
                <TooltipTrigger render={
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onLogout}
                    className="hover:text-red-400 hover:bg-red-950/30"
                  />
                }>
                  <LogOut className="w-4 h-4" />
                </TooltipTrigger>
                <TooltipContent>Desconectar sessão</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={onOpenKeyModal}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Conectar API Key</span>
            </Button>
          )}

          <Tooltip>
            <TooltipTrigger render={
              <Button
                variant="outline"
                size="sm"
                className="hidden md:inline-flex"
                onClick={() => window.open('/api', '_blank')}
              />
            }>
              <span>API</span>
              <ExternalLink className="w-3 h-3 text-zinc-500" />
            </TooltipTrigger>
            <TooltipContent>Documentação da API</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  );
};
