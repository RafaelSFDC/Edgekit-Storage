import { Hono } from 'hono';
import type { AppContext } from '../env';
import { apiKeyAuth } from '../middleware/auth';
import { apiError, apiSuccess } from '../utils/response';
import { ensureD1Schema } from '../db/schema';
import {
  generateWebhookSecret,
  deliverWebhook,
  isSafeWebhookUrl,
  type WebhookRecord,
  type WebhookDeliveryRecord,
} from '../services/webhook-dispatcher';

export const webhooksRouter = new Hono<AppContext>();

// Require master API Key for all webhook management operations
webhooksRouter.use('*', apiKeyAuth());

// Middleware to ensure D1 is connected and schema initialized
webhooksRouter.use('*', async (c, next) => {
  if (!c.env.DB) {
    return apiError(
      c,
      'Cloudflare D1 is not configured. Webhooks require a D1 database binding named "DB".',
      503
    );
  }
  await ensureD1Schema(c.env.DB);
  return next();
});

// ==========================================
// 1. LIST WEBHOOKS: GET /api/webhooks
// ==========================================
webhooksRouter.get('/', async (c) => {
  const db = c.env.DB!;
  try {
    const webhooksRes = await db
      .prepare('SELECT * FROM webhooks ORDER BY created_at DESC')
      .all<WebhookRecord>();

    const webhooks = webhooksRes.results || [];

    // Query delivery statistics grouped by webhook_id
    const statsRes = await db
      .prepare(`
        SELECT 
          webhook_id,
          COUNT(*) as total_deliveries,
          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_deliveries,
          SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_deliveries,
          MAX(created_at) as last_delivery_at
        FROM webhook_deliveries
        GROUP BY webhook_id
      `)
      .all<{
        webhook_id: string;
        total_deliveries: number;
        successful_deliveries: number;
        failed_deliveries: number;
        last_delivery_at: string | null;
      }>();

    const statsMap = new Map((statsRes.results || []).map((s) => [s.webhook_id, s]));

    const formatted = webhooks.map((wh) => {
      let eventsArray: string[] = ['*'];
      try {
        eventsArray = JSON.parse(wh.events);
      } catch {
        eventsArray = [wh.events];
      }

      const st = statsMap.get(wh.id);

      return {
        id: wh.id,
        name: wh.name,
        url: wh.url,
        secret: wh.secret,
        events: eventsArray,
        filterPrefix: wh.filter_prefix || null,
        isActive: Boolean(wh.is_active),
        createdAt: wh.created_at,
        updatedAt: wh.updated_at,
        stats: {
          totalDeliveries: Number(st?.total_deliveries || 0),
          successfulDeliveries: Number(st?.successful_deliveries || 0),
          failedDeliveries: Number(st?.failed_deliveries || 0),
          lastDeliveryAt: st?.last_delivery_at || null,
        },
      };
    });

    return apiSuccess(c, { webhooks: formatted });
  } catch (err) {
    console.error('[Webhooks List Error]:', err);
    return apiError(c, 'Failed to fetch webhooks from database', 500);
  }
});

// ==========================================
// 2. CREATE WEBHOOK: POST /api/webhooks
// ==========================================
webhooksRouter.post('/', async (c) => {
  let body: {
    name?: string;
    url?: string;
    secret?: string;
    events?: string[];
    filterPrefix?: string;
    isActive?: boolean;
  };

  try {
    body = await c.req.json();
  } catch {
    return apiError(c, 'Invalid JSON body. Expected { name: string, url: string, ... }', 400);
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return apiError(c, 'Invalid JSON body. Expected { name: string, url: string, ... }', 400);
  }

  const { name, url, secret, events, filterPrefix, isActive = true } = body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return apiError(c, 'Field "name" is required', 400);
  }

  if (!url || typeof url !== 'string' || url.trim() === '') {
    return apiError(c, 'Field "url" is required', 400);
  }

  const trimmedUrl = url.trim();
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    return apiError(c, 'Field "url" must be a valid HTTP or HTTPS address', 400);
  }

  if (!isSafeWebhookUrl(trimmedUrl)) {
    return apiError(
      c,
      'Field "url" must be a public HTTP or HTTPS address. Local and private network addresses are disallowed.',
      400
    );
  }

  const validEvents = Array.isArray(events) && events.length > 0
    ? events.map((e) => String(e).trim()).filter(Boolean)
    : ['*'];

  const webhookId = `wh_${crypto.randomUUID().replace(/-/g, '').slice(0, 18)}`;
  const webhookSecret = typeof secret === 'string' && secret.trim() ? secret.trim() : generateWebhookSecret();
  const nowIso = new Date().toISOString();
  const cleanPrefix = typeof filterPrefix === 'string' && filterPrefix.trim() ? filterPrefix.trim().replace(/^\/+/, '') : null;

  const db = c.env.DB!;
  try {
    await db
      .prepare(`
        INSERT INTO webhooks (id, name, url, secret, events, filter_prefix, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        webhookId,
        name.trim(),
        trimmedUrl,
        webhookSecret,
        JSON.stringify(validEvents),
        cleanPrefix,
        isActive ? 1 : 0,
        nowIso,
        nowIso
      )
      .run();

    return apiSuccess(
      c,
      {
        id: webhookId,
        name: name.trim(),
        url: trimmedUrl,
        secret: webhookSecret,
        events: validEvents,
        filterPrefix: cleanPrefix,
        isActive: Boolean(isActive),
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      201
    );
  } catch (err) {
    console.error('[Create Webhook Error]:', err);
    return apiError(c, 'Failed to create webhook in database', 500);
  }
});

// ==========================================
// 3. GET WEBHOOK DETAILS: GET /api/webhooks/:id
// ==========================================
webhooksRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = c.env.DB!;

  try {
    const wh = await db
      .prepare('SELECT * FROM webhooks WHERE id = ?')
      .bind(id)
      .first<WebhookRecord>();

    if (!wh) {
      return apiError(c, 'Webhook not found', 404);
    }

    let eventsArray: string[] = ['*'];
    try {
      eventsArray = JSON.parse(wh.events);
    } catch {
      eventsArray = [wh.events];
    }

    return apiSuccess(c, {
      id: wh.id,
      name: wh.name,
      url: wh.url,
      secret: wh.secret,
      events: eventsArray,
      filterPrefix: wh.filter_prefix || null,
      isActive: Boolean(wh.is_active),
      createdAt: wh.created_at,
      updatedAt: wh.updated_at,
    });
  } catch (err) {
    console.error('[Get Webhook Error]:', err);
    return apiError(c, 'Failed to retrieve webhook', 500);
  }
});

// ==========================================
// 4. UPDATE WEBHOOK: PUT /api/webhooks/:id
// ==========================================
webhooksRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const db = c.env.DB!;

  let body: {
    name?: string;
    url?: string;
    secret?: string;
    events?: string[];
    filterPrefix?: string | null;
    isActive?: boolean;
  };

  try {
    body = await c.req.json();
  } catch {
    return apiError(c, 'Invalid JSON body', 400);
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return apiError(c, 'Invalid JSON body', 400);
  }

  const existing = await db
    .prepare('SELECT * FROM webhooks WHERE id = ?')
    .bind(id)
    .first<WebhookRecord>();

  if (!existing) {
    return apiError(c, 'Webhook not found', 404);
  }

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim() === '') {
      return apiError(c, 'Field "name" must be a non-empty string', 400);
    }
  }
  const name = typeof body.name === 'string' ? body.name.trim() : existing.name;

  let url = existing.url;
  if (body.url !== undefined) {
    if (typeof body.url !== 'string') {
      return apiError(c, 'Field "url" must be a string', 400);
    }
    url = body.url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return apiError(c, 'Field "url" must be a valid HTTP or HTTPS address', 400);
    }
    if (!isSafeWebhookUrl(url)) {
      return apiError(
        c,
        'Field "url" must be a public HTTP or HTTPS address. Local and private network addresses are disallowed.',
        400
      );
    }
  }

  if (body.secret !== undefined && typeof body.secret !== 'string') {
    return apiError(c, 'Field "secret" must be a string', 400);
  }
  const secret = typeof body.secret === 'string' && body.secret.trim() ? body.secret.trim() : existing.secret;

  if (body.events !== undefined && (!Array.isArray(body.events) || body.events.some((e) => typeof e !== 'string'))) {
    return apiError(c, 'Field "events" must be an array of event strings', 400);
  }
  const events = body.events !== undefined
    ? JSON.stringify(body.events.map((e) => String(e).trim()).filter(Boolean))
    : existing.events;

  if (body.filterPrefix !== undefined && body.filterPrefix !== null && typeof body.filterPrefix !== 'string') {
    return apiError(c, 'Field "filterPrefix" must be a string or null', 400);
  }
  const filterPrefix = body.filterPrefix !== undefined
    ? (typeof body.filterPrefix === 'string' && body.filterPrefix.trim() ? body.filterPrefix.trim().replace(/^\/+/, '') : null)
    : existing.filter_prefix;

  const isActive = body.isActive !== undefined ? (body.isActive ? 1 : 0) : existing.is_active;
  const nowIso = new Date().toISOString();

  try {
    await db
      .prepare(`
        UPDATE webhooks
        SET name = ?, url = ?, secret = ?, events = ?, filter_prefix = ?, is_active = ?, updated_at = ?
        WHERE id = ?
      `)
      .bind(name, url, secret, events, filterPrefix, isActive, nowIso, id)
      .run();

    let eventsParsed: string[] = ['*'];
    try {
      eventsParsed = JSON.parse(events);
    } catch {
      eventsParsed = [events];
    }

    return apiSuccess(c, {
      id,
      name,
      url,
      secret,
      events: eventsParsed,
      filterPrefix,
      isActive: Boolean(isActive),
      createdAt: existing.created_at,
      updatedAt: nowIso,
    });
  } catch (err) {
    console.error('[Update Webhook Error]:', err);
    return apiError(c, 'Failed to update webhook', 500);
  }
});

// ==========================================
// 5. DELETE WEBHOOK: DELETE /api/webhooks/:id
// ==========================================
webhooksRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = c.env.DB!;

  try {
    const existing = await db
      .prepare('SELECT id FROM webhooks WHERE id = ?')
      .bind(id)
      .first();

    if (!existing) {
      return apiError(c, 'Webhook not found', 404);
    }

    // Deliveries are automatically deleted via CASCADE or explicitly
    await db.batch([
      db.prepare('DELETE FROM webhook_deliveries WHERE webhook_id = ?').bind(id),
      db.prepare('DELETE FROM webhooks WHERE id = ?').bind(id),
    ]);

    return apiSuccess(c, { message: 'Webhook deleted successfully', id });
  } catch (err) {
    console.error('[Delete Webhook Error]:', err);
    return apiError(c, 'Failed to delete webhook', 500);
  }
});

// ==========================================
// 6. TRIGGER TEST PING: POST /api/webhooks/:id/test
// ==========================================
webhooksRouter.post('/:id/test', async (c) => {
  const id = c.req.param('id');
  const db = c.env.DB!;

  try {
    const webhook = await db
      .prepare('SELECT * FROM webhooks WHERE id = ?')
      .bind(id)
      .first<WebhookRecord>();

    if (!webhook) {
      return apiError(c, 'Webhook not found', 404);
    }

    const eventId = `evt_test_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const testData = {
      message: 'EdgeKit Storage webhook test ping',
      webhookId: webhook.id,
      webhookName: webhook.name,
      timestamp: new Date().toISOString(),
      request: {
        ip: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1',
        userAgent: c.req.header('user-agent') || 'EdgeKit Dashboard',
      },
    };

    const delivery = await deliverWebhook({
      db,
      webhook,
      eventId,
      eventType: 'ping',
      payloadData: testData,
      attempt: 1,
    });

    return apiSuccess(c, {
      message: delivery.success === 1 ? 'Test ping delivered successfully' : 'Test ping failed to deliver',
      delivery: {
        id: delivery.id,
        eventId: delivery.event_id,
        eventType: delivery.event_type,
        statusCode: delivery.status_code,
        responseBody: delivery.response_body,
        durationMs: delivery.duration_ms,
        success: Boolean(delivery.success),
        errorMessage: delivery.error_message,
        createdAt: delivery.created_at,
      },
    });
  } catch (err) {
    console.error('[Test Webhook Error]:', err);
    return apiError(c, 'Failed to execute test ping', 500);
  }
});

// ==========================================
// 7. GET DELIVERIES: GET /api/webhooks/:id/deliveries
// ==========================================
webhooksRouter.get('/:id/deliveries', async (c) => {
  const id = c.req.param('id');
  const rawLimit = parseInt(c.req.query('limit') || '50', 10);
  const limit = isNaN(rawLimit) ? 50 : Math.max(1, Math.min(rawLimit, 100));
  const db = c.env.DB!;

  try {
    const deliveriesRes = await db
      .prepare(`
        SELECT * FROM webhook_deliveries
        WHERE webhook_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `)
      .bind(id, limit)
      .all<WebhookDeliveryRecord>();

    const deliveries = (deliveriesRes.results || []).map((d) => ({
      id: d.id,
      webhookId: d.webhook_id,
      eventId: d.event_id,
      eventType: d.event_type,
      payload: d.payload,
      statusCode: d.status_code,
      responseBody: d.response_body,
      durationMs: d.duration_ms,
      success: Boolean(d.success),
      errorMessage: d.error_message,
      attempt: d.attempt,
      createdAt: d.created_at,
    }));

    return apiSuccess(c, { deliveries });
  } catch (err) {
    console.error('[Deliveries Fetch Error]:', err);
    return apiError(c, 'Failed to fetch deliveries history', 500);
  }
});

// ==========================================
// 8. RETRY DELIVERY: POST /api/webhooks/:id/deliveries/:deliveryId/retry
// ==========================================
webhooksRouter.post('/:id/deliveries/:deliveryId/retry', async (c) => {
  const id = c.req.param('id');
  const deliveryId = c.req.param('deliveryId');
  const db = c.env.DB!;

  try {
    const webhook = await db
      .prepare('SELECT * FROM webhooks WHERE id = ?')
      .bind(id)
      .first<WebhookRecord>();

    if (!webhook) {
      return apiError(c, 'Webhook not found', 404);
    }

    const previousDelivery = await db
      .prepare('SELECT * FROM webhook_deliveries WHERE id = ? AND webhook_id = ?')
      .bind(deliveryId, id)
      .first<WebhookDeliveryRecord>();

    if (!previousDelivery) {
      return apiError(c, 'Previous delivery log not found', 404);
    }

    let parsedPayloadData: Record<string, any> = {};
    try {
      const parsedFull = JSON.parse(previousDelivery.payload);
      parsedPayloadData = parsedFull.data || parsedFull;
    } catch {
      parsedPayloadData = { raw: previousDelivery.payload };
    }

    const newDelivery = await deliverWebhook({
      db,
      webhook,
      eventId: previousDelivery.event_id,
      eventType: previousDelivery.event_type,
      payloadData: parsedPayloadData,
      attempt: (previousDelivery.attempt || 1) + 1,
    });

    return apiSuccess(c, {
      message: newDelivery.success === 1 ? 'Webhook re-delivered successfully' : 'Webhook retry failed',
      delivery: {
        id: newDelivery.id,
        eventId: newDelivery.event_id,
        eventType: newDelivery.event_type,
        statusCode: newDelivery.status_code,
        responseBody: newDelivery.response_body,
        durationMs: newDelivery.duration_ms,
        success: Boolean(newDelivery.success),
        errorMessage: newDelivery.error_message,
        attempt: newDelivery.attempt,
        createdAt: newDelivery.created_at,
      },
    });
  } catch (err) {
    console.error('[Retry Webhook Error]:', err);
    return apiError(c, 'Failed to retry webhook delivery', 500);
  }
});
