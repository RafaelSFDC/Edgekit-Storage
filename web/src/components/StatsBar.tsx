import React from 'react';
import { Files, Database, FolderTree, Activity } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Files Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            Total de Arquivos
          </CardTitle>
          <Files className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">
            {isLoading ? '...' : objects.length}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {privateCount > 0 ? `${privateCount} privado(s)` : 'Todos os itens no R2'}
          </p>
        </CardContent>
      </Card>

      {/* Storage Used Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            Espaço Utilizado
          </CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">
            {isLoading ? '...' : formatBytes(totalBytes)}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
              Egress grátis ($0)
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Folders Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            Pastas / Prefixos
          </CardTitle>
          <FolderTree className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">
            {isLoading ? '...' : folders.length}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Diretórios estruturados
          </p>
        </CardContent>
      </Card>

      {/* Cloudflare Edge Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            Cloudflare Workers & R2
          </CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <span>Online</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Edge global com latência mínima
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
