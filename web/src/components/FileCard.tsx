import React, { useState } from 'react';
import { Copy, Check, Trash2, ExternalLink, FileText, Image as ImageIcon, Lock, Loader2 } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
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

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    await onDelete(object.key);
    setIsDeleting(false);
  };

  return (
    <Card className="group overflow-hidden flex flex-col hover:border-zinc-700/80 transition-all">
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
          <Badge variant="outline" className="bg-zinc-950/80 backdrop-blur-md">
            {extension}
          </Badge>
          {object.isPrivate && (
            <Badge variant="warning" className="backdrop-blur-md">
              <Lock className="w-2.5 h-2.5 mr-0.5" />
              Privado
            </Badge>
          )}
        </div>

        {/* Hover Quick Action */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="px-3 py-1.5 bg-zinc-900/90 text-white rounded-lg text-xs font-medium border border-zinc-700 shadow-lg">
            Ver detalhes
          </span>
        </div>
      </div>

      {/* Card Body */}
      <CardContent className="p-3.5 flex flex-col justify-between flex-1">
        <div>
          <h4
            title={object.key}
            className="text-xs font-semibold text-white truncate hover:text-orange-400 transition-colors cursor-pointer"
            onClick={() => onPreview(object)}
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
          <Button
            variant={copied ? 'outline' : 'secondary'}
            size="sm"
            onClick={handleCopy}
            className={`flex-1 text-xs h-8 ${
              copied ? 'border-emerald-700 text-emerald-300' : ''
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar URL</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-white shrink-0"
            onClick={() => window.open(object.url, '_blank')}
            title="Abrir em nova aba"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>

          {/* AlertDialog for Safe Deletion */}
          <AlertDialog>
            <AlertDialogTrigger render={
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-red-950/30 shrink-0"
                title="Excluir arquivo"
              />
            }>
              {isDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Arquivo</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir <strong>{fileName}</strong>? Esta ação é irreversível e removerá o arquivo permanentemente do bucket R2.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete}>
                  Excluir Permanentemente
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};
