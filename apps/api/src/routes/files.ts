import { Hono } from 'hono';
import type { AppContext } from '../env';
import { apiKeyAuth } from '../middleware/auth';
import { apiError, apiSuccess } from '../utils/response';
import { resolveFileUrl, verifySignedToken, buildSignedUrl } from '../utils/keys';
import { resolveMimeType } from '../utils/mime';
import { dispatchWebhookEvent } from '../services/webhook-dispatcher';

export const filesRouter = new Hono<AppContext>();

// ==========================================
// 1. PUBLIC STREAM FALLBACK: GET /f/:key+
// ==========================================
filesRouter.get('/f/:key{.*}', async (c) => {
  if (c.env.ENABLE_WORKER_FALLBACK_STREAM === 'false') {
    return apiError(
      c,
      'Direct worker streaming is disabled. Access the file through the public R2 domain.',
      403
    );
  }

  const key = c.req.param('key');
  if (!key) {
    return apiError(c, 'File key is required', 400);
  }

  // Prevent accessing files in private/ via public route
  if (key.startsWith('private/') || key === 'private') {
    return apiError(c, 'Access denied: File is private', 403);
  }

  let object: R2Object | R2ObjectBody | null;
  try {
    object = await c.env.BUCKET.get(key, {
      onlyIf: c.req.raw.headers,
      range: c.req.raw.headers,
    });
  } catch {
    // If conditional headers fail to parse (e.g. unquoted etag in dev), fetch directly
    object = await c.env.BUCKET.get(key);
  }

  if (!object) {
    return apiError(c, 'File not found', 404);
  }

  // Handle conditional request (304 Not Modified)
  if (!('body' in object)) {
    return new Response(null, {
      status: 304,
      headers: {
        etag: object.httpEtag,
      },
    });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  // Fallback content-type if missing or generic
  const resolvedMime = resolveMimeType(key, object.httpMetadata?.contentType);
  if (!headers.get('content-type') || headers.get('content-type') === 'application/octet-stream') {
    headers.set('content-type', resolvedMime);
  }

  // Support forced download via ?download=true or custom name ?filename=custom.pdf
  const isDownload = c.req.query('download') === 'true' || c.req.query('download') === '1';
  const customFilename = c.req.query('filename');
  if (isDownload || customFilename) {
    const rawName = customFilename || object.customMetadata?.originalName || key.split('/').pop() || 'download';
    // Clean filename of quotes and unsafe characters
    const safeName = rawName.replace(/["\r\n]/g, '_');
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(safeName)}"; filename*=UTF-8''${encodeURIComponent(safeName)}`);
  }

  // Trigger file.downloaded webhook asynchronously via waitUntil
  dispatchWebhookEvent(c, 'file.downloaded', {
    key,
    size: object.size,
    mimeType: object.httpMetadata?.contentType || 'application/octet-stream',
    isPrivate: false,
    url: resolveFileUrl(key, c.req.url, c.env.PUBLIC_URL, false),
    isSignedUrl: false,
    customMetadata: object.customMetadata,
  });

  return new Response(object.body, {
    headers,
  });
});

// ==========================================
// 2. PROTECTED STREAM: GET /private/:key+
// Supports both signed URL tokens (?token=...&expires=...) and API key authentication.
// ==========================================
filesRouter.get(
  '/private/:key{.*}',
  async (c, next) => {
    const token = c.req.query('token');
    const expires = c.req.query('expires');

    if (token && expires) {
      const key = c.req.param('key') || '';
      const fullKey = key.startsWith('private/') ? key : `private/${key}`;
      const expiresNum = Number(expires);

      if (!isNaN(expiresNum)) {
        const isValid =
          (await verifySignedToken(fullKey, c.env.API_KEY, token, expiresNum)) ||
          (await verifySignedToken(key, c.env.API_KEY, token, expiresNum));

        if (isValid) {
          // Token is valid and unexpired; allow access without API key
          return next();
        }
      }

      return apiError(c, 'Forbidden: Invalid or expired signed URL', 403);
    }

    // Fall back to standard API key authentication (headers or cookie)
    return apiKeyAuth()(c, next);
  },
  async (c) => {
    const key = c.req.param('key');
    if (!key) {
      return apiError(c, 'File key is required', 400);
    }

    // Auto-prepend private/ if not present
    const fullKey = key.startsWith('private/') ? key : `private/${key}`;

    let object: R2Object | R2ObjectBody | null;
    try {
      object = await c.env.BUCKET.get(fullKey, {
        onlyIf: c.req.raw.headers,
        range: c.req.raw.headers,
      });
    } catch {
      // If conditional headers fail to parse (e.g. unquoted etag in dev), fetch directly
      object = await c.env.BUCKET.get(fullKey);
    }

    if (!object) {
      return apiError(c, 'Private file not found', 404);
    }

    if (!('body' in object)) {
      return new Response(null, {
        status: 304,
        headers: {
          etag: object.httpEtag,
        },
      });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'private, no-cache, no-store');

    // Fallback content-type if missing or generic
    const resolvedMime = resolveMimeType(fullKey, object.httpMetadata?.contentType);
    if (!headers.get('content-type') || headers.get('content-type') === 'application/octet-stream') {
      headers.set('content-type', resolvedMime);
    }

    // Support forced download via ?download=true or custom name ?filename=custom.pdf
    const isDownload = c.req.query('download') === 'true' || c.req.query('download') === '1';
    const customFilename = c.req.query('filename');
    if (isDownload || customFilename) {
      const rawName = customFilename || object.customMetadata?.originalName || key.split('/').pop() || 'download';
      const safeName = rawName.replace(/["\r\n]/g, '_');
      headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(safeName)}"; filename*=UTF-8''${encodeURIComponent(safeName)}`);
    }

    // Trigger file.downloaded webhook asynchronously via waitUntil
    const token = c.req.query('token');
    const expires = c.req.query('expires');
    dispatchWebhookEvent(c, 'file.downloaded', {
      key: fullKey,
      size: object.size,
      mimeType: resolvedMime,
      isPrivate: true,
      url: resolveFileUrl(fullKey, c.req.url, c.env.PUBLIC_URL, true),
      isSignedUrl: Boolean(token && expires),
      expiresAt: expires ? Number(expires) : undefined,
      customMetadata: object.customMetadata,
    });

    return new Response(object.body, {
      headers,
    });
  }
);

// ==========================================
// 3. LIST FILES: GET /api/files
// ==========================================
filesRouter.get('/api/files', apiKeyAuth(), async (c) => {
  const limit = Math.min(Number(c.req.query('limit') || '20'), 100);
  const cursor = c.req.query('cursor');
  const prefix = c.req.query('prefix');
  const delimiter = c.req.query('delimiter');

  try {
    const listed = await c.env.BUCKET.list({
      limit,
      cursor,
      prefix,
      delimiter,
      include: ['httpMetadata', 'customMetadata'],
    });

    const objects = listed.objects.map((obj) => {
      const isPrivate = obj.key.startsWith('private/');
      const mimeType = resolveMimeType(obj.key, obj.httpMetadata?.contentType);
      return {
        key: obj.key,
        size: obj.size,
        uploadedAt: obj.uploaded.toISOString(),
        mimeType,
        url: resolveFileUrl(obj.key, c.req.url, c.env.PUBLIC_URL, isPrivate),
        etag: obj.httpEtag,
        isPrivate,
      };
    });

    return apiSuccess(c, {
      objects,
      truncated: listed.truncated,
      cursor: listed.truncated ? listed.cursor : null,
      delimitedPrefixes: listed.delimitedPrefixes,
    });
  } catch (err) {
    console.error('[List Error]:', err);
    return apiError(c, 'Failed to list files from R2 storage', 500);
  }
});

// ==========================================
// 4. FILE METADATA: GET /api/files/:key+/meta
// ==========================================
filesRouter.get('/api/files/:key{.*}/meta', apiKeyAuth(), async (c) => {
  const key = c.req.param('key');
  if (!key) {
    return apiError(c, 'File key is required', 400);
  }

  const head = await c.env.BUCKET.head(key);
  if (!head) {
    return apiError(c, 'File not found', 404);
  }

  const isPrivate = key.startsWith('private/');
  const mimeType = resolveMimeType(head.key, head.httpMetadata?.contentType);
  return apiSuccess(c, {
    key: head.key,
    size: head.size,
    uploadedAt: head.uploaded.toISOString(),
    mimeType,
    url: resolveFileUrl(head.key, c.req.url, c.env.PUBLIC_URL, isPrivate),
    etag: head.httpEtag,
    customMetadata: head.customMetadata,
    isPrivate,
  });
});

// ==========================================
// 5. DELETE FILE: DELETE /api/files/:key+
// ==========================================
filesRouter.delete('/api/files/:key{.*}', apiKeyAuth(), async (c) => {
  const key = c.req.param('key');
  if (!key) {
    return apiError(c, 'File key is required', 400);
  }

  try {
    await c.env.BUCKET.delete(key);
    dispatchWebhookEvent(c, 'file.deleted', { key });
    return apiSuccess(c, {
      message: 'File deleted successfully',
      key,
    });
  } catch (err) {
    console.error(`[Delete Error] Failed deleting key ${key}:`, err);
    return apiError(c, 'Failed to delete file from R2 storage', 500);
  }
});

// ==========================================
// 6. BATCH DELETE: POST /api/files/batch-delete
// ==========================================
filesRouter.post('/api/files/batch-delete', apiKeyAuth(), async (c) => {
  let body: { keys?: string[] };
  try {
    body = await c.req.json();
  } catch {
    return apiError(c, 'Invalid JSON body. Expected { keys: string[] }', 400);
  }

  const { keys } = body;
  if (!Array.isArray(keys) || keys.length === 0) {
    return apiError(c, 'Field "keys" must be a non-empty array of file keys', 400);
  }

  const validKeys = keys.filter((k) => typeof k === 'string' && k.trim() !== '');
  if (validKeys.length === 0) {
    return apiError(c, 'No valid file keys provided', 400);
  }

  try {
    await c.env.BUCKET.delete(validKeys);
    for (const k of validKeys) {
      dispatchWebhookEvent(c, 'file.deleted', { key: k });
    }
    return apiSuccess(c, {
      message: 'Files deleted successfully',
      count: validKeys.length,
      keys: validKeys,
    });
  } catch (err) {
    console.error('[Batch Delete Error]:', err);
    return apiError(c, 'Failed to delete files from R2 storage', 500);
  }
});

// ==========================================
// 7. GENERATE SIGNED URL: POST /api/signed-url
// ==========================================
filesRouter.post('/api/signed-url', apiKeyAuth(), async (c) => {
  let body: { key?: string; expiresInSeconds?: number };
  try {
    body = await c.req.json();
  } catch {
    return apiError(c, 'Invalid JSON body. Expected { key: string, expiresInSeconds?: number }', 400);
  }

  const { key, expiresInSeconds = 3600 } = body;
  if (!key || typeof key !== 'string' || key.trim() === '') {
    return apiError(c, 'Field "key" is required', 400);
  }

  const duration = Math.max(10, Math.min(Number(expiresInSeconds) || 3600, 604800)); // between 10s and 7 days
  const cleanKey = key.trim().replace(/^\/+/, '');
  const fullKey = cleanKey.startsWith('private/') ? cleanKey : `private/${cleanKey}`;

  try {
    const signedData = await buildSignedUrl(fullKey, c.env.API_KEY, c.req.url, duration);

    return apiSuccess(c, {
      url: signedData.url,
      key: fullKey,
      expiresAt: signedData.expiresAt,
      expiresInSeconds: duration,
    });
  } catch (err) {
    console.error('[Signed URL Error]:', err);
    return apiError(c, 'Failed to generate signed URL', 500);
  }
});
