import React, { useState } from 'react';
import { Copy, Check, Trash2, ExternalLink, FileText, Image as ImageIcon, Lock, AlertTriangle, Loader2 } from 'lucide-react';
import { formatBytes, formatDate } from '../lib/utils';
import type { StorageObject } from '../types';

interface FileCardProps {
  object: StorageObject;
  onDelete: (key: string) => Promise<boolean>;
  onPreview: (object: StorageObject) => void;
}

export const FileCard: React.FC<FileCardProps> = ({
  object,
  onDelete,
  onPreview,
}) => {
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [imgError, setImgError] = useState(false);

  const isImage = object.mimeType.startsWith('image/') && !imgError;
  const isPdf = object.mimeType.includes('pdf');
  const extension = object.key.split('.').pop()?.toUpperCase() || 'FILE';
  const fileName = object.key.split('/').pop() || object.key;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(object.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    const success = await onDelete(object.key);
    if (!success) {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="group relative bg-zinc-900/40 hover:bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl overflow-hidden transition-all duration-200 flex flex-col">
      {/* Thumbnail Area */}
      <div
        onClick={() => onPreview(object)}
        className="relative w-full aspect-video bg-zinc-950/60 overflow-hidden cursor-pointer flex items-center justify-center border-b border-zinc-800/60"
      >
        {isImage ? (
          <img
            src={object.url}
            alt={fileName}
            onError={() => setImgError(true)}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : isPdf ? (
          <div className="flex flex-col items-center justify-center text-red-400/80 group-hover:scale-110 transition-transform">
            <FileText className="w-12 h-12" />
            <span className="text-[11px] font-semibold text-zinc-400 mt-1 uppercase tracking-wider">
              Documento PDF
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-zinc-500 group-hover:scale-110 transition-transform">
            <ImageIcon className="w-12 h-12" />
            <span className="text-[11px] font-semibold text-zinc-400 mt-1 uppercase tracking-wider">
              {extension}
            </span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <span className="px-2 py-0.5 text-[10px] font-bold bg-zinc-950/80 backdrop-blur-md text-zinc-300 border border-zinc-800 rounded-md">
            {extension}
          </span>
          {object.isPrivate && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 backdrop-blur-md text-amber-300 border border-amber-500/30 rounded-md flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              Privado
            </span>
          )}
        </div>

        {/* Hover Quick Action */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <span className="px-3 py-1.5 bg-zinc-900/90 text-white rounded-lg text-xs font-medium border border-zinc-700 shadow-lg">
            Ver detalhes
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3.5 flex flex-col justify-between flex-1">
        <div>
          <h4
            title={object.key}
            className="text-xs font-semibold text-white truncate hover:text-orange-400 transition-colors"
          >
            {fileName}
          </h4>
          <p className="text-[11px] text-zinc-400 truncate mt-0.5 font-mono">
            {object.key}
          </p>
        </div>

        <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-3 pt-2.5 border-t border-zinc-800/60">
          <span>{formatBytes(object.size)}</span>
          <span>{formatDate(object.uploadedAt)}</span>
        </div>

        {/* Actions Bar */}
        <div className="mt-3 flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-medium border transition-all ${
              copied
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                : 'bg-zinc-800/60 hover:bg-zinc-750 text-zinc-300 hover:text-white border-zinc-750'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar URL</span>
              </>
            )}
          </button>

          <a
            href={object.url}
            target="_blank"
            rel="noreferrer"
            title="Abrir em nova aba"
            className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-750 border border-zinc-750 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {showConfirm ? (
            <div className="flex items-center gap-1">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                title="Confirmar exclusão"
                className="p-1.5 text-red-300 bg-red-950/80 hover:bg-red-900 border border-red-800 rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                title="Cancelar"
                className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800 rounded-lg transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              title="Excluir arquivo"
              className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-950/30 border border-transparent hover:border-red-900/60 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
