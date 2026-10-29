import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppContext } from './env';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { uploadRouter } from './routes/upload';
import { filesRouter } from './routes/files';
import { apiError } from './utils/response';

const app = new Hono<AppContext>();

// Global CORS Middleware
app.use(
  '*',
  cors({
    origin: (origin) => origin || '*',
    credentials: true,
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS', 'HEAD'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    maxAge: 86400,
  })
);

// Mount route modules
app.route('/api/auth', authRouter);
app.route('/', healthRouter);
app.route('/upload', uploadRouter);
app.route('/', filesRouter);

// Fallback to static assets (SPA Dashboard) or 404
app.notFound(async (c) => {
  if (c.env.ASSETS) {
    const assetResponse = await c.env.ASSETS.fetch(c.req.raw);
    if (assetResponse.status !== 404) {
      return assetResponse;
    }
  }

  // If path starts with /api, /upload, /f, or /private, return structured JSON 404
  if (
    c.req.path.startsWith('/api') ||
    c.req.path.startsWith('/upload') ||
    c.req.path.startsWith('/f') ||
    c.req.path.startsWith('/private')
  ) {
    return apiError(c, `Route not found: ${c.req.method} ${c.req.path}`, 404);
  }

  // SPA fallback for frontend client-side routing
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(new Request(new URL('/', c.req.url), c.req.raw));
  }

  return apiError(c, `Route not found: ${c.req.method} ${c.req.path}`, 404);
});

// Global Error Handler
app.onError((err, c) => {
  console.error('[Unhandled Exception]:', err);
  return apiError(
    c,
    'Internal server error',
    500,
    err instanceof Error ? err.message : String(err)
  );
});

export default app;
