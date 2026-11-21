import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  File as FileIcon,
  Lock,
  Loader2,
  X,
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
import { Input } from '@/components/ui/input';
import { FieldGroup, Field, FieldLabel, FieldContent, FieldDescription } from '@/components/ui/field';
import { Checkbox } from '@/components/ui/checkbox';
import { useQueryClient } from '@tanstack/react-query';
import { useUploadMutation } from '../../hooks/api/use-upload';
import { queryKeys } from '../../hooks/api/query-keys';
import { uploadFilePresigned } from '../../services/api';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();
  const uploadMutation = useUploadMutation();
  const isSubmittingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const resetForm = () => {
    setSelectedFiles([]);
    setFolder('');
    setCustomName('');
    setPreserveName(true);
    setIsPrivate(false);
    setUploadProgress(null);
    setIsSubmitting(false);
    isSubmittingRef.current = false;
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

  const isUploading = uploadMutation.isPending || uploadProgress !== null || isSubmitting;

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0 || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (selectedFiles.length === 1) {
        const file = selectedFiles[0];
        try {
          await uploadFilePresigned({
            file,
            folder: folder.trim() || undefined,
            customName: customName.trim() || undefined,
            preserveName,
            isPrivate,
            signal: controller.signal,
          });
          toast.success(t.uploadModal.uploadSuccess);
          queryClient.invalidateQueries({ queryKey: queryKeys.files.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
          resetForm();
          onOpenChange(false);
        } catch (err: any) {
          if (err?.name !== 'AbortError') {
            toast.error(err?.message || t.uploadModal.uploadError);
          }
        }
        return;
      }

      // Multiple files batch upload with direct streaming presigned uploads
      setUploadProgress({ current: 0, total: selectedFiles.length });
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < selectedFiles.length; i++) {
        if (controller.signal.aborted) break;
        const file = selectedFiles[i];
        setUploadProgress({ current: i + 1, total: selectedFiles.length });

        try {
          await uploadFilePresigned({
            file,
            folder: folder.trim() || undefined,
            preserveName,
            isPrivate,
            signal: controller.signal,
          });
          successCount++;
        } catch (err: any) {
          if (err?.name === 'AbortError') break;
          failCount++;
        }
      }

      setUploadProgress(null);
      if (successCount > 0) {
        toast.success(t.uploadModal.batchSuccess(successCount));
        queryClient.invalidateQueries({ queryKey: queryKeys.files.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
      }
      if (failCount > 0) {
        toast.error(t.uploadModal.batchError(failCount));
      }

      resetForm();
      onOpenChange(false);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      abortControllerRef.current = null;
    }
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
      <DialogContent size="lg" className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>{t.uploadModal.title}</DialogTitle>
          <DialogDescription>
            {t.uploadModal.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <DialogBody className="p-6 space-y-4">
            {/* Zona de Drop */}
            <button
              type="button"
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full flex flex-col items-center justify-center p-5 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
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
                  {t.uploadModal.supportText}
                </p>
              </div>
            </button>

            {/* Lista de Arquivos Selecionados */}
            {selectedFiles.length > 0 && (
              <div className="flex flex-col gap-1.5 bg-muted/30 border border-border/70 rounded-lg p-2.5 max-h-44 overflow-y-auto">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground pb-1 border-b border-border/50">
                  <span>
                    {t.uploadModal.filesSelected(selectedFiles.length)} ({formatBytes(totalBytes)})
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles([])}
                    className="text-primary hover:underline"
                  >
                    {t.uploadModal.clearAll}
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

            <FieldGroup>
              {/* Pasta de Destino */}
              <Field>
                <FieldLabel htmlFor="folder" className="text-xs">
                  {t.uploadModal.folderLabel}
                </FieldLabel>
                <Input
                  id="folder"
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  placeholder={t.uploadModal.folderPlaceholder}
                />
              </Field>

              {/* Nome Customizado (Apenas se houver 1 único arquivo) */}
              {selectedFiles.length <= 1 && (
                <Field>
                  <FieldLabel htmlFor="customName" className="text-xs">
                    {t.uploadModal.customNameLabel}
                  </FieldLabel>
                  <Input
                    id="customName"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder={t.uploadModal.customNamePlaceholder}
                  />
                </Field>
              )}

              {/* Flags: Privado e Manter Nome */}
              <div className="flex flex-col gap-3 pt-2 border-t border-border/60">
                <Field orientation="horizontal">
                  <Checkbox
                    id="private-upload-checkbox"
                    checked={isPrivate}
                    onCheckedChange={(checked) => setIsPrivate(!!checked)}
                    className="mt-0.5"
                  />
                  <FieldContent>
                    <FieldLabel htmlFor="private-upload-checkbox" className="text-xs font-medium text-foreground flex items-center gap-1.5 cursor-pointer">
                      <Lock className="size-3 text-amber-500" />
                      {t.uploadModal.privateLabel}
                    </FieldLabel>
                    <FieldDescription className="text-[11px] leading-tight mt-0.5">
                      {t.uploadModal.privateHelp}
                    </FieldDescription>
                  </FieldContent>
                </Field>

                <Field orientation="horizontal">
                  <Checkbox
                    id="preserve-name-checkbox"
                    checked={preserveName}
                    onCheckedChange={(checked) => setPreserveName(!!checked)}
                  />
                  <FieldLabel htmlFor="preserve-name-checkbox" className="text-xs text-foreground cursor-pointer">
                    {t.uploadModal.preserveNameLabel}
                  </FieldLabel>
                </Field>
              </div>
            </FieldGroup>
          </DialogBody>

          <DialogFooter variant="default">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
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
                      ? t.uploadModal.uploadingProgress(uploadProgress.current, uploadProgress.total)
                      : t.uploadModal.uploading}
                  </span>
                </>
              ) : (
                <span>
                  {t.console.uploadButton}{' '}
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
