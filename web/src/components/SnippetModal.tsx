import React, { useState } from 'react';
import { Copy, Check, Code2, Terminal, Layers } from 'lucide-react';
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
import { useI18n } from '../i18n';

interface SnippetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SnippetModal: React.FC<SnippetModalProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentOrigin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://storage-api.yourdomain.com';

  const clientCode = `/**
 * EdgeKit Storage Client (Zero-Dependency)
 * Save to lib/edgekit-storage.ts
 */

export interface EdgeKitConfig {
  baseUrl: string;
  apiKey: string;
}

export interface UploadOptions {
  folder?: string;
  preserveName?: boolean;
  customName?: string;
  private?: boolean;
}

export function createEdgeKitStorage(config: EdgeKitConfig) {
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
        throw new Error(json.error?.message || 'Upload failed');
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

    async deleteMany(keys: string[]) {
      const res = await fetch(\`\${baseUrl}/api/files/batch-delete\`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keys }),
      });
      const json = await res.json();
      return json.success;
    },

    async getSignedUrl(key: string, options: { expiresInSeconds?: number } = {}) {
      const res = await fetch(\`\${baseUrl}/api/signed-url\`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key,
          expiresInSeconds: options.expiresInSeconds || 3600,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to generate signed URL');
      }
      return json.data;
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

  const usageCode = `import { createEdgeKitStorage } from '@/lib/edgekit-storage';

const storage = createEdgeKitStorage({
  baseUrl: process.env.EDGEKIT_STORAGE_URL || '${currentOrigin}',
  apiKey: process.env.EDGEKIT_STORAGE_API_KEY!,
});

// Example: Upload in Next.js Server Action or Route Handler
export async function uploadAvatar(formData: FormData) {
  const file = formData.get('file') as File;
  
  const uploaded = await storage.upload(file, {
    folder: 'avatars',
    preserveName: true,
  });

  console.log('File URL:', uploaded.url);
  console.log('R2 Key:', uploaded.key);
  return uploaded;
}

// Example: Generate temporary signed link for private file
export async function getPrivateInvoiceUrl(invoiceKey: string) {
  const { url } = await storage.getSignedUrl(invoiceKey, {
    expiresInSeconds: 3600, // 1 hour
  });
  return url;
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
            <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center text-foreground">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle>{t.snippetModal.title}</DialogTitle>
              <DialogDescription>
                {t.snippetModal.subtitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 mt-3">
          <Tabs defaultValue="client" className="flex-1 flex flex-col">
            <TabsList className="w-fit">
              <TabsTrigger value="client" className="gap-1.5 text-xs">
                <Code2 className="h-3.5 w-3.5" />
                <span>{t.snippetModal.tabClient}</span>
              </TabsTrigger>
              <TabsTrigger value="usage" className="gap-1.5 text-xs">
                <Terminal className="h-3.5 w-3.5" />
                <span>{t.snippetModal.tabUsage}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="client" className="relative flex-1 mt-3 min-h-[300px]">
              <div className="relative h-full rounded-md border border-border bg-muted/30 overflow-hidden">
                <pre className="p-4 text-xs font-mono text-foreground overflow-auto h-full max-h-[350px] select-all">
                  {clientCode}
                </pre>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCopy(clientCode, 'client')}
                  className="absolute top-2.5 right-2.5 shadow-sm text-xs gap-1"
                >
                  {copied === 'client' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-emerald-500">{t.snippetModal.copied}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>{t.snippetModal.copyCode}</span>
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="usage" className="relative flex-1 mt-3 min-h-[300px]">
              <div className="relative h-full rounded-md border border-border bg-muted/30 overflow-hidden">
                <pre className="p-4 text-xs font-mono text-foreground overflow-auto h-full max-h-[350px] select-all">
                  {usageCode}
                </pre>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCopy(usageCode, 'usage')}
                  className="absolute top-2.5 right-2.5 shadow-sm text-xs gap-1"
                >
                  {copied === 'usage' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-emerald-500">{t.snippetModal.copied}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>{t.snippetModal.copyCode}</span>
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="pt-4 border-t border-border flex items-center justify-between sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {t.snippetModal.footerText}
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            {t.snippetModal.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
