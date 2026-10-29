import React, { useState, useMemo } from 'react';
import { Search, LayoutGrid, List, FileSpreadsheet, Trash2, ExternalLink, Copy, MoreHorizontal, Download, FileText, Loader2 } from 'lucide-react';
import { FileCard } from './FileCard';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from './ui/select';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from './ui/table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from './ui/alert-dialog';
import { formatBytes, formatDate } from '../lib/utils';
import type { StorageObject } from '../types';

interface FileGridProps {
  objects: StorageObject[];
  folders: string[];
  isLoading: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onDelete: (key: string) => Promise<boolean>;
  onBatchDelete?: (keys: string[]) => Promise<boolean>;
  onPreview: (object: StorageObject) => void;
}

export const FileGrid: React.FC<FileGridProps> = ({
  objects,
  folders,
  isLoading,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  onDelete,
  onBatchDelete,
  onPreview,
}) => {
  const [search, setSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [isBatchAlertOpen, setIsBatchAlertOpen] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  const filteredObjects = useMemo(() => {
    return objects.filter((obj) => {
      const matchesSearch =
        search.trim() === '' ||
        obj.key.toLowerCase().includes(search.toLowerCase());

      let matchesFolder = true;
      if (selectedFolder !== 'all') {
        matchesFolder = obj.key.startsWith(selectedFolder);
      }

      let matchesType = true;
      if (selectedType === 'images') {
        matchesType = obj.mimeType.startsWith('image/');
      } else if (selectedType === 'pdf') {
        matchesType = obj.mimeType.includes('pdf');
      } else if (selectedType === 'private') {
        matchesType = Boolean(obj.isPrivate);
      }

      return matchesSearch && matchesFolder && matchesType;
    });
  }, [objects, search, selectedFolder, selectedType]);

  const toggleSelect = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedKeys(new Set(filteredObjects.map((o) => o.key)));
  };

  const clearSelection = () => {
    setSelectedKeys(new Set());
  };

  const confirmDelete = async () => {
    if (!deletingKey) return;
    setIsDeleting(true);
    await onDelete(deletingKey);
    setIsDeleting(false);
    setDeletingKey(null);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.delete(deletingKey);
      return next;
    });
  };

  const confirmBatchDelete = async () => {
    if (selectedKeys.size === 0 || !onBatchDelete) return;
    setIsBatchDeleting(true);
    await onBatchDelete(Array.from(selectedKeys));
    setIsBatchDeleting(false);
    setIsBatchAlertOpen(false);
    setSelectedKeys(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Control Bar Card */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou caminho..."
              className="pl-9 h-9"
            />
          </div>

          {/* Filters and View Switcher */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {/* Type Filter Select */}
            <div className="w-36 shrink-0">
              <Select value={selectedType} onValueChange={(val) => setSelectedType(val || 'all')}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Tipo de arquivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="images">Apenas Imagens</SelectItem>
                  <SelectItem value="pdf">Apenas PDFs</SelectItem>
                  <SelectItem value="private">Apenas Privados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Folder Filter Select */}
            {folders.length > 0 && (
              <div className="w-40 shrink-0">
                <Select value={selectedFolder} onValueChange={(val) => setSelectedFolder(val || 'all')}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Pasta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Pastas</SelectItem>
                    {folders.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center border border-input rounded-md p-0.5 bg-background shrink-0">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
                className="h-8 w-8 rounded-sm"
                title="Exibição em Grade"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
                className="h-8 w-8 rounded-sm"
                title="Exibição em Tabela"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch Selection Action Bar */}
      {selectedKeys.size > 0 && (
        <div className="flex flex-wrap items-center justify-between p-3 rounded-lg border border-primary/30 bg-primary/5 text-xs text-foreground gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-primary">
              {selectedKeys.size} {selectedKeys.size === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}
            </span>
            <span className="text-muted-foreground">•</span>
            <button
              type="button"
              onClick={clearSelection}
              className="text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Desmarcar todos
            </button>
            <span className="text-muted-foreground">•</span>
            <button
              type="button"
              onClick={selectAll}
              className="text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Selecionar todos visíveis ({filteredObjects.length})
            </button>
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsBatchAlertOpen(true)}
            className="h-8 text-xs gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Excluir selecionados</span>
          </Button>
        </div>
      )}

      {/* Content Area */}
      {isLoading ? (
        <div className="py-24 text-center">
          <Loader2 className="h-7 w-7 animate-spin mx-auto text-muted-foreground mb-3" />
          <p className="text-xs text-muted-foreground">Carregando objetos do EdgeKit Storage...</p>
        </div>
      ) : filteredObjects.length === 0 ? (
        <Card className="py-16 text-center border-dashed">
          <CardContent className="flex flex-col items-center justify-center">
            <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-3 stroke-[1.5]" />
            <h3 className="text-sm font-semibold text-foreground">Nenhum arquivo encontrado</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {search || selectedFolder !== 'all' || selectedType !== 'all'
                ? 'Nenhum resultado corresponde aos filtros selecionados.'
                : 'Envie seus primeiros arquivos através da área de upload acima.'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredObjects.map((obj) => (
              <FileCard
                key={obj.key}
                object={obj}
                isSelected={selectedKeys.has(obj.key)}
                onToggleSelect={toggleSelect}
                onDelete={onDelete}
                onPreview={onPreview}
              />
            ))}
          </div>

          {/* Load More Button in Grid Mode */}
          {hasMore && (
            <div className="pt-4 pb-2 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="h-9 px-6 text-xs gap-2"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Carregando mais arquivos...</span>
                  </>
                ) : (
                  <span>Carregar mais arquivos</span>
                )}
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* Table Mode */
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={filteredObjects.length > 0 && selectedKeys.size === filteredObjects.length}
                      onChange={(e) => (e.target.checked ? selectAll() : clearSelection())}
                      className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                      title="Selecionar todos"
                    />
                  </TableHead>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Tipo MIME</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Data de Envio</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredObjects.map((obj) => (
                  <TableRow
                    key={obj.key}
                    onClick={() => onPreview(obj)}
                    className={`cursor-pointer ${selectedKeys.has(obj.key) ? 'bg-primary/[0.04]' : ''}`}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()} className="w-10">
                      <input
                        type="checkbox"
                        checked={selectedKeys.has(obj.key)}
                        onChange={() => toggleSelect(obj.key)}
                        className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="font-mono text-foreground flex items-center gap-2">
                      <span className="truncate max-w-sm sm:max-w-md">{obj.key}</span>
                      {obj.isPrivate && (
                        <Badge variant="outline" className="text-[10px] py-0 text-amber-500 border-border">
                          Privado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{obj.mimeType}</TableCell>
                    <TableCell className="text-muted-foreground">{formatBytes(obj.size)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(obj.uploadedAt)}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigator.clipboard.writeText(obj.url)}
                          className="h-8 text-xs gap-1"
                        >
                          <Copy className="h-3 w-3" />
                          <span>Copiar</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => window.open(obj.url, '_blank')}
                          title="Abrir arquivo"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            />
                          }>
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onPreview(obj)}>
                              <FileText className="h-4 w-4" />
                              <span>Ver Detalhes</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(obj.url, '_blank')}>
                              <Download className="h-4 w-4" />
                              <span>Baixar</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeletingKey(obj.key)}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>Excluir</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Load More Button in Table Mode */}
          {hasMore && (
            <div className="pt-4 pb-2 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="h-9 px-6 text-xs gap-2"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Carregando mais arquivos...</span>
                  </>
                ) : (
                  <span>Carregar mais arquivos</span>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Alert Dialog for Table Row */}
      <AlertDialog open={Boolean(deletingKey)} onOpenChange={(open) => !open && setDeletingKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Arquivo</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja remover <strong>{deletingKey}</strong> permanentemente do bucket R2? Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Delete Confirmation Alert Dialog */}
      <AlertDialog open={isBatchAlertOpen} onOpenChange={setIsBatchAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Múltiplos Arquivos</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja excluir permanentemente os <strong>{selectedKeys.size} arquivos selecionados</strong> do bucket R2? Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBatchDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBatchDelete} disabled={isBatchDeleting}>
              {isBatchDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Excluir {selectedKeys.size} Arquivos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
