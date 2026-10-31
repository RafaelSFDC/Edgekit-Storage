import React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  File,
  FileImage,
  FileText,
  FileVideo,
  FileAudio,
  Lock,
  Globe,
  Copy,
  ExternalLink,
  Trash2,
  KeyRound,
  Eye,
  MoreHorizontal,
} from 'lucide-react';
import type { StorageObject } from '../../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { formatBytes, formatDate, copyToClipboard } from '../../lib/utils';
import { toast } from 'sonner';

export interface FilesTableMeta {
  onPreview?: (file: StorageObject) => void;
  onGenerateSignedUrl?: (file: StorageObject) => void;
  onDelete?: (key: string) => void;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <FileImage className="size-4 text-sky-500 shrink-0" />;
  if (mimeType.startsWith('video/')) return <FileVideo className="size-4 text-purple-500 shrink-0" />;
  if (mimeType.startsWith('audio/')) return <FileAudio className="size-4 text-amber-500 shrink-0" />;
  if (mimeType.includes('pdf') || mimeType.includes('text/')) return <FileText className="size-4 text-emerald-500 shrink-0" />;
  return <File className="size-4 text-muted-foreground shrink-0" />;
}

export const filesColumns: ColumnDef<StorageObject>[] = [
  // 1. Checkbox de Seleção
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected()
            ? true
            : table.getIsSomePageRowsSelected()
            ? 'indeterminate'
            : false
        }
        onCheckedChange={(val) => table.toggleAllPageRowsSelected(!!val)}
        aria-label="Selecionar todos os arquivos da página"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(val) => row.toggleSelected(!!val)}
        aria-label="Selecionar arquivo"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },

  // 2. Arquivo (Nome, Chave e Miniatura)
  {
    accessorKey: 'key',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          className="-ml-2 h-8 px-2 text-xs font-semibold text-foreground hover:bg-muted/50"
          onClick={() => column.toggleSorting(isSorted === 'asc')}
        >
          Arquivo
          {isSorted === 'asc' ? (
            <ArrowUp className="ml-1 size-3.5" />
          ) : isSorted === 'desc' ? (
            <ArrowDown className="ml-1 size-3.5" />
          ) : (
            <ArrowUpDown className="ml-1 size-3.5 text-muted-foreground" />
          )}
        </Button>
      );
    },
    cell: ({ row, table }) => {
      const file = row.original;
      const meta = table.options.meta as FilesTableMeta | undefined;
      const parts = file.key.split('/');
      const filename = parts[parts.length - 1];
      const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : null;
      const isImage = file.mimeType.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg|avif)$/i.test(file.key);

      return (
        <div className="flex items-center gap-3 min-w-0 max-w-[280px] sm:max-w-[340px] py-1">
          {/* Miniatura ou Ícone */}
          <button
            type="button"
            aria-label={`Visualizar ${filename}`}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 border border-border/70 overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => meta?.onPreview?.(file)}
          >
            {isImage && file.url ? (
              <img
                src={file.url}
                alt={filename}
                className="size-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              getFileIcon(file.mimeType)
            )}
          </button>

          <div className="flex flex-col min-w-0 overflow-hidden">
            <button
              type="button"
              className="text-left font-medium text-xs text-foreground truncate cursor-pointer hover:text-primary transition-colors"
              title={file.key}
              onClick={() => meta?.onPreview?.(file)}
            >
              {filename}
            </button>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono truncate">
              {folder && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground border border-border/60">
                  {folder}
                </span>
              )}
              <span className="truncate">{file.mimeType}</span>
            </div>
          </div>
        </div>
      );
    },
  },

  // 3. Tamanho
  {
    accessorKey: 'size',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          className="-ml-2 h-8 px-2 text-xs font-semibold text-foreground hover:bg-muted/50"
          onClick={() => column.toggleSorting(isSorted === 'asc')}
        >
          Tamanho
          {isSorted === 'asc' ? (
            <ArrowUp className="ml-1 size-3.5" />
          ) : isSorted === 'desc' ? (
            <ArrowDown className="ml-1 size-3.5" />
          ) : (
            <ArrowUpDown className="ml-1 size-3.5 text-muted-foreground" />
          )}
        </Button>
      );
    },
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
        {formatBytes(row.original.size)}
      </span>
    ),
  },

  // 4. Visibilidade (Público vs Privado)
  {
    accessorKey: 'isPrivate',
    header: 'Visibilidade',
    cell: ({ row }) => {
      const isPrivate = row.original.isPrivate;
      return (
        <Badge
          variant="outline"
          className={
            isPrivate
              ? 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 gap-1 text-[11px]'
              : 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 gap-1 text-[11px]'
          }
        >
          {isPrivate ? <Lock className="size-3" /> : <Globe className="size-3" />}
          <span>{isPrivate ? 'Privado' : 'Público'}</span>
        </Badge>
      );
    },
  },

  // 5. Data de Envio
  {
    accessorKey: 'uploadedAt',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          className="-ml-2 h-8 px-2 text-xs font-semibold text-foreground hover:bg-muted/50"
          onClick={() => column.toggleSorting(isSorted === 'asc')}
        >
          Enviado em
          {isSorted === 'asc' ? (
            <ArrowUp className="ml-1 size-3.5" />
          ) : isSorted === 'desc' ? (
            <ArrowDown className="ml-1 size-3.5" />
          ) : (
            <ArrowUpDown className="ml-1 size-3.5 text-muted-foreground" />
          )}
        </Button>
      );
    },
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDate(row.original.uploadedAt)}
      </span>
    ),
  },

  // 6. Menu de Ações
  {
    id: 'actions',
    header: '',
    cell: ({ row, table }) => {
      const file = row.original;
      const meta = table.options.meta as FilesTableMeta | undefined;

      const handleCopyUrl = async () => {
        const success = await copyToClipboard(file.url);
        if (success) {
          toast.success('URL copiada para a área de transferência!');
        } else {
          toast.error('Erro ao copiar URL.');
        }
      };

      return (
        <div className="flex items-center justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm" className="size-8 text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => meta?.onPreview?.(file)}>
                <Eye className="size-4 mr-2" />
                <span>Visualizar</span>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={handleCopyUrl}>
                <Copy className="size-4 mr-2" />
                <span>Copiar URL</span>
              </DropdownMenuItem>

              {file.isPrivate && (
                <DropdownMenuItem onClick={() => meta?.onGenerateSignedUrl?.(file)}>
                  <KeyRound className="size-4 mr-2 text-amber-500" />
                  <span>Gerar Link Assinado</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                render={
                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center">
                    <ExternalLink className="size-4 mr-2" />
                    <span>Abrir em Nova Aba</span>
                  </a>
                }
              />

              <DropdownMenuSeparator />

              <DropdownMenuItem
                variant="destructive"
                onClick={() => meta?.onDelete?.(file.key)}
              >
                <Trash2 className="size-4 mr-2" />
                <span>Excluir Arquivo</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
