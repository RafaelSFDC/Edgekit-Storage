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
    const cleanKey = key.replace(/^\/+/, '').replace(/^private\//, '');
    return `${workerBase}/private/${cleanKey}`;
  }

  // If a direct public URL is configured (R2 custom domain or r2.dev), use it!
  if (publicUrlConfig && publicUrlConfig.trim() !== '') {
    const base = publicUrlConfig.trim().replace(/\/+$/, '');
    return `${base}/${key}`;
  }

  // Fallback: worker public stream route
  return `${workerBase}/f/${key}`;
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
export function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Generates an HMAC-SHA256 signature token for a file key and expiration timestamp.
 */
export async function generateSignedToken(
  key: string,
  secret: string,
  expiresAt: number
): Promise<string> {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const cleanKey = key.replace(/^\/+/, '').replace(/^private\//, '');
  const data = enc.encode(`${cleanKey}:${expiresAt}`);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verifies an HMAC-SHA256 signature token and checks expiration.
 */
export async function verifySignedToken(
  key: string,
  secret: string,
  token: string,
  expiresAt: number
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  if (now > expiresAt) {
    return false;
  }

  const expectedToken = await generateSignedToken(key, secret, expiresAt);
  return timingSafeEqualStr(token, expectedToken);
}

/**
 * Builds a signed URL for a private file with an expiration timestamp.
 */
export async function buildSignedUrl(
  key: string,
  secret: string,
  requestUrl: string,
  expiresInSeconds = 3600
): Promise<{ url: string; expiresAt: number; token: string }> {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const token = await generateSignedToken(key, secret, expiresAt);

  const parsedRequest = new URL(requestUrl);
  const workerBase = `${parsedRequest.protocol}//${parsedRequest.host}`;
  const cleanKey = key.replace(/^\/+/, '').replace(/^private\//, '');
  const url = `${workerBase}/private/${cleanKey}?token=${token}&expires=${expiresAt}`;

  return { url, expiresAt, token };
}

/**
 * Generates an HMAC-SHA256 signature token specifically for presigned uploads.
 * Uses an 'upload:' domain prefix to prevent download tokens from being reused as upload tokens.
 */
export async function generateSignedUploadToken(
  key: string,
  secret: string,
  expiresAt: number
): Promise<string> {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const cleanKey = key.replace(/^\/+/, '');
  const data = enc.encode(`upload:${cleanKey}:${expiresAt}`);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verifies an HMAC-SHA256 signature token for presigned uploads.
 */
export async function verifySignedUploadToken(
  key: string,
  secret: string,
  token: string,
  expiresAt: number
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  if (now > expiresAt) {
    return false;
  }

  const expectedToken = await generateSignedUploadToken(key, secret, expiresAt);
  return timingSafeEqualStr(token, expectedToken);
}

/**
 * Builds a presigned upload URL for direct client-to-storage uploads.
 */
export async function buildPresignedUploadUrl(options: {
  key: string;
  secret: string;
  requestUrl: string;
  expiresInSeconds?: number;
}): Promise<{ uploadUrl: string; expiresAt: number; token: string }> {
  const { key, secret, requestUrl, expiresInSeconds = 600 } = options;
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const cleanKey = key.replace(/^\/+/, '');
  const token = await generateSignedUploadToken(cleanKey, secret, expiresAt);

  const parsedRequest = new URL(requestUrl);
  const workerBase = `${parsedRequest.protocol}//${parsedRequest.host}`;
  const uploadUrl = `${workerBase}/upload/presigned/${cleanKey}?token=${token}&expires=${expiresAt}`;

  return { uploadUrl, expiresAt, token };
}
