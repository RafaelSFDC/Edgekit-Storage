import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import type { AppContext } from '../env';
import { apiKeyAuth, AUTH_COOKIE_NAME } from '../middleware/auth';
import { apiError, apiSuccess } from '../utils/response';
import { timingSafeEqualStr } from '../utils/keys';

export const authRouter = new Hono<AppContext>();

/**
 * POST /api/auth/login
 * Validates the provided API key and sets a secure HttpOnly session cookie.
 */
authRouter.post('/login', async (c) => {
  let body: { apiKey?: string };
  try {
    body = await c.req.json();
  } catch {
    return apiError(c, 'Invalid JSON body. Expected { apiKey: string }', 400);
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return apiError(c, 'Invalid JSON body. Expected { apiKey: string }', 400);
  }

  const { apiKey } = body;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    return apiError(c, 'Field "apiKey" is required', 400);
  }

  const configuredKey = c.env.API_KEY;
  if (!configuredKey || configuredKey.trim() === '') {
    return apiError(c, 'Server authentication is not configured', 500);
  }

  if (!timingSafeEqualStr(apiKey.trim(), configuredKey)) {
    return apiError(c, 'Invalid API Key', 401);
  }

  const requestUrl = new URL(c.req.url);
  const isLocalhost =
    requestUrl.hostname === 'localhost' ||
    requestUrl.hostname === '127.0.0.1' ||
    requestUrl.hostname === '[::1]';

  const originHeader = c.req.header('origin');
  let isCrossOrigin = false;
  if (originHeader) {
    try {
      const originUrl = new URL(originHeader);
      if (originUrl.host !== requestUrl.host) {
        isCrossOrigin = true;
      }
    } catch {}
  }

  // Set secure HttpOnly cookie (7 days duration)
  // Use SameSite=None + Secure for cross-origin deployments with HTTPS
  setCookie(c, AUTH_COOKIE_NAME, apiKey.trim(), {
    httpOnly: true,
    secure: !isLocalhost || (isCrossOrigin && originHeader?.startsWith('https:')),
    sameSite: isCrossOrigin && !isLocalhost ? 'None' : 'Lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return apiSuccess(c, {
    authenticated: true,
    message: 'Authentication successful. HttpOnly session cookie established.',
  });
});

/**
 * POST /api/auth/logout
 * Clears the HttpOnly session cookie.
 */
authRouter.post('/logout', (c) => {
  const requestUrl = new URL(c.req.url);
  const isLocalhost =
    requestUrl.hostname === 'localhost' ||
    requestUrl.hostname === '127.0.0.1' ||
    requestUrl.hostname === '[::1]';

  const originHeader = c.req.header('origin');
  let isCrossOrigin = false;
  if (originHeader) {
    try {
      const originUrl = new URL(originHeader);
      if (originUrl.host !== requestUrl.host) {
        isCrossOrigin = true;
      }
    } catch {}
  }

  deleteCookie(c, AUTH_COOKIE_NAME, {
    path: '/',
    secure: !isLocalhost || (isCrossOrigin && originHeader?.startsWith('https:')),
    sameSite: isCrossOrigin && !isLocalhost ? 'None' : 'Lax',
  });

  return apiSuccess(c, {
    authenticated: false,
    message: 'Logged out successfully.',
  });
});

/**
 * GET /api/auth/me
 * Verifies if current session cookie or authorization header is valid.
 */
authRouter.get('/me', apiKeyAuth(), (c) => {
  return apiSuccess(c, {
    authenticated: true,
  });
});
