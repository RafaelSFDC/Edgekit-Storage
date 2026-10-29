import React from 'react';
import {
  ExternalLink,
  Copy,
  Download,
  Lock,
  Globe,
  KeyRound,
  FileText,
  FileVideo,
  FileAudio,
  File,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { StorageObject } from '../../types';
import { formatBytes, formatDate, copyToClipboard } from '../../lib/utils';
import { useI18n } from '../../i18n/context';
import { toast } from 'sonner';

interface FilePreviewDialogProps {
  file: StorageObject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerateSignedUrl: (file: StorageObject) => void;
}

export const FilePreviewDialog: React.FC<FilePreviewDialogProps> = ({
  file,
  open,
  onOpenChange,
  onGenerateSignedUrl,
}) => {
  const { t } = useI18n();

  if (!file) return null;

  const isImage = file.mimeType.startsWith('image/');
  const isVideo = file.mimeType.startsWith('video/');
  const isAudio = file.mimeType.startsWith('audio/');
  const isPdf = file.mimeType.includes('pdf');

  const handleCopyUrl = async () => {
    const success = await copyToClipboard(file.url);
    if (success) {
      toast.success(t.common.copied);
    } else {
      toast.error(t.common.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                file.isPrivate
                  ? 'border-amber-500/30 text-amber-600 bg-amber-500/10 gap-1 text-[11px]'
                  : 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10 gap-1 text-[11px]'
              }
            >
              {file.isPrivate ? <Lock className="size-3" /> : <Globe className="size-3" />}
              <span>{file.isPrivate ? 'Arquivo Privado' : 'Arquivo Público'}</span>
            </Badge>
          </div>
          <DialogTitle className="text-sm font-semibold truncate pt-1" title={file.key}>
            {file.key}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {formatBytes(file.size)} • {file.mimeType} • {formatDate(file.uploadedAt)}
          </DialogDescription>
        </DialogHeader>

        {/* Pré-visualização do Arquivo */}
        <div className="flex-1 min-h-[220px] max-h-[380px] w-full rounded-lg bg-muted/40 border border-border/80 flex items-center justify-center overflow-hidden my-2">
          {isImage ? (
            <img
              src={file.url}
              alt={file.key}
              className="max-h-full max-w-full object-contain"
            />
          ) : isVideo ? (
            <video
              src={file.url}
              controls
              className="max-h-full max-w-full"
            />
          ) : isAudio ? (
            <audio
              src={file.url}
              controls
              className="w-4/5"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-muted-foreground p-6 text-center">
              {isPdf ? (
                <FileText className="size-16 text-emerald-500/80" />
              ) : (
                <File className="size-16 text-muted-foreground/60" />
              )}
              <span className="text-xs font-mono">{file.mimeType}</span>
            </div>
          )}
        </div>

        {/* Detalhes e URL */}
        <div className="flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={file.url}
              className="flex-1 h-8 px-2.5 rounded-md bg-muted/60 border border-border text-xs font-mono text-muted-foreground select-all outline-hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyUrl}
              className="h-8 text-xs gap-1.5 shrink-0"
            >
              <Copy className="size-3.5" />
              <span>{t.common.copy}</span>
            </Button>
          </div>
        </div>

        <DialogFooter className="shrink-0 pt-2 flex flex-row items-center justify-between sm:justify-between">
          <div>
            {file.isPrivate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onGenerateSignedUrl(file);
                }}
                className="text-xs gap-1.5 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
              >
                <KeyRound className="size-3.5" />
                <span>{t.previewModal.generateSignedUrl}</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              render={
                <a href={file.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5" />
                  <span>Abrir</span>
                </a>
              }
              className="text-xs gap-1.5"
            />
            <Button
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              {t.common.close}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
