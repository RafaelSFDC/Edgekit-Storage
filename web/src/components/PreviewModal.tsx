import React, { useState, useEffect } from 'react';
import { Copy, Check, ExternalLink, FileText, Image as ImageIcon, Calendar, Database, Hash, Code2, Lock, Key, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { formatBytes } from '../lib/utils';
import { useI18n } from '../i18n';
import type { StorageObject, SignedUrlResponse } from '../types';

interface PreviewModalProps {
  object: StorageObject | null;
  onClose: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({ object, onClose }) => {
  const { t, formatDate } = useI18n();
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isGeneratingSigned, setIsGeneratingSigned] = useState(false);

  // Reset state whenever object changes
  useEffect(() => {
    setSignedUrl(null);
    setCopiedType(null);
  }, [object?.key]);

  if (!object) return null;

  const isImage = object.mimeType.startsWith('image/');
  const fileName = object.key.split('/').pop() || object.key;

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleGenerateSignedUrl = async () => {
    setIsGeneratingSigned(true);
    try {
      const res = await fetch('/api/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ key: object.key, expiresInSeconds: 3600 }),
      });
      const json: SignedUrlResponse = await res.json();
      if (res.ok && json.success) {
        setSignedUrl(json.data.url);
      }
    } catch {
      // ignore
    } finally {
      setIsGeneratingSigned(false);
    }
  };

  const activeDisplayUrl = signedUrl || object.url;

  const snippets = {
    url: activeDisplayUrl,
    html: `<img src="${activeDisplayUrl}" alt="${fileName}" loading="lazy" />`,
    markdown: `![${fileName}](${activeDisplayUrl})`,
    nextjs: `<Image src="${activeDisplayUrl}" alt="${fileName}" width={800} height={600} />`,
  };

  return (
    <Dialog open={Boolean(object)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border bg-card">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center text-foreground shrink-0">
              {isImage ? (
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate text-base">{fileName}</DialogTitle>
              <DialogDescription className="font-mono text-xs truncate mt-0.5">
                {object.key}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-2 max-h-[75vh] overflow-y-auto">
          {/* Left Preview */}
          <div className="p-6 bg-muted/20 flex items-center justify-center border-b md:border-b-0 md:border-r border-border">
            {isImage ? (
              <img
                src={object.url}
                alt={fileName}
                className="max-h-[350px] w-auto max-w-full rounded-md object-contain border border-border shadow-sm"
              />
            ) : (
              <div className="py-16 text-center space-y-3">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto stroke-[1.25]" />
                <Badge variant="secondary" className="font-normal text-xs">
                  {object.mimeType}
                </Badge>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(object.url, '_blank')}
                    className="gap-1.5"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>{t.previewModal.viewFile}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Details */}
          <div className="p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Metadata Items */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border border-border rounded-lg bg-card space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="h-3 w-3" /> {t.previewModal.size}
                  </span>
                  <p className="text-sm font-semibold text-foreground">
                    {formatBytes(object.size)}
                  </p>
                </div>
                <div className="p-3 border border-border rounded-lg bg-card space-y-1">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" /> {t.previewModal.uploadedAt}
                  </span>
                  <p className="text-sm font-semibold text-foreground">
                    {formatDate(object.uploadedAt)}
                  </p>
                </div>
              </div>

              <div className="p-3 border border-border rounded-lg bg-card space-y-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Hash className="h-3 w-3" /> {t.previewModal.idAndMime}
                </span>
                <p className="text-xs font-mono text-muted-foreground">
                  {object.mimeType} {object.etag ? `• ${object.etag.slice(0, 16)}...` : ''}
                </p>
              </div>

              {/* Private Signed URL Box */}
              {object.isPrivate && (
                <div className="p-3 border border-amber-500/30 rounded-lg bg-amber-500/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-amber-500">
                      <Lock className="h-3.5 w-3.5" />
                      <span>{t.previewModal.privateTitle}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateSignedUrl}
                      disabled={isGeneratingSigned}
                      className="h-7 text-[11px] gap-1 border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
                    >
                      {isGeneratingSigned ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Key className="h-3 w-3" />
                      )}
                      <span>{signedUrl ? t.previewModal.regenerateToken : t.previewModal.generateSignedUrl}</span>
                    </Button>
                  </div>
                  {signedUrl ? (
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground break-all font-mono bg-background/60 p-2 rounded border border-border select-all">
                        {signedUrl}
                      </p>
                      <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
                        <Check className="h-3 w-3" /> {t.previewModal.signedUrlActive}
                      </span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      {t.previewModal.privateExplainer}
                    </p>
                  )}
                </div>
              )}

              <Separator />

              {/* Code Snippets Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Code2 className="h-3.5 w-3.5" />
                  <span>{t.previewModal.snippetsTitle}</span>
                </div>

                <Tabs defaultValue="url">
                  <TabsList className="w-full grid grid-cols-4">
                    <TabsTrigger value="url" className="text-xs">{t.previewModal.tabs.url}</TabsTrigger>
                    <TabsTrigger value="html" className="text-xs">{t.previewModal.tabs.html}</TabsTrigger>
                    <TabsTrigger value="markdown" className="text-xs">{t.previewModal.tabs.markdown}</TabsTrigger>
                    <TabsTrigger value="nextjs" className="text-xs">{t.previewModal.tabs.nextjs}</TabsTrigger>
                  </TabsList>

                  {(['url', 'html', 'markdown', 'nextjs'] as const).map((tab) => (
                    <TabsContent key={tab} value={tab} className="relative mt-2">
                      <pre className="p-3 bg-muted/40 border border-border rounded-md text-xs font-mono text-foreground overflow-x-auto select-all pr-10">
                        {snippets[tab]}
                      </pre>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopy(snippets[tab], tab)}
                        className="absolute right-1.5 top-1.5 h-7 w-7 text-muted-foreground hover:text-foreground"
                        title={t.previewModal.copySnippet}
                      >
                        {copiedType === tab ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            </div>

            {/* Bottom Actions Footer */}
            <DialogFooter className="pt-4 border-t border-border flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(activeDisplayUrl, '_blank')}
                className="gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>{t.previewModal.open}</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => handleCopy(activeDisplayUrl, 'url-main')}
                className="flex-1 gap-1.5"
              >
                {copiedType === 'url-main' ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>{signedUrl ? t.previewModal.signedUrlCopied : t.previewModal.urlCopied}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>
                      {signedUrl
                        ? t.previewModal.copySignedUrl
                        : object.isPrivate
                        ? t.previewModal.copyPrivateLink
                        : t.previewModal.copyPublicUrl}
                    </span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
