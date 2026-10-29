import React, { useState, useMemo } from 'react';
import { Search, Folder, Grid, List, Filter, FileSpreadsheet } from 'lucide-react';
import { FileCard } from './FileCard';
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
      // Search filter
      const matchesSearch =
        search.trim() === '' ||
        obj.key.toLowerCase().includes(search.toLowerCase());

      // Folder filter
      let matchesFolder = true;
      if (selectedFolder !== 'all') {
        matchesFolder = obj.key.startsWith(selectedFolder);
      }

      // Type filter
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
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-900/50 p-3.5 border border-zinc-800/80 rounded-2xl backdrop-blur-sm">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou caminho..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-950/60 border border-zinc-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl text-xs text-white placeholder-zinc-500 outline-none transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {/* Type Select */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs text-zinc-300 outline-none focus:border-orange-500 cursor-pointer"
          >
            <option value="all">Todos os tipos</option>
            <option value="images">Apenas Imagens</option>
            <option value="pdf">Apenas PDFs</option>
            <option value="private">Apenas Privados</option>
          </select>

          {/* Folder Select */}
          {folders.length > 0 && (
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="px-3 py-2 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs text-zinc-300 outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="all">Todas as Pastas</option>
              {folders.map((f) => (
                <option key={f} value={f}>
                  📁 {f}
                </option>
              ))}
            </select>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center bg-zinc-950/60 border border-zinc-800 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Visualização em Grade"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Visualização em Lista"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="py-20 text-center">
          <div className="inline-block w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-zinc-400">Carregando arquivos do bucket R2...</p>
        </div>
      ) : filteredObjects.length === 0 ? (
        <div className="py-16 text-center border border-zinc-800/80 rounded-2xl bg-zinc-900/20">
          <FileSpreadsheet className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white">Nenhum arquivo encontrado</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            {search || selectedFolder !== 'all' || selectedType !== 'all'
              ? 'Tente ajustar os filtros ou o termo de busca.'
              : 'Faça upload do seu primeiro arquivo na caixa acima para começar!'}
          </p>
        </div>
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
        <div className="border border-zinc-800/80 rounded-2xl overflow-hidden bg-zinc-900/30">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Arquivo</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Tamanho</th>
                <th className="py-3 px-4">Data de Envio</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredObjects.map((obj) => (
                <tr
                  key={obj.key}
                  onClick={() => onPreview(obj)}
                  className="hover:bg-zinc-900/50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-mono text-white flex items-center gap-2">
                    <span className="truncate max-w-md">{obj.key}</span>
                    {obj.isPrivate && (
                      <span className="px-1.5 py-0.5 text-[9px] bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                        Privado
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-zinc-400">{obj.mimeType}</td>
                  <td className="py-3 px-4 text-zinc-400">{formatBytes(obj.size)}</td>
                  <td className="py-3 px-4 text-zinc-400">{formatDate(obj.uploadedAt)}</td>
                  <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => navigator.clipboard.writeText(obj.url)}
                      className="px-2.5 py-1 text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg mr-2"
                    >
                      Copiar URL
                    </button>
                    <button
                      onClick={() => onDelete(obj.key)}
                      className="px-2.5 py-1 text-[11px] bg-red-950/40 hover:bg-red-900 text-red-300 border border-red-800/60 rounded-lg"
                    >
                      Deletar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
