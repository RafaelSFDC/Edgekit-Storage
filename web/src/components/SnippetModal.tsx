import React, { useState } from 'react';
import { Copy, Check, Code, Terminal, FileCode } from 'lucide-react';
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

interface SnippetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SnippetModal: React.FC<SnippetModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentOrigin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://storage-api.seudominio.com';

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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle>Integração Copy-Paste</DialogTitle>
              <DialogDescription>
                Zero dependências NPM, use diretamente no seu app TypeScript
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 mt-3">
          <Tabs defaultValue="client" className="flex-1 flex flex-col">
            <TabsList className="w-fit">
              <TabsTrigger value="client" className="gap-1.5">
                <Code className="w-3.5 h-3.5" />
                <span>lib/storage.ts</span>
              </TabsTrigger>
              <TabsTrigger value="usage" className="gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                <span>Exemplo de Uso</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="client" className="relative flex-1 mt-3 min-h-[300px]">
              <div className="relative h-full rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
                <pre className="p-4 text-xs font-mono text-zinc-300 overflow-auto h-full max-h-[350px] select-all">
                  {clientCode}
                </pre>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCopy(clientCode, 'client')}
                  className="absolute top-3 right-3 shadow-md"
                >
                  {copied === 'client' ? (
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
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="usage" className="relative flex-1 mt-3 min-h-[300px]">
              <div className="relative h-full rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
                <pre className="p-4 text-xs font-mono text-zinc-300 overflow-auto h-full max-h-[350px] select-all">
                  {usageCode}
                </pre>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCopy(usageCode, 'usage')}
                  className="absolute top-3 right-3 shadow-md"
                >
                  {copied === 'usage' ? (
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
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="pt-4 border-t border-zinc-800 justify-between items-center sm:justify-between">
          <span className="text-xs text-zinc-400">
            Sem travas de dependência, 100% TypeScript e Fetch nativo.
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
