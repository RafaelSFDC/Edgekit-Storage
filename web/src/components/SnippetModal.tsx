import React, { useState } from 'react';
import { X, Copy, Check, Code, Terminal, FileCode } from 'lucide-react';

interface SnippetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SnippetModal: React.FC<SnippetModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [tab, setTab] = useState<'client' | 'usage'>('client');

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://storage-api.seudominio.com';

  const clientCode = `/**
 * Cloudflare Storage Client (Zero-Dependency)
 * Salve este arquivo em lib/storage.ts
 */

export interface StorageConfig {
  baseUrl: string;
  apiKey: string;
}

export interface UploadOptions {
  folder?: string;
  preserveName?: boolean;
  customName?: string;
  private?: boolean;
}

export function createStorageClient(config: StorageConfig) {
  const baseUrl = config.baseUrl.replace(/\\/+$/, '');
  const authHeaders = { 'X-API-Key': config.apiKey.trim() };

  return {
    async upload(file: File | Blob, options: UploadOptions = {}) {
      const formData = new FormData();
      formData.append('file', file);
      if (options.folder) formData.append('folder', options.folder);
      if (options.preserveName) formData.append('preserveName', 'true');
      if (options.customName) formData.append('customName', options.customName);
      if (options.private) formData.append('private', 'true');

      const res = await fetch(\`\${baseUrl}/upload\`, {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Falha no upload');
      }
      return json.data;
    },

    async delete(key: string) {
      const res = await fetch(\`\${baseUrl}/api/files/\${encodeURIComponent(key)}\`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const json = await res.json();
      return json.success;
    },

    async list(options: { limit?: number; cursor?: string; prefix?: string } = {}) {
      const params = new URLSearchParams();
      if (options.limit) params.set('limit', String(options.limit));
      if (options.prefix) params.set('prefix', options.prefix);
      const res = await fetch(\`\${baseUrl}/api/files?\${params.toString()}\`, {
        method: 'GET',
        headers: authHeaders,
      });
      const json = await res.json();
      return json.data;
    },
  };
}
`;

  const usageCode = `import { createStorageClient } from '@/lib/storage';

const storage = createStorageClient({
  baseUrl: process.env.STORAGE_BASE_URL || '${currentOrigin}',
  apiKey: process.env.STORAGE_API_KEY!,
});

// Exemplo: Upload no Next.js Server Action ou Route Handler
export async function uploadAvatar(formData: FormData) {
  const file = formData.get('file') as File;
  
  const uploaded = await storage.upload(file, {
    folder: 'avatars',
    preserveName: true,
  });

  console.log('URL da Imagem:', uploaded.url);
  console.log('Chave:', uploaded.key);
  return uploaded;
}
`;

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 relative overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Integração Copy-Paste</h2>
              <p className="text-xs text-zinc-400">Zero dependências NPM, use diretamente no seu app</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => setTab('client')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              tab === 'client'
                ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30'
                : 'text-zinc-400 hover:text-white bg-zinc-950 border border-zinc-800'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>lib/storage.ts</span>
          </button>
          <button
            onClick={() => setTab('usage')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              tab === 'usage'
                ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30'
                : 'text-zinc-400 hover:text-white bg-zinc-950 border border-zinc-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Exemplo de Uso</span>
          </button>
        </div>

        {/* Code Box */}
        <div className="mt-3 relative flex-1 min-h-[300px] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
          <pre className="p-4 text-xs font-mono text-zinc-300 overflow-auto h-full select-all">
            {tab === 'client' ? clientCode : usageCode}
          </pre>
          <button
            onClick={() => handleCopy(tab === 'client' ? clientCode : usageCode, tab)}
            className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/90 hover:bg-zinc-700 text-white rounded-lg text-xs font-medium shadow-md transition-all border border-zinc-700"
          >
            {copied === tab ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Código</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <span>Sem travas de dependência, 100% TypeScript e Fetch nativo.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-white rounded-lg font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
