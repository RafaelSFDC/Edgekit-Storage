import React from 'react';
import { Files, HardDrive, FolderTree, Activity } from 'lucide-react';
import { formatBytes } from '../lib/utils';
import type { StorageObject } from '../types';

interface StatsBarProps {
  objects: StorageObject[];
  folders: string[];
  isLoading: boolean;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  objects,
  folders,
  isLoading,
}) => {
  const totalBytes = objects.reduce((acc, curr) => acc + (curr.size || 0), 0);
  const privateCount = objects.filter((o) => o.isPrivate).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {/* Total Files */}
      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-sm">
        <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400">
          <Files className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-400">Total de Arquivos</p>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-bold text-white tracking-tight">
              {isLoading ? '...' : objects.length}
            </span>
            {privateCount > 0 && (
              <span className="text-[11px] text-zinc-500 font-medium">
                ({privateCount} privados)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Storage Used */}
      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-sm">
        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
          <HardDrive className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-400">Espaço no R2</p>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-bold text-white tracking-tight">
              {isLoading ? '...' : formatBytes(totalBytes)}
            </span>
            <span className="text-[11px] text-emerald-400 font-medium">
              Egress grátis
            </span>
          </div>
        </div>
      </div>

      {/* Folders count */}
      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-sm">
        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
          <FolderTree className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-400">Pastas Criadas</p>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-bold text-white tracking-tight">
              {isLoading ? '...' : folders.length}
            </span>
            <span className="text-[11px] text-zinc-500 font-medium">
              organizadas
            </span>
          </div>
        </div>
      </div>

      {/* Cloudflare Edge Status */}
      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-3.5 backdrop-blur-sm">
        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-400">Cloudflare Edge</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-semibold text-white">Online</span>
            <span className="text-[11px] text-zinc-400 ml-1">R2 Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
};
