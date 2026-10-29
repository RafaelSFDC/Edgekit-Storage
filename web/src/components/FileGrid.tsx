import React, { useState, useMemo } from 'react';
import { Search, Grid, List, FileSpreadsheet, Trash2, ExternalLink } from 'lucide-react';
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
  AlertDialog,
  AlertDialogTrigger,
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
  onDelete: (key: string) => Promise<boolean>;
  onPreview: (object: StorageObject) => void;
}

export const FileGrid: React.FC<FileGridProps> = ({
  objects,
  folders,
  isLoading,
  onDelete,
  onPreview,
}) => {
  const [search, setSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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

  return (
    <div className="space-y-4">
      {/* Control Bar Card */}
      <Card>
        <CardContent className="p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou caminho..."
              className="pl-9"
            />
          </div>

          {/* Filters and View Switcher */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {/* Type Select */}
            <div className="w-40 shrink-0">
              <Select value={selectedType} onValueChange={(val) => setSelectedType(val || 'all')}>
                <SelectTrigger>
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

            {/* Folder Select */}
            {folders.length > 0 && (
              <div className="w-44 shrink-0">
                <Select value={selectedFolder} onValueChange={(val) => setSelectedFolder(val || 'all')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pasta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Pastas</SelectItem>
                    {folders.map((f) => (
                      <SelectItem key={f} value={f}>
                        📁 {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-0.5 shrink-0">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
                className="h-7 w-7 rounded-lg"
                title="Visualização em Grade"
              >
                <Grid className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
                className="h-7 w-7 rounded-lg"
                title="Visualização em Lista"
              >
                <List className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Area */}
      {isLoading ? (
        <div className="py-20 text-center">
          <div className="inline-block w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-zinc-400">Carregando arquivos do bucket R2...</p>
        </div>
      ) : filteredObjects.length === 0 ? (
        <Card className="py-16 text-center">
          <CardContent className="flex flex-col items-center justify-center">
            <FileSpreadsheet className="w-12 h-12 text-zinc-600 mb-3" />
            <h3 className="text-sm font-semibold text-white">Nenhum arquivo encontrado</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm">
              {search || selectedFolder !== 'all' || selectedType !== 'all'
                ? 'Tente ajustar os filtros ou o termo de busca.'
                : 'Faça upload do seu primeiro arquivo na caixa acima para começar!'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredObjects.map((obj) => (
            <FileCard
              key={obj.key}
              object={obj}
              onDelete={onDelete}
              onPreview={onPreview}
            />
          ))}
        </div>
      ) : (
        /* List / Table Mode */
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Arquivo</TableHead>
                <TableHead>Tipo</TableHead>
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
                  className="cursor-pointer"
                >
                  <TableCell className="font-mono text-white flex items-center gap-2">
                    <span className="truncate max-w-md">{obj.key}</span>
                    {obj.isPrivate && (
                      <Badge variant="warning" className="text-[9px]">
                        Privado
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-zinc-400">{obj.mimeType}</TableCell>
                  <TableCell className="text-zinc-400">{formatBytes(obj.size)}</TableCell>
                  <TableCell className="text-zinc-400">{formatDate(obj.uploadedAt)}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(obj.url)}
                        className="h-7 text-xs"
                      >
                        Copiar URL
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => window.open(obj.url, '_blank')}
                        title="Abrir arquivo"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-zinc-400 hover:text-red-400 hover:bg-red-950/30"
                            title="Deletar"
                          />
                        }>
                          <Trash2 className="w-3.5 h-3.5" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Arquivo</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir <strong>{obj.key}</strong>? Esta ação é irreversível.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(obj.key)}>
                              Excluir Permanentemente
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};
