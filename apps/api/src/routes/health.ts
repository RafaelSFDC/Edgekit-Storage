import { Hono } from 'hono';
import type { AppContext } from '../env';
import { apiSuccess } from '../utils/response';

export const healthRouter = new Hono<AppContext>();

healthRouter.get('/health', async (c) => {
  let r2Status = 'ok';
  let d1Status = 'not_configured';

  try {
    if (c.env?.BUCKET) {
      await c.env.BUCKET.list({ limit: 1 });
    } else if (c.env) {
      r2Status = 'missing_binding';
    }
  } catch {
    r2Status = 'error';
  }

  if (c.env?.DB) {
    try {
      await c.env.DB.prepare('SELECT 1').first();
      d1Status = 'ok';
    } catch {
      d1Status = 'error';
    }
  }

  const isHealthy = r2Status === 'ok' && (d1Status === 'ok' || d1Status === 'not_configured');

  return c.json(
    {
      success: isHealthy,
      data: {
        status: isHealthy ? 'ok' : 'degraded',
        service: 'cloudflare-storage',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        dependencies: {
          r2: r2Status,
          d1: d1Status,
        },
      },
    },
    isHealthy ? 200 : 503
  );
});

healthRouter.get('/api', (c) => {
  return apiSuccess(c, {
    status: 'ok',
    service: 'cloudflare-storage',
    version: '1.0.0',
    description: 'Lightweight image and file storage backend powered by Cloudflare Workers & R2',
    endpoints: {
      health: 'GET /health',
      info: 'GET /api',
      upload: 'POST /upload (Requires API Key)',
      createPresignedUpload: 'POST /api/upload/presigned (Requires API Key)',
      executePresignedUpload: 'PUT /upload/presigned/:key (Public with HMAC token)',
      listFiles: 'GET /api/files (Requires API Key)',
      deleteFile: 'DELETE /api/files/:key (Requires API Key)',
      streamPublic: 'GET /f/:key (?download=true)',
      streamPrivate: 'GET /private/:key (?download=true)',
    },
  });
});
