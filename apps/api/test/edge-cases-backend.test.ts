import { describe, it, expect } from 'vitest';
import app from '../src/index';
import { createMockEnv, createMockExecutionContext } from './helpers/mock-env';
import { generateStorageKey, resolveFileUrl } from '../src/utils/keys';

describe('Backend Edge Cases, Concurrency & Security Flaws Suite', () => {
  it('AUDIT: CORS configuration behavior when ALLOWED_ORIGINS is empty', async () => {
    // When ALLOWED_ORIGINS is empty (production default in wrangler.jsonc vars)
    const env = createMockEnv({ ALLOWED_ORIGINS: '' });
    const ctx = createMockExecutionContext();

    const evilOrigin = 'https://malicious-phishing-site.com';
    const res = await app.fetch(
      new Request('http://localhost/api', {
        headers: { Origin: evilOrigin },
      }),
      env,
      ctx
    );

    const allowOriginHeader = res.headers.get('access-control-allow-origin');

    // Secure behavior: unallowed origin is NOT reflected
    expect(allowOriginHeader).toBeNull();
  });

  it('AUDIT: Double private prefix in resolveFileUrl for private files', () => {
    const key = generateStorageKey({ filename: 'secret.pdf', isPrivate: true });
    expect(key.startsWith('private/')).toBe(true);

    const resolvedUrl = resolveFileUrl(key, 'http://localhost/upload', undefined, true);
    // Checks that the resolved URL does NOT contain '/private/private/'
    const hasDoublePrivate = resolvedUrl.includes('/private/private/');
    expect(hasDoublePrivate).toBe(false);
  });

  it('AUDIT: Handling of URL-encoded slashes (%2F) in delete route', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const actualKey = 'documents/contracts/deal.pdf';
    await env.BUCKET.put(actualKey, new Uint8Array([1, 2, 3]));
    expect((env.BUCKET as any)._store.has(actualKey)).toBe(true);

    // Frontend uses encodeURIComponent(key) which encodes slashes to %2F
    const encodedKey = encodeURIComponent(actualKey); // "documents%2Fcontracts%2Fdeal.pdf"

    await app.fetch(
      new Request(`http://localhost/api/files/${encodedKey}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': env.API_KEY },
      }),
      env,
      ctx
    );

    // Verify whether actualKey was deleted
    const wasDeleted = !(env.BUCKET as any)._store.has(actualKey);
    expect(wasDeleted).toBe(true);
  });

  it('should handle filenames with Unicode, emojis, accents and spaces safely', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const unicodeFile = new File(
      [new TextEncoder().encode('unicode-content')],
      'relatório de finanças 📊 2026.pdf',
      { type: 'application/pdf' }
    );

    const formData = new FormData();
    formData.append('file', unicodeFile);

    const res = await app.fetch(
      new Request('http://localhost/upload', {
        method: 'POST',
        headers: { 'X-API-Key': env.API_KEY },
        body: formData,
      }),
      env,
      ctx
    );

    expect(res.status).toBe(201);
    const json: any = await res.json();
    expect(json.success).toBe(true);
    // Storage key should be clean of raw unsafe characters
    expect(json.data.key).not.toContain('📊');
    expect(json.data.key).not.toContain(' ');
  });

  it('should handle filenames with extremely long names (500+ characters)', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const longBase = 'a'.repeat(500);
    const longFile = new File(['content'], `${longBase}.png`, { type: 'image/png' });

    const formData = new FormData();
    formData.append('file', longFile);

    const res = await app.fetch(
      new Request('http://localhost/upload', {
        method: 'POST',
        headers: { 'X-API-Key': env.API_KEY },
        body: formData,
      }),
      env,
      ctx
    );

    expect(res.status).toBe(201);
    const json: any = await res.json();
    expect(json.success).toBe(true);
  });

  it('should gracefully handle malformed JSON in POST endpoints without crashing', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const malformedPayloads = [
      '{ broken json',
      '{"key": undefined}',
      'null',
      '',
      '[]',
    ];

    for (const payload of malformedPayloads) {
      const res = await app.fetch(
        new Request('http://localhost/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        }),
        env,
        ctx
      );

      // Should return 400 Bad Request, never unhandled 500 crash
      expect([400, 401]).toContain(res.status);
    }
  });

  it('should handle 20 concurrent file uploads without collision or state corruption', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const uploads = Array.from({ length: 20 }, (_, idx) => {
      const formData = new FormData();
      formData.append(
        'file',
        new File([`data-${idx}`], `image_${idx}.png`, { type: 'image/png' })
      );
      formData.append('folder', 'concurrent-test');

      return app.fetch(
        new Request('http://localhost/upload', {
          method: 'POST',
          headers: { 'X-API-Key': env.API_KEY },
          body: formData,
        }),
        env,
        ctx
      );
    });

    const responses = await Promise.all(uploads);
    for (const res of responses) {
      expect(res.status).toBe(201);
    }

    const jsonResults = await Promise.all(responses.map((r) => r.json()));
    const keys = jsonResults.map((j: any) => j.data.key);
    // All 20 generated storage keys MUST be unique
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(20);
  });
});
