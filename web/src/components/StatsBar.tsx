import React from 'react';
import { Files, HardDrive, FolderTree, Activity } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
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
      {/* Total Files Card */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 shrink-0">
            <Files className="w-5 h-5" />
          </div>
          <div className="min-w-0">
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
        </CardContent>
      </Card>

      {/* Storage Used Card */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-400">Espaço no R2</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-bold text-white tracking-tight">
                {isLoading ? '...' : formatBytes(totalBytes)}
              </span>
              <Badge variant="success" className="text-[10px] ml-1">
                Egress grátis
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Folders Count Card */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
            <FolderTree className="w-5 h-5" />
          </div>
          <div className="min-w-0">
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
        </CardContent>
      </Card>

      {/* Cloudflare Edge Status Card */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-400">Cloudflare Edge</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-semibold text-white">Online</span>
              <Badge variant="outline" className="text-[10px] ml-1">
                R2 Active
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
