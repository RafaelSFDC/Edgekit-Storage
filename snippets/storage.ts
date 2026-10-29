/**
 * EdgeKit Storage Client (Zero-Dependency Copy-Paste Snippet)
 * 
 * Copy this file directly into your project (e.g., `lib/edgekit-storage.ts`).
 * Works natively with Fetch in Node.js 18+, Next.js, Astro, Remix, Vite, Bun, and Deno.
 */

export interface StorageConfig {
  /**
   * Base URL of your EdgeKit Storage Worker
   * Example: "https://storage-api.yourdomain.com" or "http://localhost:8787"
   */
  baseUrl: string;

  /**
   * Secret API Key configured in your Worker
   */
  apiKey: string;
}

export interface UploadOptions {
  /** Subfolder in the bucket (e.g. "avatars", "products", "blog/2026") */
  folder?: string;
  /** If true, keeps original filename prefixed by unique ID */
  preserveName?: boolean;
  /** Exact custom name/path for the file */
  customName?: string;
  /** If true, saves to private folder accessible only with API Key or Signed URL */
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
     * Uploads a file (File, Blob, or Buffer) to Cloudflare R2
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
        throw new Error(json.error?.message || `Upload failed (Status ${res.status})`);
      }

      return json.data;
    },

    /**
     * Deletes a file from the bucket by its key
     */
    async delete(key: string): Promise<boolean> {
      const cleanKey = key.replace(/^\/+/, '');
      const res = await fetch(`${baseUrl}/api/files/${encodeURIComponent(cleanKey)}`, {
        method: 'DELETE',
        headers: authHeaders,
      });

      const json = await res.json() as { success: boolean; error?: { message: string } };

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || `Failed to delete file (Status ${res.status})`);
      }

      return true;
    },

    /**
     * Deletes multiple files from the bucket in a single request (batch delete)
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
        throw new Error(json.error?.message || `Failed to batch delete files (Status ${res.status})`);
      }

      return true;
    },

    /**
     * Generates a temporary HMAC-SHA256 signed URL for secure private file access.
     * Can be safely handed to frontend users without exposing the API Key.
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
        throw new Error(json.error?.message || `Failed to generate signed URL (Status ${res.status})`);
      }

      return json.data;
    },

    /**
     * Lists files in the R2 bucket with cursor pagination and prefix filtering
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
        throw new Error(json.error?.message || `Failed to list files (Status ${res.status})`);
      }

      return json.data;
    },

    /**
     * Retrieves metadata for a specific file without downloading its body
     */
    async getMeta(key: string): Promise<StorageFile> {
      const cleanKey = key.replace(/^\/+/, '');
      const res = await fetch(`${baseUrl}/api/files/${encodeURIComponent(cleanKey)}/meta`, {
        method: 'GET',
        headers: authHeaders,
      });

      const json = await res.json() as { success: boolean; data: StorageFile; error?: { message: string } };

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || `File not found (Status ${res.status})`);
      }

      return json.data;
    },
  };
}
