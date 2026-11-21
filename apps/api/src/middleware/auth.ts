import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import type { AppContext } from '../env';
import { apiError } from '../utils/response';
import { timingSafeEqualStr, verifySessionToken } from '../utils/keys';

export const AUTH_COOKIE_NAME = 'cf_storage_session';

/**
 * Middleware that validates the incoming request against the configured API_KEY.
 * Accepts:
 * - Header: 'X-API-Key: <key>'
 * - Header: 'Authorization: Bearer <key>'
 * - HttpOnly Cookie: 'cf_storage_session=<timestamp>.<hmacSignature>' (used by dashboard)
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
    if (xApiKey && timingSafeEqualStr(xApiKey, configuredKey)) {
      return next();
    }

    // 2. Check Authorization: Bearer <token>
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (timingSafeEqualStr(token, configuredKey)) {
        return next();
      }
    }

    // 3. Check HttpOnly session cookie (for Dashboard - HMAC-SHA256 signed token)
    const sessionCookie = getCookie(c, AUTH_COOKIE_NAME);
    if (sessionCookie && (await verifySessionToken(sessionCookie, configuredKey))) {
      return next();
    }

    return apiError(c, 'Unauthorized: Invalid or missing API Key', 401);
  };
}
