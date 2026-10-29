import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import type { AppContext } from '../env';
import { apiError } from '../utils/response';

export const AUTH_COOKIE_NAME = 'cf_storage_session';

/**
 * Middleware that validates the incoming request against the configured API_KEY.
 * Accepts:
 * - Header: 'X-API-Key: <key>'
 * - Header: 'Authorization: Bearer <key>'
 * - HttpOnly Cookie: 'cf_storage_session=<key>' (used by dashboard)
 * - Query param: '?apiKey=<key>' (optional)
 */
export function apiKeyAuth(): MiddlewareHandler<AppContext> {
  return async (c, next) => {
    const configuredKey = c.env.API_KEY;

    if (!configuredKey || configuredKey.trim() === '') {
      console.error(
        '[Security Warning] API_KEY environment variable is not configured! All protected requests will be rejected.'
      );
      return apiError(c, 'Server authentication is not configured', 500);
    }

    // 1. Check X-API-Key header (standard for external backends)
    const xApiKey = c.req.header('X-API-Key');
    if (xApiKey && xApiKey === configuredKey) {
      return next();
    }

    // 2. Check Authorization: Bearer <token>
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token === configuredKey) {
        return next();
      }
    }

    // 3. Check HttpOnly session cookie (for Dashboard)
    const sessionCookie = getCookie(c, AUTH_COOKIE_NAME);
    if (sessionCookie && sessionCookie === configuredKey) {
      return next();
    }

    // 4. Check query parameter ?apiKey=<token>
    const queryKey = c.req.query('apiKey');
    if (queryKey && queryKey === configuredKey) {
      return next();
    }

    return apiError(c, 'Unauthorized: Invalid or missing API Key', 401);
  };
}
