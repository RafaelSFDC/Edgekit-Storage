import React from 'react';
import { Cloud, ShieldCheck, LogOut, RefreshCw, Code, ExternalLink, Key } from 'lucide-react';

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
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full">
                R2 Bucket
              </span>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">
              Open-Source Edge Media Backend
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Refresh files */}
          <button
            onClick={onRefresh}
            disabled={isLoading || !isAuthenticated}
            title="Recarregar arquivos"
            className="p-2 text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-orange-400' : ''}`} />
          </button>

          {/* Integration Snippet Button */}
          <button
            onClick={onOpenSnippetModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors"
          >
            <Code className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden sm:inline">Snippet do Cliente</span>
            <span className="sm:hidden">Snippet</span>
          </button>

          {/* Auth State Button */}
          {isAuthenticated ? (
            <div className="flex items-center gap-1.5">
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-xs font-medium text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>HttpOnly Autenticado</span>
              </div>
              <button
                onClick={onLogout}
                title="Desconectar do Dashboard"
                className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-950/30 border border-zinc-800 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenKeyModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white shadow-md shadow-orange-600/20 transition-all"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Conectar API Key</span>
            </button>
          )}

          <a
            href="/api"
            target="_blank"
            rel="noreferrer"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800/80 rounded-lg transition-colors"
          >
            <span>API</span>
            <ExternalLink className="w-3 h-3 text-zinc-500" />
          </a>
        </div>
      </div>
    </header>
  );
};
