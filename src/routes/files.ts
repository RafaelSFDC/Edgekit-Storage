import { Hono } from 'hono';
import type { AppContext } from '../env';
import { apiKeyAuth } from '../middleware/auth';
import { apiError, apiSuccess } from '../utils/response';
import { resolveFileUrl } from '../utils/keys';

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

  const object = await c.env.BUCKET.get(key, {
    onlyIf: c.req.raw.headers,
    range: c.req.raw.headers,
  });

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

  return new Response(object.body, {
    headers,
  });
});

// ==========================================
// 2. PROTECTED STREAM: GET /private/:key+
// ==========================================
filesRouter.get('/private/:key{.*}', apiKeyAuth(), async (c) => {
  const key = c.req.param('key');
  if (!key) {
    return apiError(c, 'File key is required', 400);
  }

  // Auto-prepend private/ if not present
  const fullKey = key.startsWith('private/') ? key : `private/${key}`;

  const object = await c.env.BUCKET.get(fullKey, {
    onlyIf: c.req.raw.headers,
    range: c.req.raw.headers,
  });

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

  return new Response(object.body, {
    headers,
  });
});

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
    });

    const objects = listed.objects.map((obj) => {
      const isPrivate = obj.key.startsWith('private/');
      return {
        key: obj.key,
        size: obj.size,
        uploadedAt: obj.uploaded.toISOString(),
        mimeType: obj.httpMetadata?.contentType || 'application/octet-stream',
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
  return apiSuccess(c, {
    key: head.key,
    size: head.size,
    uploadedAt: head.uploaded.toISOString(),
    mimeType: head.httpMetadata?.contentType || 'application/octet-stream',
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
    return apiSuccess(c, {
      message: 'File deleted successfully',
      key,
    });
  } catch (err) {
    console.error(`[Delete Error] Failed deleting key ${key}:`, err);
    return apiError(c, 'Failed to delete file from R2 storage', 500);
  }
});
