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
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
      <DialogContent size="xl" className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
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
          <DialogTitle className="truncate pt-1" title={file.key}>
            {file.key}
          </DialogTitle>
          <DialogDescription>
            {formatBytes(file.size)} • {file.mimeType} • {formatDate(file.uploadedAt)}
          </DialogDescription>
        </DialogHeader>

        {/* Conteúdo com Scroll */}
        <DialogBody className="p-6 space-y-4">
          {/* Pré-visualização do Arquivo */}
          <div className="min-h-[220px] max-h-[380px] w-full rounded-lg bg-muted/40 border border-border/80 flex items-center justify-center overflow-hidden">
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
          <div className="flex items-center gap-2">
            <Input
              type="text"
              readOnly
              value={file.url}
              className="font-mono text-xs select-all bg-muted/30"
            />
            <Button
              variant="outline"
              onClick={handleCopyUrl}
              className="gap-1.5 shrink-0"
            >
              <Copy className="size-3.5" />
              <span>{t.common.copy}</span>
            </Button>
          </div>
        </DialogBody>

        <DialogFooter variant="default" className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            {file.isPrivate && (
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onGenerateSignedUrl(file);
                }}
                className="gap-1.5 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
              >
                <KeyRound className="size-3.5" />
                <span>{t.previewModal.generateSignedUrl}</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="outline"
              render={
                <a href={file.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3.5" />
                  <span>Abrir</span>
                </a>
              }
            />
            <Button
              onClick={() => onOpenChange(false)}
            >
              {t.common.close}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
