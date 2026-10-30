import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  File as FileIcon,
  Lock,
  Loader2,
  X,
  CheckCircle2,
  Files,
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
import { Checkbox } from '@/components/ui/checkbox';
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [folder, setFolder] = useState('');
  const [customName, setCustomName] = useState('');
  const [preserveName, setPreserveName] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  const uploadMutation = useUploadMutation();

  const resetForm = () => {
    setSelectedFiles([]);
    setFolder('');
    setCustomName('');
    setPreserveName(true);
    setIsPrivate(false);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...Array.from(files)]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const isUploading = uploadMutation.isPending || uploadProgress !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    if (selectedFiles.length === 1) {
      const file = selectedFiles[0];
      const formData = new FormData();
      formData.append('file', file);
      if (folder.trim()) formData.append('folder', folder.trim());
      if (customName.trim()) formData.append('customName', customName.trim());
      if (preserveName) formData.append('preserveName', 'true');
      if (isPrivate) formData.append('private', 'true');

      try {
        await uploadMutation.mutateAsync(formData);
        resetForm();
        onOpenChange(false);
      } catch {
        // Handled by toast
      }
      return;
    }

    // Multiple files batch upload
    setUploadProgress({ current: 0, total: selectedFiles.length });
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      setUploadProgress({ current: i + 1, total: selectedFiles.length });

      const formData = new FormData();
      formData.append('file', file);
      if (folder.trim()) formData.append('folder', folder.trim());
      if (preserveName) formData.append('preserveName', 'true');
      if (isPrivate) formData.append('private', 'true');

      try {
        await uploadMutation.mutateAsync(formData);
        successCount++;
      } catch {
        failCount++;
      }
    }

    setUploadProgress(null);
    if (successCount > 0) {
      toast.success(`${successCount} arquivo(s) enviados com sucesso!`);
    }
    if (failCount > 0) {
      toast.error(`Falha no envio de ${failCount} arquivo(s).`);
    }

    resetForm();
    onOpenChange(false);
  };

  const totalBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!isUploading) {
          if (!v) resetForm();
          onOpenChange(v);
        }
      }}
    >
      <DialogContent className="sm:max-w-lg p-0 gap-0 max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border/60 shrink-0">
          <DialogTitle>{t.uploadModal.title}</DialogTitle>
          <DialogDescription>
            Envie arquivos diretamente para o seu bucket Cloudflare R2 com CDN global.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Zona de Drop */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center p-5 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border/80 hover:border-primary/50 bg-muted/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />

              <div className="flex flex-col items-center gap-1.5 text-center">
                <UploadCloud className="size-8 text-primary/80 mb-1" />
                <p className="text-xs text-foreground font-medium">
                  {t.uploadModal.dragDropText}{' '}
                  <span className="text-primary hover:underline">{t.uploadModal.browseText}</span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Suporta múltiplos arquivos, PDFs, imagens e documentos até 25MB
                </p>
              </div>
            </div>

            {/* Lista de Arquivos Selecionados */}
            {selectedFiles.length > 0 && (
              <div className="flex flex-col gap-1.5 bg-muted/30 border border-border/70 rounded-lg p-2.5 max-h-44 overflow-y-auto">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground pb-1 border-b border-border/50">
                  <span>
                    {selectedFiles.length} arquivo(s) selecionado(s) ({formatBytes(totalBytes)})
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles([])}
                    className="text-primary hover:underline"
                  >
                    Limpar todos
                  </button>
                </div>

                {selectedFiles.map((f, idx) => (
                  <div
                    key={`${f.name}-${idx}`}
                    className="flex items-center justify-between gap-2 p-1.5 rounded bg-card border border-border/60 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileIcon className="size-3.5 text-primary shrink-0" />
                      <span className="truncate font-medium text-foreground">{f.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        ({formatBytes(f.size)})
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => removeFile(idx)}
                      className="size-6 text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Pasta de Destino */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="folder" className="text-xs">
                {t.uploadModal.folderLabel}
              </Label>
              <Input
                id="folder"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                placeholder={t.uploadModal.folderPlaceholder}
              />
            </div>

            {/* Nome Customizado (Apenas se houver 1 único arquivo) */}
            {selectedFiles.length <= 1 && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="customName" className="text-xs">
                  Nome personalizado (opcional)
                </Label>
                <Input
                  id="customName"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="ex: perfil-usuario"
                />
              </div>
            )}

            {/* Flags: Privado e Manter Nome */}
            <div className="flex flex-col gap-2.5 pt-1 border-t border-border/60">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <Checkbox
                  checked={isPrivate}
                  onCheckedChange={(checked) => setIsPrivate(!!checked)}
                  className="mt-0.5"
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

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <Checkbox
                  checked={preserveName}
                  onCheckedChange={(checked) => setPreserveName(!!checked)}
                />
                <span className="text-xs text-foreground">{t.uploadModal.preserveNameLabel}</span>
              </label>
            </div>
          </div>

          <DialogFooter className="p-4 sm:p-6 sm:py-4 border-t border-border/60 bg-muted/30 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              disabled={selectedFiles.length === 0 || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>
                    {uploadProgress
                      ? `Enviando (${uploadProgress.current}/${uploadProgress.total})...`
                      : t.uploadModal.uploading}
                  </span>
                </>
              ) : (
                <span>
                  {t.common.upload}{' '}
                  {selectedFiles.length > 1 ? `(${selectedFiles.length})` : ''}
                </span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
