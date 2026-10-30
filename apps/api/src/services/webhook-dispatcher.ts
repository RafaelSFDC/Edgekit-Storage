import type { Context } from 'hono';
import type { AppContext } from '../env';
import { ensureD1Schema } from '../db/schema';
import { timingSafeEqualStr } from '../utils/keys';

export interface WebhookRecord {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string; // JSON array string e.g. '["*"]' or '["file.downloaded"]'
  filter_prefix: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface WebhookDeliveryRecord {
  id: string;
  webhook_id: string;
  event_id: string;
  event_type: string;
  payload: string;
  status_code: number | null;
  response_body: string | null;
  duration_ms: number;
  success: number;
  error_message: string | null;
  attempt: number;
  created_at: string;
}

export interface WebhookEventPayload<T = Record<string, any>> {
  id: string;
  event: string;
  timestamp: string;
  data: T;
}

/**
 * Generate a random cryptographically secure webhook secret (whsec_...)
 */
export function generateWebhookSecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return 'whsec_' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compute HMAC-SHA256 signature for a webhook payload
 * Format: t={timestamp},v1={hexSignature}
 */
export async function generateWebhookSignature(
  payload: string,
  secret: string,
  timestamp: number
): Promise<{ signatureHeader: string; signatureHex: string }> {
  const encoder = new TextEncoder();
  const signaturePayload = `${timestamp}.${payload}`;

  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    encoder.encode(signaturePayload)
  );

  const signatureHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return {
    signatureHeader: `t=${timestamp},v1=${signatureHex}`,
    signatureHex,
  };
}

/**
 * Verify a webhook HMAC signature
 */
export async function verifyWebhookSignature({
  payload,
  signatureHeader,
  secret,
  toleranceSeconds = 300,
}: {
  payload: string;
  signatureHeader: string;
  secret: string;
  toleranceSeconds?: number;
}): Promise<boolean> {
  if (!signatureHeader || !secret) {
    return false;
  }

  // Parse header: t=1730000000,v1=abcdef...
  const parts = signatureHeader.split(',');
  let timestampStr: string | undefined;
  let receivedSignature: string | undefined;

  for (const part of parts) {
    const [key, val] = part.split('=');
    if (key?.trim() === 't') timestampStr = val?.trim();
    if (key?.trim() === 'v1') receivedSignature = val?.trim();
  }

  if (!timestampStr || !receivedSignature) {
    return false;
  }

  const timestamp = Number(timestampStr);
  if (isNaN(timestamp)) {
    return false;
  }

  // Check timestamp tolerance against replay attacks
  if (toleranceSeconds > 0) {
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > toleranceSeconds) {
      return false;
    }
  }

  const { signatureHex: expectedSignature } = await generateWebhookSignature(
    payload,
    secret,
    timestamp
  );

  return timingSafeEqualStr(receivedSignature, expectedSignature);
}

/**
 * Check whether a webhook should receive an event based on event type and file key prefix
 */
export function doesWebhookMatch(
  webhook: { events: string; filter_prefix?: string | null },
  eventType: string,
  key?: string
): boolean {
  let subscribedEvents: string[] = [];
  try {
    subscribedEvents = JSON.parse(webhook.events);
  } catch {
    subscribedEvents = [webhook.events];
  }

  // 1. Check event type match (* or specific type)
  const matchesEvent =
    subscribedEvents.includes('*') ||
    subscribedEvents.includes(eventType) ||
    eventType === 'ping'; // test pings always match

  if (!matchesEvent) {
    return false;
  }

  // 2. Check prefix match if key and filter_prefix exist
  if (webhook.filter_prefix && key) {
    const cleanPrefix = webhook.filter_prefix.trim().replace(/^\/+/, '');
    const cleanKey = key.trim().replace(/^\/+/, '');
    if (!cleanKey.startsWith(cleanPrefix)) {
      return false;
    }
  }

  return true;
}

/**
 * Execute a single HTTP webhook delivery and save log to D1
 */
export async function deliverWebhook({
  db,
  webhook,
  eventId,
  eventType,
  payloadData,
  attempt = 1,
}: {
  db?: D1Database;
  webhook: WebhookRecord;
  eventId: string;
  eventType: string;
  payloadData: Record<string, any>;
  attempt?: number;
}): Promise<WebhookDeliveryRecord> {
  const deliveryId = 'del_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20);
  const timestamp = Math.floor(Date.now() / 1000);
  const nowIso = new Date().toISOString();

  const payload: WebhookEventPayload = {
    id: eventId,
    event: eventType,
    timestamp: nowIso,
    data: payloadData,
  };

  const payloadString = JSON.stringify(payload);
  const { signatureHeader } = await generateWebhookSignature(payloadString, webhook.secret, timestamp);

  let statusCode: number | null = null;
  let responseBody: string | null = null;
  let errorMessage: string | null = null;
  let isSuccess = false;
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'EdgeKit-Storage-Webhook/1.0',
        'X-Edgekit-Event': eventType,
        'X-Edgekit-Delivery': deliveryId,
        'X-Edgekit-Timestamp': String(timestamp),
        'X-Edgekit-Signature': signatureHeader,
      },
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    statusCode = response.status;
    isSuccess = response.ok;

    try {
      const text = await response.text();
      responseBody = text.slice(0, 1000); // Truncate to first 1000 chars for logging
    } catch {
      responseBody = null;
    }
  } catch (err) {
    isSuccess = false;
    if (err instanceof Error && err.name === 'AbortError') {
      errorMessage = 'Delivery timed out after 5000ms';
    } else {
      errorMessage = err instanceof Error ? err.message : String(err);
    }
  }

  const durationMs = Date.now() - startTime;

  const deliveryRecord: WebhookDeliveryRecord = {
    id: deliveryId,
    webhook_id: webhook.id,
    event_id: eventId,
    event_type: eventType,
    payload: payloadString,
    status_code: statusCode,
    response_body: responseBody,
    duration_ms: durationMs,
    success: isSuccess ? 1 : 0,
    error_message: errorMessage,
    attempt,
    created_at: nowIso,
  };

  // Persist delivery to D1 if available
  if (db) {
    try {
      await db
        .prepare(`
          INSERT INTO webhook_deliveries (
            id, webhook_id, event_id, event_type, payload,
            status_code, response_body, duration_ms, success,
            error_message, attempt, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          deliveryRecord.id,
          deliveryRecord.webhook_id,
          deliveryRecord.event_id,
          deliveryRecord.event_type,
          deliveryRecord.payload,
          deliveryRecord.status_code,
          deliveryRecord.response_body,
          deliveryRecord.duration_ms,
          deliveryRecord.success,
          deliveryRecord.error_message,
          deliveryRecord.attempt,
          deliveryRecord.created_at
        )
        .run();
    } catch (saveErr) {
      console.error('[Webhook DB Error] Failed to record delivery:', saveErr);
    }
  }

  return deliveryRecord;
}

/**
 * Main dispatcher: finds all active webhooks subscribed to this event and delivers them.
 * Executed non-blockingly via c.executionCtx.waitUntil.
 */
export function dispatchWebhookEvent<T extends Record<string, any>>(
  c: Context<AppContext>,
  eventType: string,
  data: T
): void {
  const db = c.env.DB;
  if (!db) {
    return; // Graceful fallback: D1 not configured
  }

  const eventId = 'evt_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20);
  const targetKey = typeof data.key === 'string' ? data.key : undefined;

  // Enrich payload with client context if available
  const clientIp =
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-real-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    undefined;
  const userAgent = c.req.header('user-agent') || undefined;
  const referer = c.req.header('referer') || undefined;

  const enrichedData = {
    ...data,
    request: {
      ...(data.request || {}),
      ip: clientIp,
      userAgent,
      referer,
    },
  };

  const dispatchPromise = (async () => {
    try {
      await ensureD1Schema(db);

      const result = await db
        .prepare('SELECT * FROM webhooks WHERE is_active = 1')
        .all<WebhookRecord>();

      const activeWebhooks = result.results || [];
      const matchingWebhooks = activeWebhooks.filter((wh) =>
        doesWebhookMatch(wh, eventType, targetKey)
      );

      if (matchingWebhooks.length === 0) {
        return;
      }

      await Promise.allSettled(
        matchingWebhooks.map((webhook) =>
          deliverWebhook({
            db,
            webhook,
            eventId,
            eventType,
            payloadData: enrichedData,
          })
        )
      );
    } catch (err) {
      console.error(`[Webhook Dispatch Error] Failed to dispatch event '${eventType}':`, err);
    }
  })();

  // Use waitUntil so the client download/upload response is completely unblocked
  if (c.executionCtx?.waitUntil) {
    c.executionCtx.waitUntil(dispatchPromise);
  }
}
