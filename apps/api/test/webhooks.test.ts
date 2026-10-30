import { describe, it, expect, vi } from 'vitest';
import app from '../src/index';
import { createMockEnv, createMockExecutionContext } from './helpers/mock-env';
import {
  generateWebhookSecret,
  generateWebhookSignature,
  verifyWebhookSignature,
  doesWebhookMatch,
} from '../src/services/webhook-dispatcher';

describe('Backend Webhooks System Suite', () => {
  it('should return 503 when D1 database is not configured in worker environment', async () => {
    const env = createMockEnv({ DB: undefined });
    const ctx = createMockExecutionContext();

    const res = await app.fetch(
      new Request('http://localhost/api/webhooks', {
        headers: { 'X-API-Key': env.API_KEY },
      }),
      env,
      ctx
    );

    expect(res.status).toBe(503);
    const json: any = await res.json();
    expect(json.error.message).toContain('Cloudflare D1 is not configured');
  });

  it('POST /api/webhooks should validate name and URL protocol', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    // 1. Missing name
    const noNameRes = await app.fetch(
      new Request('http://localhost/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': env.API_KEY,
        },
        body: JSON.stringify({ url: 'https://example.com/webhook' }),
      }),
      env,
      ctx
    );
    expect(noNameRes.status).toBe(400);

    // 2. Dangerous or invalid URL scheme
    const badUrlRes = await app.fetch(
      new Request('http://localhost/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': env.API_KEY,
        },
        body: JSON.stringify({ name: 'Hack', url: 'javascript:alert(1)' }),
      }),
      env,
      ctx
    );
    expect(badUrlRes.status).toBe(400);
    const badJson: any = await badUrlRes.json();
    expect(badJson.error.message).toContain('must be a valid HTTP or HTTPS address');
  });

  it('POST /api/webhooks should create webhook with generated secret and default wildcard events', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const res = await app.fetch(
      new Request('http://localhost/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': env.API_KEY,
        },
        body: JSON.stringify({
          name: 'My Backend Webhook',
          url: 'https://api.mybackend.com/webhooks/edgekit',
          filterPrefix: '/invoices/',
        }),
      }),
      env,
      ctx
    );

    expect(res.status).toBe(201);
    const json: any = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toMatch(/^wh_/);
    expect(json.data.secret).toMatch(/^whsec_/);
    expect(json.data.filterPrefix).toBe('invoices/');
    expect(json.data.events).toEqual(['*']);
    expect(json.data.isActive).toBe(true);
  });

  it('GET /api/webhooks should return list with computed delivery statistics', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    // Create a webhook first
    const createRes = await app.fetch(
      new Request('http://localhost/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': env.API_KEY,
        },
        body: JSON.stringify({
          name: 'Stat Webhook',
          url: 'https://stats.test.com/hook',
        }),
      }),
      env,
      ctx
    );
    const { data: created } = await createRes.json();

    const listRes = await app.fetch(
      new Request('http://localhost/api/webhooks', {
        headers: { 'X-API-Key': env.API_KEY },
      }),
      env,
      ctx
    );

    expect(listRes.status).toBe(200);
    const json: any = await listRes.json();
    expect(Array.isArray(json.data.webhooks)).toBe(true);
    const found = json.data.webhooks.find((w: any) => w.id === created.id);
    expect(found).toBeDefined();
    expect(found.stats).toBeDefined();
    expect(found.stats.totalDeliveries).toBe(0);
  });

  it('DELETE /api/webhooks/:id should remove webhook from database', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const createRes = await app.fetch(
      new Request('http://localhost/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': env.API_KEY,
        },
        body: JSON.stringify({
          name: 'To Delete',
          url: 'https://delete.test.com/hook',
        }),
      }),
      env,
      ctx
    );
    const { data: created } = await createRes.json();

    const delRes = await app.fetch(
      new Request(`http://localhost/api/webhooks/${created.id}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': env.API_KEY },
      }),
      env,
      ctx
    );

    expect(delRes.status).toBe(200);

    // Verify it is gone
    const getRes = await app.fetch(
      new Request(`http://localhost/api/webhooks/${created.id}`, {
        headers: { 'X-API-Key': env.API_KEY },
      }),
      env,
      ctx
    );
    expect(getRes.status).toBe(404);
  });

  it('Webhook HMAC signature generation and replay attack verification', async () => {
    const secret = generateWebhookSecret();
    const payload = JSON.stringify({ event: 'file.uploaded', key: 'uploads/pic.png' });
    const now = Math.floor(Date.now() / 1000);

    const { signatureHeader, signatureHex } = await generateWebhookSignature(
      payload,
      secret,
      now
    );
    expect(signatureHeader).toContain(`t=${now}`);
    expect(signatureHex.length).toBe(64);

    // Valid check
    const isValid = await verifyWebhookSignature({
      payload,
      signatureHeader,
      secret,
      toleranceSeconds: 300,
    });
    expect(isValid).toBe(true);

    // Tampered payload
    const isTampered = await verifyWebhookSignature({
      payload: payload + 'tampered',
      signatureHeader,
      secret,
    });
    expect(isTampered).toBe(false);

    // Replay attack with timestamp 10 minutes ago (> 300s)
    const oldTimestamp = now - 600;
    const { signatureHeader: expiredHeader } = await generateWebhookSignature(
      payload,
      secret,
      oldTimestamp
    );
    const isReplay = await verifyWebhookSignature({
      payload,
      signatureHeader: expiredHeader,
      secret,
      toleranceSeconds: 300,
    });
    expect(isReplay).toBe(false);
  });

  it('doesWebhookMatch should correctly enforce prefix and event filtering', () => {
    const hook = {
      events: JSON.stringify(['file.uploaded']),
      filter_prefix: 'invoices/',
    };

    // Matching event and prefix
    expect(doesWebhookMatch(hook, 'file.uploaded', 'invoices/2026/inv1.pdf')).toBe(true);

    // Non-matching event
    expect(doesWebhookMatch(hook, 'file.downloaded', 'invoices/2026/inv1.pdf')).toBe(false);

    // Non-matching prefix
    expect(doesWebhookMatch(hook, 'file.uploaded', 'avatars/user1.png')).toBe(false);

    // Test ping should always match
    expect(doesWebhookMatch(hook, 'ping')).toBe(true);
  });
});
