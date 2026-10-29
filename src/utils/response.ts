import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export function apiSuccess<T>(c: Context, data: T, status: ContentfulStatusCode = 200) {
  return c.json(
    {
      success: true,
      data,
    },
    status
  );
}

export function apiError(
  c: Context,
  message: string,
  status: ContentfulStatusCode = 400,
  details?: unknown
) {
  return c.json(
    {
      success: false,
      error: {
        message,
        ...(details ? { details } : {}),
      },
    },
    status
  );
}
