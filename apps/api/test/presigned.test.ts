import { describe, it, expect } from 'vitest';
import app from '../src/index';
import { createMockEnv, createMockExecutionContext } from './helpers/mock-env';
import { generateSignedUploadToken, generateSignedToken } from '../src/utils/keys';

describe('Backend Presigned Upload Pipeline Suite', () => {
  it('POST /upload/presigned should require authentication', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const res = await app.fetch(
      new Request('http://localhost/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: 'test.jpg' }),
      }),
      env,
      ctx
    );

    expect(res.status).toBe(401);
  });

  it('POST /upload/presigned should validate required filename', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const res = await app.fetch(
      new Request('http://localhost/upload/presigned', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': env.API_KEY,
        },
        body: JSON.stringify({}),
      }),
      env,
      ctx
    );

    expect(res.status).toBe(400);
    const json: any = await res.json();
    expect(json.error.message).toContain('Field "filename" is required');
  });

  it('POST /upload/presigned should reject disallowed MIME type', async () => {
    const env = createMockEnv({ ALLOWED_MIME_TYPES: 'image/*,application/pdf' });
    const ctx = createMockExecutionContext();

    const res = await app.fetch(
      new Request('http://localhost/upload/presigned', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': env.API_KEY,
        },
        body: JSON.stringify({ filename: 'malware.exe' }),
      }),
      env,
      ctx
    );

    expect(res.status).toBe(415);
  });

  it('POST /upload/presigned should generate valid presigned upload URL and variants', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const res = await app.fetch(
      new Request('http://localhost/upload/presigned', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': env.API_KEY,
        },
        body: JSON.stringify({
          filename: 'photo.jpg',
          folder: 'gallery',
          variants: ['thumb', { name: 'hd', extension: 'webp' }],
        }),
      }),
      env,
      ctx
    );

    expect(res.status).toBe(201);
    const json: any = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.uploadUrl).toContain('/upload/presigned/');
    expect(json.data.uploadUrl).toContain('token=');
    expect(json.data.uploadUrl).toContain('expires=');
    expect(json.data.variants).toBeDefined();
    expect(json.data.variants.thumb).toBeDefined();
    expect(json.data.variants.hd).toBeDefined();
  });

  it('PUT /upload/presigned/:key should reject requests without token or expiration', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const res = await app.fetch(
      new Request('http://localhost/upload/presigned/2026/10/photo.jpg', {
        method: 'PUT',
        body: new Uint8Array([1, 2, 3]),
      }),
      env,
      ctx
    );

    expect(res.status).toBe(403);
    const json: any = await res.json();
    expect(json.error.message).toContain('Missing presigned token or expiration');
  });

  it('PUT /upload/presigned/:key should reject expired tokens', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const key = '2026/10/photo.jpg';
    const pastExpires = Math.floor(Date.now() / 1000) - 30; // 30s ago
    const expiredToken = await generateSignedUploadToken(key, env.API_KEY, pastExpires);

    const res = await app.fetch(
      new Request(
        `http://localhost/upload/presigned/${key}?token=${expiredToken}&expires=${pastExpires}`,
        {
          method: 'PUT',
          body: new Uint8Array([1, 2, 3]),
        }
      ),
      env,
      ctx
    );

    expect(res.status).toBe(403);
    const json: any = await res.json();
    expect(json.error.message).toContain('invalid or expired');
  });

  it('PUT /upload/presigned/:key should reject tampered HMAC token', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const key = '2026/10/photo.jpg';
    const futureExpires = Math.floor(Date.now() / 1000) + 600;
    const fakeToken = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    const res = await app.fetch(
      new Request(
        `http://localhost/upload/presigned/${key}?token=${fakeToken}&expires=${futureExpires}`,
        {
          method: 'PUT',
          body: new Uint8Array([1, 2, 3]),
        }
      ),
      env,
      ctx
    );

    expect(res.status).toBe(403);
  });

  it('PUT /upload/presigned/:key should reject reuse of download token for upload (cryptographic domain separation)', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const key = '2026/10/photo.jpg';
    const futureExpires = Math.floor(Date.now() / 1000) + 600;
    // Download token (does NOT include 'upload:' prefix)
    const downloadToken = await generateSignedToken(key, env.API_KEY, futureExpires);

    const res = await app.fetch(
      new Request(
        `http://localhost/upload/presigned/${key}?token=${downloadToken}&expires=${futureExpires}`,
        {
          method: 'PUT',
          body: new Uint8Array([1, 2, 3]),
        }
      ),
      env,
      ctx
    );

    expect(res.status).toBe(403);
  });

  it('PUT /upload/presigned/:key should successfully save file with valid presigned token', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const key = '2026/10/valid-upload.jpg';
    const futureExpires = Math.floor(Date.now() / 1000) + 600;
    const validToken = await generateSignedUploadToken(key, env.API_KEY, futureExpires);

    const fileBytes = new TextEncoder().encode('presigned-file-content');
    const res = await app.fetch(
      new Request(
        `http://localhost/upload/presigned/${key}?token=${validToken}&expires=${futureExpires}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'image/jpeg',
            'Content-Length': String(fileBytes.length),
          },
          body: fileBytes,
        }
      ),
      env,
      ctx
    );

    expect(res.status).toBe(201);
    const json: any = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.key).toBe(key);

    // Verify stored in R2
    const stored = (env.BUCKET as any)._store.get(key);
    expect(stored).toBeDefined();
    expect(stored.data.length).toBe(fileBytes.length);
  });
});
