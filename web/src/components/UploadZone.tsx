import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, File, CheckCircle2, AlertCircle, Lock, FolderPlus, Copy, Check, Loader2 } from 'lucide-react';
import { formatBytes } from '../lib/utils';
import type { UploadItem, StorageObject } from '../types';

interface UploadZoneProps {
  isAuthenticated: boolean;
  onUploadSuccess: (newObject: StorageObject) => void;
  onOpenKeyModal: () => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  isAuthenticated,
  onUploadSuccess,
  onOpenKeyModal,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [folder, setFolder] = useState('');
  const [preserveName, setPreserveName] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const uploadFile = async (item: UploadItem) => {
    if (!isAuthenticated) {
      onOpenKeyModal();
      return;
    }

    setQueue((prev) =>
      prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading', progress: 30 } : q))
    );

    const formData = new FormData();
    formData.append('file', item.file);
    if (folder.trim()) formData.append('folder', folder.trim());
    if (preserveName) formData.append('preserveName', 'true');
    if (isPrivate) formData.append('private', 'true');

    try {
      const res = await fetch('/upload', {
        method: 'POST',
        credentials: 'include', // sends HttpOnly session cookie automatically!
        body: formData,
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: 'success', progress: 100, result: json.data }
              : q
          )
        );
        onUploadSuccess(json.data);
      } else {
        const errorMsg = json.error?.message || 'Falha no upload';
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: 'error', error: errorMsg } : q
          )
        );
      }
    } catch {
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? { ...q, status: 'error', error: 'Erro de rede ao enviar arquivo' }
            : q
        )
      );
    }
  };

  const processFiles = (files: FileList | File[]) => {
    const newItems: UploadItem[] = Array.from(files).map((file) => {
      const isImg = file.type.startsWith('image/');
      return {
        id: Math.random().toString(36).slice(2, 9),
        file,
        previewUrl: isImg ? URL.createObjectURL(file) : undefined,
        status: 'pending',
        progress: 0,
      };
    });

    setQueue((prev) => [...newItems, ...prev]);
    newItems.forEach(uploadFile);
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [isAuthenticated, folder, preserveName, isPrivate]
  );

  const clearQueue = () => {
    setQueue([]);
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 mb-8 backdrop-blur-sm">
      {/* Upload Zone Area */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group relative border-2 border-dashed rounded-xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-orange-500 bg-orange-500/10 scale-[1.005]'
            : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 hover:bg-zinc-950/70'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              processFiles(e.target.files);
            }
          }}
        />

        <div className="flex flex-col items-center justify-center pointer-events-none">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:scale-110 group-hover:border-orange-500/40 group-hover:text-orange-400 text-zinc-400 transition-all duration-200 mb-3 shadow-inner">
            <UploadCloud className="w-7 h-7" />
          </div>
          <p className="text-sm font-semibold text-white">
            Arraste arquivos aqui ou{' '}
            <span className="text-orange-400 group-hover:underline">procure no seu dispositivo</span>
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Suporta imagens (PNG, JPG, WebP, AVIF, GIF, SVG) e PDFs de até 25 MB
          </p>
        </div>
      </div>

      {/* Upload Configuration Bar */}
      <div className="mt-4 pt-4 border-t border-zinc-800/60 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Folder Input */}
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-950/50 border border-zinc-800/80 rounded-xl">
          <FolderPlus className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            type="text"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            placeholder="Subpasta (ex: avatars, produtos)..."
            className="w-full bg-transparent text-xs text-white placeholder-zinc-500 outline-none"
          />
        </div>

        {/* Preserve Name Toggle */}
        <label className="flex items-center justify-between px-3.5 py-2 bg-zinc-950/50 border border-zinc-800/80 rounded-xl cursor-pointer hover:bg-zinc-950/80 transition-colors">
          <span className="text-xs text-zinc-300 font-medium">Preservar Nome Original</span>
          <input
            type="checkbox"
            checked={preserveName}
            onChange={(e) => setPreserveName(e.target.checked)}
            className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500/20 bg-zinc-900 border-zinc-700"
          />
        </label>

        {/* Private Toggle */}
        <label className="flex items-center justify-between px-3.5 py-2 bg-zinc-950/50 border border-zinc-800/80 rounded-xl cursor-pointer hover:bg-zinc-950/80 transition-colors">
          <div className="flex items-center gap-1.5">
            <Lock className={`w-3.5 h-3.5 ${isPrivate ? 'text-amber-400' : 'text-zinc-500'}`} />
            <span className="text-xs text-zinc-300 font-medium">Arquivo Privado</span>
          </div>
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500/20 bg-zinc-900 border-zinc-700"
          />
        </label>
      </div>

      {/* Upload Queue */}
      {queue.length > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-800/60">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Fila de Uploads ({queue.length})
            </h3>
            <button
              onClick={clearQueue}
              className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
            >
              Limpar fila
            </button>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {queue.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 bg-zinc-950/80 border border-zinc-800/80 rounded-xl text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.previewUrl ? (
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="w-9 h-9 rounded-lg object-cover shrink-0 border border-zinc-800"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                      <File className="w-4 h-4" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="text-white font-medium truncate max-w-xs">
                      {item.file.name}
                    </p>
                    <div className="flex items-center gap-2 text-zinc-400 text-[11px] mt-0.5">
                      <span>{formatBytes(item.file.size)}</span>
                      {item.status === 'uploading' && (
                        <span className="text-orange-400 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Enviando...
                        </span>
                      )}
                      {item.status === 'success' && (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Enviado!
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span className="text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {item.error}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {item.result && (
                  <button
                    onClick={() => handleCopy(item.result!.url, item.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 rounded-lg text-xs transition-colors shrink-0"
                  >
                    {copiedKey === item.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Copiar URL</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
