import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, File, CheckCircle2, AlertCircle, Lock, FolderPlus, Copy, Check, Loader2 } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { formatBytes } from '../lib/utils';
import { useI18n } from '../i18n';
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
  const { t } = useI18n();
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
      prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading', progress: 40 } : q))
    );

    const formData = new FormData();
    formData.append('file', item.file);
    if (folder.trim()) formData.append('folder', folder.trim());
    if (preserveName) formData.append('preserveName', 'true');
    if (isPrivate) formData.append('private', 'true');

    try {
      const res = await fetch('/upload', {
        method: 'POST',
        credentials: 'include',
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
        const errorMsg = json.error?.message || t.upload.failedUpload;
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
            ? { ...q, status: 'error', error: t.upload.networkError }
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

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        {/* Drop Area */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 sm:p-10 text-center cursor-pointer transition-colors duration-150 flex flex-col items-center justify-center ${
            isDragging
              ? 'border-primary bg-accent/50'
              : 'border-border hover:border-muted-foreground/40 hover:bg-muted/30 bg-muted/10'
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

          <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground mb-3 shadow-sm">
            <UploadCloud className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-foreground">
            {t.upload.dragTitle}{' '}
            <span className="text-primary underline underline-offset-4">{t.upload.browseDevice}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t.upload.supportedFormats}
          </p>
        </div>

        {/* Configuration Bar */}
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Subfolder input */}
          <div className="relative flex items-center">
            <FolderPlus className="h-4 w-4 text-muted-foreground absolute left-3 pointer-events-none" />
            <Input
              type="text"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              placeholder={t.upload.folderPlaceholder}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Preserve Name Checkbox */}
          <div className="flex items-center gap-2.5 px-3 py-2 border border-input rounded-md bg-background/50">
            <Checkbox
              id="preserveName"
              checked={preserveName}
              onCheckedChange={(checked) => setPreserveName(Boolean(checked))}
            />
            <Label htmlFor="preserveName" className="cursor-pointer text-xs font-normal">
              {t.upload.preserveOriginalName}
            </Label>
          </div>

          {/* Private Checkbox */}
          <div className="flex items-center gap-2.5 px-3 py-2 border border-input rounded-md bg-background/50">
            <Checkbox
              id="private"
              checked={isPrivate}
              onCheckedChange={(checked) => setIsPrivate(Boolean(checked))}
            />
            <Label htmlFor="private" className="cursor-pointer text-xs font-normal flex items-center gap-1.5">
              <Lock className={`h-3 w-3 ${isPrivate ? 'text-amber-500' : 'text-muted-foreground'}`} />
              <span>{t.upload.privateFile}</span>
            </Label>
          </div>
        </div>

        {/* Upload Queue */}
        {queue.length > 0 && (
          <div className="mt-5 space-y-3">
            <Separator />
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t.upload.queueTitle(queue.length)}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQueue([])}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                {t.upload.clearQueue}
              </Button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="p-3 border border-border rounded-md bg-card text-xs space-y-2 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {item.previewUrl ? (
                        <img
                          src={item.previewUrl}
                          alt={item.file.name}
                          className="h-8 w-8 rounded object-cover shrink-0 border border-border"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border">
                          <File className="h-4 w-4" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="text-foreground font-medium truncate max-w-xs sm:max-w-md">
                          {item.file.name}
                        </p>
                        <div className="flex items-center gap-2 text-muted-foreground text-[11px] mt-0.5">
                          <span>{formatBytes(item.file.size)}</span>
                          {item.status === 'uploading' && (
                            <Badge variant="outline" className="text-[10px] py-0">
                              <Loader2 className="h-2.5 w-2.5 animate-spin mr-1" /> {t.upload.uploading}
                            </Badge>
                          )}
                          {item.status === 'success' && (
                            <Badge variant="secondary" className="text-[10px] py-0 text-emerald-500">
                              <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> {t.upload.completed}
                            </Badge>
                          )}
                          {item.status === 'error' && (
                            <Badge variant="destructive" className="text-[10px] py-0">
                              <AlertCircle className="h-2.5 w-2.5 mr-1" /> {item.error}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {item.result && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCopy(item.result!.url, item.id)}
                        className="h-7 text-xs gap-1 shrink-0"
                      >
                        {copiedKey === item.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="text-emerald-500">{t.upload.copied}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>{t.upload.copyUrl}</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {item.status === 'uploading' && (
                    <Progress value={item.progress} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
