import React, { useState } from 'react';
import { Copy, Check, Trash2, ExternalLink, FileText, Image as ImageIcon, Lock, Loader2, MoreVertical, Download } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
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
import { formatBytes } from '../lib/utils';
import { useI18n } from '../i18n';
import type { StorageObject } from '../types';

interface FileCardProps {
  object: StorageObject;
  isSelected?: boolean;
  onToggleSelect?: (key: string) => void;
  onDelete: (key: string) => Promise<boolean>;
  onPreview: (object: StorageObject) => void;
}

export const FileCard: React.FC<FileCardProps> = ({
  object,
  isSelected,
  onToggleSelect,
  onDelete,
  onPreview,
}) => {
  const { t, formatDate } = useI18n();
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const isImage = object.mimeType.startsWith('image/') && !imgError;
  const isPdf = object.mimeType.includes('pdf');
  const extension = object.key.split('.').pop()?.toUpperCase() || 'FILE';
  const fileName = object.key.split('/').pop() || object.key;

  const handleCopy = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(object.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    await onDelete(object.key);
    setIsDeleting(false);
    setIsAlertOpen(false);
  };

  return (
    <>
      <Card className={`group overflow-hidden flex flex-col transition-all duration-150 ${isSelected ? 'border-primary ring-1 ring-primary/40 bg-primary/[0.02]' : 'hover:border-muted-foreground/40'}`}>
        {/* Thumbnail Area */}
        <div
          onClick={() => onPreview(object)}
          className="relative w-full aspect-video bg-muted/40 overflow-hidden cursor-pointer flex items-center justify-center border-b border-border select-none"
        >
          {isImage ? (
            <img
              src={object.url}
              alt={fileName}
              onError={() => setImgError(true)}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : isPdf ? (
            <div className="flex flex-col items-center justify-center text-muted-foreground group-hover:scale-105 transition-transform">
              <FileText className="h-10 w-10 text-destructive/80" />
              <span className="text-[10px] font-medium mt-1 uppercase tracking-wider text-muted-foreground">
                {t.fileCard.pdfDocument}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground group-hover:scale-105 transition-transform">
              <ImageIcon className="h-10 w-10 text-muted-foreground" />
              <span className="text-[10px] font-medium mt-1 uppercase tracking-wider text-muted-foreground">
                {extension}
              </span>
            </div>
          )}

          {/* Badges and selection checkbox on top */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10" onClick={(e) => e.stopPropagation()}>
            {onToggleSelect && (
              <input
                type="checkbox"
                checked={Boolean(isSelected)}
                onChange={() => onToggleSelect(object.key)}
                className="h-4 w-4 rounded border-border accent-primary cursor-pointer transition-opacity"
                title={t.fileCard.selectTooltip}
              />
            )}
            <Badge variant="secondary" className="backdrop-blur bg-background/80 text-[10px] py-0 pointer-events-none">
              {extension}
            </Badge>
            {object.isPrivate && (
              <Badge variant="outline" className="backdrop-blur bg-background/80 text-[10px] py-0 border-border text-amber-500 pointer-events-none">
                <Lock className="h-2.5 w-2.5 mr-0.5" />
                {t.fileCard.privateBadge}
              </Badge>
            )}
          </div>
        </div>

        {/* Card Body */}
        <CardContent className="p-4 flex flex-col justify-between flex-1 space-y-3">
          <div>
            <h4
              title={object.key}
              className="text-sm font-medium text-foreground truncate hover:underline cursor-pointer"
              onClick={() => onPreview(object)}
            >
              {fileName}
            </h4>
            <p className="text-xs text-muted-foreground truncate font-mono mt-0.5">
              {object.key}
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
            <span>{formatBytes(object.size)}</span>
            <span>{formatDate(object.uploadedAt)}</span>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-1.5 pt-1">
            <Button
              variant={copied ? 'secondary' : 'outline'}
              size="sm"
              onClick={handleCopy}
              className="flex-1 text-xs h-8 gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-medium">{t.fileCard.copied}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{t.fileCard.copyUrl}</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => window.open(object.url, '_blank')}
              title={t.fileCard.openNewTab}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>

            {/* Dropdown Menu for More Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                  title={t.fileCard.moreActions}
                />
              }>
                <MoreVertical className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onPreview(object)}>
                  <FileText className="h-4 w-4" />
                  <span>{t.fileCard.viewDetails}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCopy()}>
                  <Copy className="h-4 w-4" />
                  <span>{t.fileCard.copyDirectLink}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.open(object.url, '_blank')}>
                  <Download className="h-4 w-4" />
                  <span>{t.fileCard.openOrDownload}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setIsAlertOpen(true)}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>{t.fileCard.deleteFile}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.fileCard.deleteModal.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.fileCard.deleteModal.description(fileName)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t.fileCard.deleteModal.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              {t.fileCard.deleteModal.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
