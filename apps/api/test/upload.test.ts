import { describe, it, expect } from 'vitest';
import app from '../src/index';
import { createMockEnv, createMockExecutionContext } from './helpers/mock-env';

describe('Backend Upload Pipeline Suite', () => {
  it('should reject request without valid multipart/form-data or missing file field', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const emptyFormData = new FormData();
    const res = await app.fetch(
      new Request('http://localhost/upload', {
        method: 'POST',
        headers: { 'X-API-Key': env.API_KEY },
        body: emptyFormData,
      }),
      env,
      ctx
    );

    expect(res.status).toBe(400);
    const json: any = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.message).toContain('No valid file provided');
  });

  it('should reject empty (0 bytes) file upload', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const formData = new FormData();
    const emptyFile = new File([''], 'empty.png', { type: 'image/png' });
    formData.append('file', emptyFile);

    const res = await app.fetch(
      new Request('http://localhost/upload', {
        method: 'POST',
        headers: { 'X-API-Key': env.API_KEY },
        body: formData,
      }),
      env,
      ctx
    );

    expect(res.status).toBe(400);
    const json: any = await res.json();
    expect(json.error.message).toContain('Uploaded file is empty (0 bytes)');
  });

  it('should reject files exceeding MAX_FILE_SIZE_MB limit with HTTP 413', async () => {
    // Configured max size: 1 MB
    const env = createMockEnv({ MAX_FILE_SIZE_MB: '1' });
    const ctx = createMockExecutionContext();

    // Create a 1.5 MB payload
    const largeBuffer = new Uint8Array(1.5 * 1024 * 1024);
    const largeFile = new File([largeBuffer], 'large-image.png', { type: 'image/png' });

    const formData = new FormData();
    formData.append('file', largeFile);

    const res = await app.fetch(
      new Request('http://localhost/upload', {
        method: 'POST',
        headers: { 'X-API-Key': env.API_KEY },
        body: formData,
      }),
      env,
      ctx
    );

    expect(res.status).toBe(413);
    const json: any = await res.json();
    expect(json.error.message).toContain('exceeds maximum allowed limit');
  });

  it('should reject disallowed MIME types with HTTP 415', async () => {
    const env = createMockEnv({ ALLOWED_MIME_TYPES: 'image/*,application/pdf' });
    const ctx = createMockExecutionContext();

    const scriptFile = new File(['echo "malicious"'], 'exploit.sh', {
      type: 'application/x-sh',
    });
    const formData = new FormData();
    formData.append('file', scriptFile);

    const res = await app.fetch(
      new Request('http://localhost/upload', {
        method: 'POST',
        headers: { 'X-API-Key': env.API_KEY },
        body: formData,
      }),
      env,
      ctx
    );

    expect(res.status).toBe(415);
    const json: any = await res.json();
    expect(json.error.message).toContain('is not allowed');
  });

  it('should successfully store valid image file in R2 and return metadata', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const sampleBytes = new TextEncoder().encode('fake-png-binary-stream');
    const validFile = new File([sampleBytes], 'avatar.png', { type: 'image/png' });

    const formData = new FormData();
    formData.append('file', validFile);
    formData.append('folder', 'profiles');

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
    expect(json.data.key).toContain('profiles/');
    expect(json.data.key.endsWith('.png')).toBe(true);
    expect(json.data.mimeType).toBe('image/png');
    expect(json.data.size).toBe(sampleBytes.length);

    // Verify file actually exists in R2 bucket
    const r2Item = (env.BUCKET as any)._store.get(json.data.key);
    expect(r2Item).toBeDefined();
    expect(r2Item.data.length).toBe(sampleBytes.length);
  });

  it('should store pre-resized variants alongside the original file', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const original = new File(['orig-data'], 'banner.jpg', { type: 'image/jpeg' });
    const thumb = new File(['thumb-data'], 'banner_thumb.webp', { type: 'image/webp' });
    const medium = new File(['medium-data'], 'banner_medium.webp', { type: 'image/webp' });

    const formData = new FormData();
    formData.append('file', original);
    formData.append('variant_thumb', thumb);
    formData.append('variant[medium]', medium);

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
    expect(json.data.variants).toBeDefined();
    expect(json.data.variants.thumb).toBeDefined();
    expect(json.data.variants.medium).toBeDefined();

    // Verify variants stored in R2
    expect((env.BUCKET as any)._store.has(json.data.variants.thumb.key)).toBe(true);
    expect((env.BUCKET as any)._store.has(json.data.variants.medium.key)).toBe(true);
  });

  it('should sanitize path traversal attempts in folder and customName parameters', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const file = new File(['test'], 'doc.pdf', { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', '../../../sensitive/folder/..');
    formData.append('customName', '../../etc/passwd');

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
    // Key should NOT contain '..' or unescaped slashes
    expect(json.data.key).not.toContain('..');
    expect(json.data.key.startsWith('/')).toBe(false);
  });
});
