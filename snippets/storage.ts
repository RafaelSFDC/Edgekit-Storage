/**
 * EdgeKit Storage Client (Zero-Dependency Copy-Paste Snippet)
 * 
 * Copie este arquivo diretamente para o seu projeto (ex: `lib/edgekit-storage.ts`).
 * Funciona nativamente com Fetch no Node.js 18+, Next.js, Astro, Remix, Vite, Bun e Deno.
 */

export interface StorageConfig {
  /**
   * URL base do seu Worker EdgeKit Storage
   * Exemplo: "https://storage-api.seudominio.com" ou "http://localhost:8787"
   */
  baseUrl: string;

  /**
   * Sua API Key secreta configurada no Worker
   */
  apiKey: string;
}

export interface UploadOptions {
  /** Subpasta no bucket (ex: "avatars", "produtos", "blog/2026") */
  folder?: string;
  /** Se true, mantém o nome original precedido por um identificador único */
  preserveName?: boolean;
  /** Nome exato personalizado para o arquivo */
  customName?: string;
  /** Se true, salva em pasta privada acessível apenas com API Key */
  private?: boolean;
}

export interface StorageFile {
  key: string;
  url: string;
  size: number;
  mimeType: string;
  originalName?: string;
  isPrivate?: boolean;
  uploadedAt: string;
  etag?: string;
}

export interface ListOptions {
  limit?: number;
  cursor?: string;
  prefix?: string;
}

export interface ListResult {
  objects: StorageFile[];
  truncated: boolean;
  cursor: string | null;
}

export function createStorageClient(config: StorageConfig) {
  const baseUrl = config.baseUrl.replace(/\/+$/, '');
  const apiKey = config.apiKey.trim();

  const authHeaders = {
    'X-API-Key': apiKey,
  };

  return {
    /**
     * Envia um arquivo (File, Blob ou Buffer) para o Cloudflare R2
     */
    async upload(
      file: File | Blob,
      options: UploadOptions = {}
    ): Promise<StorageFile> {
      const formData = new FormData();
      formData.append('file', file);

      if (options.folder) formData.append('folder', options.folder);
      if (options.preserveName) formData.append('preserveName', 'true');
      if (options.customName) formData.append('customName', options.customName);
      if (options.private) formData.append('private', 'true');

      const res = await fetch(`${baseUrl}/upload`, {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });

      const json = await res.json() as { success: boolean; data: StorageFile; error?: { message: string } };

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || `Falha no upload (Status ${res.status})`);
      }

      return json.data;
    },

    /**
     * Exclui um arquivo do bucket pelo seu caminho/key
     */
    async delete(key: string): Promise<boolean> {
      const cleanKey = key.replace(/^\/+/, '');
      const res = await fetch(`${baseUrl}/api/files/${encodeURIComponent(cleanKey)}`, {
        method: 'DELETE',
        headers: authHeaders,
      });

      const json = await res.json() as { success: boolean; error?: { message: string } };

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || `Falha ao deletar arquivo (Status ${res.status})`);
      }

      return true;
    },

    /**
     * Exclui múltiplos arquivos do bucket de uma só vez (deleção em lote)
     */
    async deleteMany(keys: string[]): Promise<boolean> {
      const res = await fetch(`${baseUrl}/api/files/batch-delete`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keys }),
      });

      const json = await res.json() as { success: boolean; error?: { message: string } };

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || `Falha ao deletar arquivos em lote (Status ${res.status})`);
      }

      return true;
    },

    /**
     * Gera uma URL temporária assinada com HMAC para acesso seguro a arquivo privado.
     * Pode ser entregue com segurança ao frontend/usuário final sem expor a API Key.
     */
    async getSignedUrl(
      key: string,
      options: { expiresInSeconds?: number } = {}
    ): Promise<{ url: string; key: string; expiresAt: number; expiresInSeconds: number }> {
      const res = await fetch(`${baseUrl}/api/signed-url`, {
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

      const json = await res.json() as {
        success: boolean;
        data: { url: string; key: string; expiresAt: number; expiresInSeconds: number };
        error?: { message: string };
      };

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || `Falha ao gerar URL assinada (Status ${res.status})`);
      }

      return json.data;
    },

    /**
     * Lista arquivos no bucket R2 com paginação e filtro por prefixo
     */
    async list(options: ListOptions = {}): Promise<ListResult> {
      const params = new URLSearchParams();
      if (options.limit) params.set('limit', String(options.limit));
      if (options.cursor) params.set('cursor', options.cursor);
      if (options.prefix) params.set('prefix', options.prefix);

      const url = `${baseUrl}/api/files${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: authHeaders,
      });

      const json = await res.json() as { success: boolean; data: ListResult; error?: { message: string } };

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || `Falha ao listar arquivos (Status ${res.status})`);
      }

      return json.data;
    },

    /**
     * Obtém metadados de um arquivo específico sem baixar o conteúdo
     */
    async getMeta(key: string): Promise<StorageFile> {
      const cleanKey = key.replace(/^\/+/, '');
      const res = await fetch(`${baseUrl}/api/files/${encodeURIComponent(cleanKey)}/meta`, {
        method: 'GET',
        headers: authHeaders,
      });

      const json = await res.json() as { success: boolean; data: StorageFile; error?: { message: string } };

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || `Arquivo não encontrado (Status ${res.status})`);
      }

      return json.data;
    },
  };
}
