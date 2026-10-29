import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Download, FileText, Image as ImageIcon, Calendar, HardDrive, Hash, Code } from 'lucide-react';
import { formatBytes, formatDate } from '../lib/utils';
import type { StorageObject } from '../types';

interface PreviewModalProps {
  object: StorageObject | null;
  onClose: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({ object, onClose }) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [snippetTab, setSnippetTab] = useState<'url' | 'html' | 'markdown' | 'nextjs'>('url');

  if (!object) return null;

  const isImage = object.mimeType.startsWith('image/');
  const fileName = object.key.split('/').pop() || object.key;

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const getSnippet = () => {
    switch (snippetTab) {
      case 'url':
        return object.url;
      case 'html':
        return `<img src="${object.url}" alt="${fileName}" loading="lazy" />`;
      case 'markdown':
        return `![${fileName}](${object.url})`;
      case 'nextjs':
        return `<Image src="${object.url}" alt="${fileName}" width={800} height={600} />`;
      default:
        return object.url;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-4xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2.5 min-w-0">
            {isImage ? (
              <ImageIcon className="w-5 h-5 text-orange-400 shrink-0" />
            ) : (
              <FileText className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <h3 className="text-sm font-semibold text-white truncate max-w-md">
              {fileName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-2 flex-1 overflow-y-auto">
          {/* Left Preview */}
          <div className="p-6 bg-zinc-950/80 flex items-center justify-center border-b md:border-b-0 md:border-r border-zinc-800/80">
            {isImage ? (
              <img
                src={object.url}
                alt={fileName}
                className="max-h-[380px] w-auto max-w-full rounded-xl object-contain shadow-2xl border border-zinc-800"
              />
            ) : (
              <div className="py-20 text-center">
                <FileText className="w-16 h-16 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm font-medium text-zinc-400">{object.mimeType}</p>
                <a
                  href={object.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-white rounded-xl text-xs font-medium transition-colors"
                >
                  <ExternalLink className="w-4 h-4" /> Abrir Documento
                </a>
              </div>
            )}
          </div>

          {/* Right Details */}
          <div className="p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Metadata Items */}
              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Caminho / Storage Key
                  </label>
                  <p className="text-xs font-mono text-zinc-300 bg-zinc-950/60 p-2 rounded-lg border border-zinc-800 mt-1 break-all">
                    {object.key}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5" /> Tamanho
                    </label>
                    <p className="text-xs font-semibold text-white mt-1">
                      {formatBytes(object.size)}
                    </p>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Data de Envio
                    </label>
                    <p className="text-xs font-semibold text-white mt-1">
                      {formatDate(object.uploadedAt)}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" /> MIME Type & ETag
                  </label>
                  <p className="text-xs font-mono text-zinc-400 mt-0.5">
                    {object.mimeType} {object.etag ? `• ${object.etag.slice(0, 12)}...` : ''}
                  </p>
                </div>
              </div>

              {/* Code Snippets Section */}
              <div className="pt-3 border-t border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-orange-400" /> Como Utilizar
                  </label>
                  <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
                    {(['url', 'html', 'markdown', 'nextjs'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setSnippetTab(tab)}
                        className={`px-2 py-0.5 text-[10px] rounded font-medium transition-colors uppercase ${
                          snippetTab === tab
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-300 overflow-x-auto select-all">
                    {getSnippet()}
                  </pre>
                  <button
                    onClick={() => handleCopy(getSnippet(), 'snippet')}
                    className="absolute right-2 top-2 p-1.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-colors"
                    title="Copiar código"
                  >
                    {copiedType === 'snippet' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center gap-2 pt-4 border-t border-zinc-800">
              <button
                onClick={() => handleCopy(object.url, 'url')}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/20 transition-all"
              >
                {copiedType === 'url' ? (
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
              </button>

              <a
                href={object.url}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white rounded-xl transition-colors border border-zinc-700"
                title="Abrir no navegador"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
