import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  File,
  Lock,
  Loader2,
  X,
  CheckCircle2,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUploadMutation } from '../../hooks/api/use-upload';
import { useI18n } from '../../i18n/context';
import { formatBytes } from '../../lib/utils';
import { toast } from 'sonner';

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UploadDialog: React.FC<UploadDialogProps> = ({ open, onOpenChange }) => {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [folder, setFolder] = useState('');
  const [customName, setCustomName] = useState('');
  const [preserveName, setPreserveName] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const uploadMutation = useUploadMutation();

  const resetForm = () => {
    setSelectedFile(null);
    setFolder('');
    setCustomName('');
    setPreserveName(true);
    setIsPrivate(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = (files: FileList | null) => {
    if (files && files[0]) {
      setSelectedFile(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (folder.trim()) formData.append('folder', folder.trim());
    if (customName.trim()) formData.append('customName', customName.trim());
    if (preserveName) formData.append('preserveName', 'true');
    if (isPrivate) formData.append('private', 'true');

    try {
      await uploadMutation.mutateAsync(formData);
      resetForm();
      onOpenChange(false);
    } catch {
      // Error handled by mutation toast
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!uploadMutation.isPending) {
        if (!v) resetForm();
        onOpenChange(v);
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.uploadModal.title}</DialogTitle>
          <DialogDescription className="text-xs">
            Envie arquivos diretamente para o seu bucket Cloudflare R2 com CDN global.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          {/* Zona de Drop */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-border/80 hover:border-primary/50 bg-muted/20'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />

            {selectedFile ? (
              <div className="flex items-center gap-3 w-full">
                <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <File className="size-5" />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-medium text-foreground truncate">{selectedFile.name}</span>
                  <span className="text-[11px] text-muted-foreground">{formatBytes(selectedFile.size)}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="size-7 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-center">
                <UploadCloud className="size-8 text-primary/80 mb-1" />
                <p className="text-xs text-foreground font-medium">
                  {t.uploadModal.dragDropText}{' '}
                  <span className="text-primary hover:underline">{t.uploadModal.browseText}</span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Suporta imagens, PDFs, vídeos e documentos até 25MB
                </p>
              </div>
            )}
          </div>

          {/* Pasta de Destino */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="folder" className="text-xs">{t.uploadModal.folderLabel}</Label>
            <Input
              id="folder"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              placeholder={t.uploadModal.folderPlaceholder}
              className="h-8 text-xs"
            />
          </div>

          {/* Nome Customizado (Opcional) */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customName" className="text-xs">Nome personalizado (opcional)</Label>
            <Input
              id="customName"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="ex: perfil-usuario"
              className="h-8 text-xs"
            />
          </div>

          {/* Flags: Privado e Manter Nome */}
          <div className="flex flex-col gap-2 pt-1 border-t border-border/60">
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary accent-sky-500"
              />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Lock className="size-3 text-amber-500" />
                  {t.uploadModal.privateLabel}
                </span>
                <span className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  {t.uploadModal.privateHelp}
                </span>
              </div>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={preserveName}
                onChange={(e) => setPreserveName(e.target.checked)}
                className="size-4 rounded border-border text-primary focus:ring-primary accent-sky-500"
              />
              <span className="text-xs text-foreground">{t.uploadModal.preserveNameLabel}</span>
            </label>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={uploadMutation.isPending}
              className="text-xs"
            >
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!selectedFile || uploadMutation.isPending}
              className="text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>{t.uploadModal.uploading}</span>
                </>
              ) : (
                <span>{t.common.upload}</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
