import { nanoid } from 'nanoid';
import { getExtensionFromFilename } from './mime';

export interface GenerateKeyOptions {
  filename: string;
  folder?: string;
  preserveName?: boolean;
  customName?: string;
  isPrivate?: boolean;
}

/**
 * Sanitizes a path component removing dangerous characters and path traversal attempts.
 */
export function sanitizeSegment(segment: string): string {
  return segment
    .replace(/\\/g, '/')
    .replace(/\.\.+/g, '') // remove ..
    .replace(/[^\w\d\-_./]/gi, '_') // only allow alphanumeric, dashes, underscores, dots, slashes
    .replace(/\/+/g, '/') // replace multiple slashes with single slash
    .replace(/^\/+|\/+$/g, ''); // trim leading and trailing slashes
}

/**
 * Generates a storage key for Cloudflare R2.
 * Structure: [private/][folder/][YYYY/MM/][id].[ext]
 */
export function generateStorageKey(options: GenerateKeyOptions): string {
  const parts: string[] = [];

  // Prefix with 'private/' if marked as private
  if (options.isPrivate) {
    parts.push('private');
  }

  // Include custom folder if provided
  if (options.folder) {
    const cleanFolder = sanitizeSegment(options.folder);
    if (cleanFolder) {
      parts.push(cleanFolder);
    }
  }

  // If a full customName is specified, use it directly (sanitized)
  if (options.customName) {
    const cleanCustom = sanitizeSegment(options.customName);
    parts.push(cleanCustom);
    return parts.join('/');
  }

  // Add date partition (YYYY/MM)
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  parts.push(`${year}/${month}`);

  const id = nanoid(10);
  const ext = getExtensionFromFilename(options.filename);
  const extSuffix = ext ? `.${ext}` : '';

  if (options.preserveName) {
    // Keep sanitized original base name with id prefix to prevent collisions
    const baseName = sanitizeSegment(
      options.filename.replace(/\.[^/.]+$/, '')
    );
    parts.push(`${id}_${baseName}${extSuffix}`);
  } else {
    parts.push(`${id}${extSuffix}`);
  }

  return parts.join('/');
}

/**
 * Builds the full public or private URL for a given key.
 */
export function resolveFileUrl(
  key: string,
  requestUrl: string,
  publicUrlConfig?: string,
  isPrivate?: boolean
): string {
  const parsedRequest = new URL(requestUrl);
  const workerBase = `${parsedRequest.protocol}//${parsedRequest.host}`;

  // If the file is private, it must be accessed via Worker private route
  if (isPrivate) {
    return `${workerBase}/private/${key}`;
  }

  // If a direct public URL is configured (R2 custom domain or r2.dev), use it!
  if (publicUrlConfig && publicUrlConfig.trim() !== '') {
    const base = publicUrlConfig.trim().replace(/\/+$/, '');
    return `${base}/${key}`;
  }

  // Fallback: worker public stream route
  return `${workerBase}/f/${key}`;
}
