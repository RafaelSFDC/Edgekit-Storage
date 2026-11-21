import { describe, it, expect } from 'vitest';
import app from '../src/index';
import { createMockEnv, createMockExecutionContext } from './helpers/mock-env';
import { generateSessionToken } from '../src/utils/keys';
import { AUTH_COOKIE_NAME } from '../src/middleware/auth';

describe('GET /api/stats Suite', () => {
  it('GET /api/stats should require authentication', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const res = await app.fetch(new Request('http://localhost/api/stats'), env, ctx);
    expect(res.status).toBe(401);
  });

  it('GET /api/stats should return zeroes when bucket is empty', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const res = await app.fetch(
      new Request('http://localhost/api/stats', {
        headers: { 'X-API-Key': env.API_KEY },
      }),
      env,
      ctx
    );

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual({
      totalFiles: 0,
      totalBytes: 0,
      privateFiles: 0,
      publicFiles: 0,
      foldersCount: 0,
    });
  });

  it('GET /api/stats should correctly aggregate file counts, bytes, and folders', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    // Populate mock bucket with files
    await env.BUCKET.put('images/photo1.png', new Uint8Array(1024));
    await env.BUCKET.put('images/photo2.png', new Uint8Array(2048));
    await env.BUCKET.put('documents/pdf/contract.pdf', new Uint8Array(4096));
    await env.BUCKET.put('private/vault/keys.txt', new Uint8Array(512));
    await env.BUCKET.put('root-file.txt', new Uint8Array(100));

    const res = await app.fetch(
      new Request('http://localhost/api/stats', {
        headers: { 'X-API-Key': env.API_KEY },
      }),
      env,
      ctx
    );

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.totalFiles).toBe(5);
    expect(json.data.totalBytes).toBe(1024 + 2048 + 4096 + 512 + 100);
    expect(json.data.privateFiles).toBe(1);
    expect(json.data.publicFiles).toBe(4);
    // Folders: 'images', 'documents/pdf', 'private/vault' -> 3 distinct folder paths
    expect(json.data.foldersCount).toBe(3);
  });

  it('GET /api/stats should authenticate with HMAC signed session cookie', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const sessionToken = await generateSessionToken(env.API_KEY);

    const res = await app.fetch(
      new Request('http://localhost/api/stats', {
        headers: { Cookie: `${AUTH_COOKIE_NAME}=${sessionToken}` },
      }),
      env,
      ctx
    );

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.success).toBe(true);
  });
});
