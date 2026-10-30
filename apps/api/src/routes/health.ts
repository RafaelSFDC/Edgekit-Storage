import { Hono } from 'hono';
import type { AppContext } from '../env';
import { apiSuccess } from '../utils/response';

export const healthRouter = new Hono<AppContext>();

healthRouter.get('/health', (c) => {
  return apiSuccess(c, {
    status: 'ok',
    service: 'cloudflare-storage',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
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
