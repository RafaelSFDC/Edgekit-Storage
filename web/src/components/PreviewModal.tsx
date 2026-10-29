import React, { useState } from 'react';
import { Copy, Check, ExternalLink, FileText, Image as ImageIcon, Calendar, HardDrive, Hash, Code } from 'lucide-react';
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
import { formatBytes, formatDate } from '../lib/utils';
import type { StorageObject } from '../types';

interface PreviewModalProps {
  object: StorageObject | null;
  onClose: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({ object, onClose }) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!object) return null;

  const isImage = object.mimeType.startsWith('image/');
  const fileName = object.key.split('/').pop() || object.key;

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const snippets = {
    url: object.url,
    html: `<img src="${object.url}" alt="${fileName}" loading="lazy" />`,
    markdown: `![${fileName}](${object.url})`,
    nextjs: `<Image src="${object.url}" alt="${fileName}" width={800} height={600} />`,
  };

  return (
    <Dialog open={Boolean(object)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2.5 min-w-0">
            {isImage ? (
              <ImageIcon className="w-5 h-5 text-orange-400 shrink-0" />
            ) : (
              <FileText className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <div>
              <DialogTitle className="truncate max-w-lg">{fileName}</DialogTitle>
              <DialogDescription className="font-mono text-[11px] truncate mt-0.5">
                {object.key}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-2 max-h-[75vh] overflow-y-auto">
          {/* Left Preview */}
          <div className="p-6 bg-zinc-950/80 flex items-center justify-center border-b md:border-b-0 md:border-r border-zinc-800/80">
            {isImage ? (
              <img
                src={object.url}
                alt={fileName}
                className="max-h-[350px] w-auto max-w-full rounded-xl object-contain shadow-2xl border border-zinc-800"
              />
            ) : (
              <div className="py-16 text-center">
                <FileText className="w-16 h-16 text-zinc-600 mx-auto mb-3" />
                <Badge variant="secondary" className="mb-3">
                  {object.mimeType}
                </Badge>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(object.url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-1.5" /> Abrir Documento
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Details */}
          <div className="p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Metadata Items */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-orange-400" /> Tamanho
                    </span>
                    <p className="text-xs font-semibold text-white mt-1">
                      {formatBytes(object.size)}
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" /> Data de Envio
                    </span>
                    <p className="text-xs font-semibold text-white mt-1">
                      {formatDate(object.uploadedAt)}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-blue-400" /> MIME Type & ETag
                  </span>
                  <p className="text-xs font-mono text-zinc-300 mt-1">
                    {object.mimeType} {object.etag ? `• ${object.etag.slice(0, 14)}...` : ''}
                  </p>
                </div>
              </div>

              {/* Code Snippets Section */}
              <div className="pt-2">
                <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-zinc-300">
                  <Code className="w-4 h-4 text-orange-400" />
                  <span>Snippets de Integração</span>
                </div>

                <Tabs defaultValue="url">
                  <TabsList className="w-full grid grid-cols-4">
                    <TabsTrigger value="url">URL</TabsTrigger>
                    <TabsTrigger value="html">HTML</TabsTrigger>
                    <TabsTrigger value="markdown">MD</TabsTrigger>
                    <TabsTrigger value="nextjs">Next.js</TabsTrigger>
                  </TabsList>

                  {(['url', 'html', 'markdown', 'nextjs'] as const).map((tab) => (
                    <TabsContent key={tab} value={tab} className="relative mt-2">
                      <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-300 overflow-x-auto select-all pr-10">
                        {snippets[tab]}
                      </pre>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopy(snippets[tab], tab)}
                        className="absolute right-2 top-2 h-7 w-7 text-zinc-400 hover:text-white"
                        title="Copiar snippet"
                      >
                        {copiedType === tab ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            </div>

            {/* Bottom Actions Footer */}
            <DialogFooter className="pt-4 border-t border-zinc-800 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(object.url, '_blank')}
                className="gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => handleCopy(object.url, 'url-main')}
                className="flex-1"
              >
                {copiedType === 'url-main' ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>URL Copiada!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar URL Pública</span>
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
