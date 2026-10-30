import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState,
} from '@tanstack/react-table';
import {
  Search,
  Trash2,
  Upload,
  RefreshCw,
  FolderOpen,
  Filter,
  CheckSquare,
  Square,
  HardDrive,
  AlertCircle,
} from 'lucide-react';
import type { StorageObject } from '../../types';
import { filesColumns, type FilesTableMeta } from './files-columns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { useI18n } from '../../i18n/context';

interface FilesDataTableProps {
  data: StorageObject[];
  isLoading: boolean;
  onRefresh: () => void;
  onOpenUpload: () => void;
  onPreview: (file: StorageObject) => void;
  onGenerateSignedUrl: (file: StorageObject) => void;
  onDelete: (key: string) => void;
  onBatchDelete: (keys: string[]) => void;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  pageIndex?: number;
}

export const FilesDataTable: React.FC<FilesDataTableProps> = ({
  data,
  isLoading,
  onRefresh,
  onOpenUpload,
  onPreview,
  onGenerateSignedUrl,
  onDelete,
  onBatchDelete,
  hasNextPage,
  hasPrevPage,
  onNextPage,
  onPrevPage,
  pageIndex = 0,
}) => {
  const { t } = useI18n();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'uploadedAt', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [folderFilter, setFolderFilter] = useState<string>('all');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Pastas únicas extraídas dos dados
  const folders = useMemo(() => {
    const set = new Set<string>();
    data.forEach((obj) => {
      const parts = obj.key.split('/');
      if (parts.length > 1) {
        set.add(parts[0]);
      }
    });
    return Array.from(set).sort();
  }, [data]);

  // Filtragem composta
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // 1. Filtro de tipo MIME
      if (typeFilter === 'images' && !item.mimeType.startsWith('image/')) return false;
      if (typeFilter === 'docs' && !item.mimeType.includes('pdf') && !item.mimeType.startsWith('text/')) return false;
      if (typeFilter === 'private' && !item.isPrivate) return false;
      if (typeFilter === 'public' && item.isPrivate) return false;

      // 2. Filtro de pasta
      if (folderFilter !== 'all') {
        const itemFolder = item.key.includes('/') ? item.key.split('/')[0] : '';
        if (itemFolder !== folderFilter) return false;
      }

      // 3. Busca por texto
      if (globalFilter.trim()) {
        const term = globalFilter.toLowerCase();
        return item.key.toLowerCase().includes(term) || item.mimeType.toLowerCase().includes(term);
      }

      return true;
    });
  }, [data, typeFilter, folderFilter, globalFilter]);

  const meta: FilesTableMeta = useMemo(
    () => ({
      onPreview,
      onGenerateSignedUrl,
      onDelete,
    }),
    [onPreview, onGenerateSignedUrl, onDelete]
  );

  const table = useReactTable({
    data: filteredData,
    columns: filesColumns,
    state: {
      sorting,
      rowSelection,
    },
    meta,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 15,
      },
    },
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedCount = selectedRows.length;

  const handleBatchDeleteClick = () => {
    if (selectedCount === 0) return;
    const keys = selectedRows.map((r) => r.original.key);
    if (window.confirm(t.console.batchDeleteConfirm(keys.length))) {
      onBatchDelete(keys);
      setRowSelection({});
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Barra de Ações Superiores: Busca, Filtros e Botões */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Campo de Busca */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={t.console.searchPlaceholder}
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Filtros e Ações */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro de Tipo */}
          <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val ?? 'all')}>
            <SelectTrigger className="h-9 text-xs w-[140px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.console.filterAll}</SelectItem>
              <SelectItem value="images">{t.console.filterImages}</SelectItem>
              <SelectItem value="docs">{t.console.filterDocs}</SelectItem>
              <SelectItem value="public">{t.console.filterPublic}</SelectItem>
              <SelectItem value="private">{t.console.filterPrivate}</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro de Pasta (se existirem) */}
          {folders.length > 0 && (
            <Select value={folderFilter} onValueChange={(val) => setFolderFilter(val ?? 'all')}>
              <SelectTrigger className="h-9 text-xs w-[130px]">
                <SelectValue placeholder="Pasta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as pastas</SelectItem>
                {folders.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Atualizar */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="h-9 text-xs gap-1.5"
            disabled={isLoading}
          >
            <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t.common.refresh}</span>
          </Button>

          {/* Botão Novo Upload */}
          <Button
            size="sm"
            onClick={onOpenUpload}
            className="h-9 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Upload className="size-3.5" />
            <span>{t.console.uploadButton}</span>
          </Button>
        </div>
      </div>

      {/* 2. Barra de Seleção em Lote (Quando linhas forem selecionadas) */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/70 border border-border/80 animate-in fade-in-50 duration-150">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground">
            <CheckSquare className="size-4 text-primary" />
            <span>{selectedCount} arquivo(s) selecionado(s)</span>
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleBatchDeleteClick}
            className="h-7 text-xs gap-1.5"
          >
            <Trash2 className="size-3.5" />
            <span>{t.console.batchDelete}</span>
          </Button>
        </div>
      )}

      {/* 3. Tabela de Arquivos */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-xs font-semibold py-2.5">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="hover:bg-muted/40 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={filesColumns.length} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <HardDrive className="size-8 opacity-40" />
                    <p className="text-sm font-medium">
                      {globalFilter || typeFilter !== 'all' || folderFilter !== 'all'
                        ? t.console.noFilesMatch
                        : t.console.noFilesFound}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onOpenUpload}
                      className="mt-2 text-xs"
                    >
                      <Upload className="size-3.5 mr-1.5" />
                      Fazer primeiro upload
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 4. Paginação (Local e Remota via Cursor R2) */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-3 px-1">
        <div>
          {hasNextPage !== undefined || hasPrevPage !== undefined ? (
            <span>
              Lote R2 (Página {pageIndex + 1}) • {data.length} arquivo(s) neste lote
            </span>
          ) : (
            <span>
              {filteredData.length} arquivo(s)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {table.getPageCount() > 1 && (
            <div className="flex items-center gap-1.5 mr-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-7 text-xs px-2"
              >
                Anterior
              </Button>
              <span className="text-[11px]">
                {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-7 text-xs px-2"
              >
                Próximo
              </Button>
            </div>
          )}

          {(hasNextPage !== undefined || hasPrevPage !== undefined) && (
            <div className="flex items-center gap-1.5 border-l border-border/80 pl-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onPrevPage}
                disabled={!hasPrevPage || isLoading}
                className="h-8 text-xs px-2.5 gap-1"
              >
                ← Anterior (R2)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onNextPage}
                disabled={!hasNextPage || isLoading}
                className="h-8 text-xs px-2.5 gap-1"
              >
                Próximo (R2) →
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
