import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppContext } from './env';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { uploadRouter } from './routes/upload';
import { filesRouter } from './routes/files';
import { webhooksRouter } from './routes/webhooks';
import { apiError } from './utils/response';

const app = new Hono<AppContext>();

// Global CORS Middleware
app.use(
  '*',
  cors({
    origin: (origin, c) => {
      if (!origin) return '*';
      const allowedOrigins = c.env.ALLOWED_ORIGINS?.split(',')
        .map((o: string) => o.trim())
        .filter(Boolean);

      if (allowedOrigins && allowedOrigins.length > 0) {
        return allowedOrigins.includes(origin) ? origin : null;
      }

      // If ALLOWED_ORIGINS is not configured, safely allow only same-origin or localhost
      try {
        const originUrl = new URL(origin);
        const requestUrl = new URL(c.req.url);
        if (
          originUrl.host === requestUrl.host ||
          originUrl.hostname === 'localhost' ||
          originUrl.hostname === '127.0.0.1' ||
          originUrl.hostname === '[::1]'
        ) {
          return origin;
        }
      } catch {
        return null;
      }

      return null;
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'Content-Length'],
    maxAge: 86400,
  })
);

// Mount route modules
app.route('/api/auth', authRouter);
app.route('/api/webhooks', webhooksRouter);
app.route('/', healthRouter);
app.route('/upload', uploadRouter);
app.route('/api/upload', uploadRouter);
app.route('/', filesRouter);

// Root route: serve frontend SPA dashboard or redirect to API info if Accept is JSON
app.get('/', async (c) => {
  if (c.req.header('Accept')?.includes('application/json')) {
    return c.redirect('/api');
  }
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.redirect('/api');
});

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
    c.req.path.startsWith('/private') ||
    c.req.path.startsWith('/health')
  ) {
    return apiError(c, `Route not found: ${c.req.method} ${c.req.path}`, 404);
  }

  // SPA fallback for frontend client-side routing
  if (c.env.ASSETS) {
    const url = new URL(c.req.url);
    url.pathname = '/';
    return c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw));
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
