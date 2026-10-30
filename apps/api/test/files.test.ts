import { describe, it, expect } from 'vitest';
import app from '../src/index';
import { createMockEnv, createMockExecutionContext } from './helpers/mock-env';
import { generateSignedToken } from '../src/utils/keys';

describe('Backend Files Management & Streaming Suite', () => {
  it('GET /f/:key should block access to private files via the public stream route', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    // Store private file
    await env.BUCKET.put('private/contracts/agreement.pdf', new Uint8Array([1, 2, 3]), {
      httpMetadata: { contentType: 'application/pdf' },
    });

    const res = await app.fetch(
      new Request('http://localhost/f/private/contracts/agreement.pdf'),
      env,
      ctx
    );

    expect(res.status).toBe(403);
    const json: any = await res.json();
    expect(json.error.message).toContain('Access denied: File is private');
  });

  it('GET /f/:key should return 404 when file does not exist', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const res = await app.fetch(
      new Request('http://localhost/f/non-existent-file.png'),
      env,
      ctx
    );

    expect(res.status).toBe(404);
  });

  it('GET /f/:key should stream public file and respect caching headers', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const content = new TextEncoder().encode('public-banner-data');
    await env.BUCKET.put('2026/10/banner.png', content, {
      httpMetadata: { contentType: 'image/png' },
    });

    const res = await app.fetch(
      new Request('http://localhost/f/2026/10/banner.png'),
      env,
      ctx
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('cache-control')).toContain('public');
    expect(res.headers.get('etag')).toBeTruthy();
  });

  it('GET /f/:key should support conditional If-None-Match header (304 Not Modified)', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    await env.BUCKET.put('public/logo.svg', new TextEncoder().encode('<svg></svg>'), {
      httpMetadata: { contentType: 'image/svg+xml' },
    });

    const firstRes = await app.fetch(new Request('http://localhost/f/public/logo.svg'), env, ctx);
    const etag = firstRes.headers.get('etag');
    expect(etag).toBeTruthy();

    const secondRes = await app.fetch(
      new Request('http://localhost/f/public/logo.svg', {
        headers: { 'If-None-Match': etag! },
      }),
      env,
      ctx
    );

    expect(secondRes.status).toBe(304);
  });

  it('GET /f/:key should set Content-Disposition attachment on ?download=true', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    await env.BUCKET.put('report.pdf', new Uint8Array([1, 2, 3]), {
      httpMetadata: { contentType: 'application/pdf' },
    });

    const res = await app.fetch(
      new Request('http://localhost/f/report.pdf?download=true&filename=my_report.pdf'),
      env,
      ctx
    );

    expect(res.status).toBe(200);
    const disp = res.headers.get('content-disposition');
    expect(disp).toBeTruthy();
    expect(disp).toContain('attachment');
    expect(disp).toContain('my_report.pdf');
  });

  it('GET /private/:key should allow access with valid signed HMAC token', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const key = 'private/invoices/inv_123.pdf';
    await env.BUCKET.put(key, new Uint8Array([10, 20, 30]), {
      httpMetadata: { contentType: 'application/pdf' },
    });

    const expires = Math.floor(Date.now() / 1000) + 3600;
    const token = await generateSignedToken(key, env.API_KEY, expires);

    // Call without API key header, only query token
    const res = await app.fetch(
      new Request(`http://localhost/private/invoices/inv_123.pdf?token=${token}&expires=${expires}`),
      env,
      ctx
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('cache-control')).toContain('no-store');
  });

  it('GET /private/:key should reject invalid or expired signed URL token', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const key = 'private/invoices/inv_123.pdf';
    await env.BUCKET.put(key, new Uint8Array([10, 20, 30]));

    const pastExpires = Math.floor(Date.now() / 1000) - 100;
    const token = await generateSignedToken(key, env.API_KEY, pastExpires);

    const res = await app.fetch(
      new Request(`http://localhost/private/invoices/inv_123.pdf?token=${token}&expires=${pastExpires}`),
      env,
      ctx
    );

    expect(res.status).toBe(403);
  });

  it('GET /api/files should list objects from bucket with pagination', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    // Populate bucket with 5 files
    for (let i = 1; i <= 5; i++) {
      await env.BUCKET.put(`file_${i}.png`, new Uint8Array([i]), {
        httpMetadata: { contentType: 'image/png' },
      });
    }

    const res = await app.fetch(
      new Request('http://localhost/api/files?limit=3', {
        headers: { 'X-API-Key': env.API_KEY },
      }),
      env,
      ctx
    );

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.data.objects.length).toBe(3);
    expect(json.data.truncated).toBe(true);
    expect(json.data.cursor).toBeDefined();
  });

  it('DELETE /api/files/:key should remove the file from R2', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const key = 'uploads/to-delete.jpg';
    await env.BUCKET.put(key, new Uint8Array([1, 2, 3]));
    expect((env.BUCKET as any)._store.has(key)).toBe(true);

    const res = await app.fetch(
      new Request(`http://localhost/api/files/${key}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': env.API_KEY },
      }),
      env,
      ctx
    );

    expect(res.status).toBe(200);
    expect((env.BUCKET as any)._store.has(key)).toBe(false);
  });

  it('POST /api/files/batch-delete should validate input and delete multiple files', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const k1 = 'batch/1.png';
    const k2 = 'batch/2.png';
    await env.BUCKET.put(k1, new Uint8Array([1]));
    await env.BUCKET.put(k2, new Uint8Array([2]));

    // Empty array should be rejected with 400
    const emptyRes = await app.fetch(
      new Request('http://localhost/api/files/batch-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': env.API_KEY,
        },
        body: JSON.stringify({ keys: [] }),
      }),
      env,
      ctx
    );
    expect(emptyRes.status).toBe(400);

    // Valid array should delete both
    const validRes = await app.fetch(
      new Request('http://localhost/api/files/batch-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': env.API_KEY,
        },
        body: JSON.stringify({ keys: [k1, k2] }),
      }),
      env,
      ctx
    );

    expect(validRes.status).toBe(200);
    expect((env.BUCKET as any)._store.has(k1)).toBe(false);
    expect((env.BUCKET as any)._store.has(k2)).toBe(false);
  });

  it('POST /api/signed-url should generate working signed URL for private file', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const res = await app.fetch(
      new Request('http://localhost/api/signed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': env.API_KEY,
        },
        body: JSON.stringify({ key: 'private/vault/doc.pdf', expiresInSeconds: 1800 }),
      }),
      env,
      ctx
    );

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.data.url).toContain('/private/');
    expect(json.data.url).toContain('token=');
    expect(json.data.expiresInSeconds).toBe(1800);
  });
});
