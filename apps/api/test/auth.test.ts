import { describe, it, expect } from 'vitest';
import app from '../src/index';
import { createMockEnv, createMockExecutionContext } from './helpers/mock-env';
import { AUTH_COOKIE_NAME } from '../src/middleware/auth';
import { timingSafeEqualStr } from '../src/utils/keys';

describe('Backend Auth & Security Suite', () => {
  it('should return 500 when API_KEY is not configured in the worker environment', async () => {
    const env = createMockEnv({ API_KEY: '' });
    const ctx = createMockExecutionContext();

    const res = await app.fetch(
      new Request('http://localhost/api/files', {
        headers: { 'X-API-Key': 'some-key' },
      }),
      env,
      ctx
    );

    expect(res.status).toBe(500);
    const json: any = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.message).toContain('Server authentication is not configured');
  });

  it('should return 401 when no authentication credentials are provided', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const res = await app.fetch(new Request('http://localhost/api/files'), env, ctx);
    expect(res.status).toBe(401);
    const json: any = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.message).toContain('Unauthorized');
  });

  it('should authenticate successfully with X-API-Key header', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const res = await app.fetch(
      new Request('http://localhost/api/files', {
        headers: { 'X-API-Key': env.API_KEY },
      }),
      env,
      ctx
    );

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.success).toBe(true);
  });

  it('should reject invalid X-API-Key header', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const res = await app.fetch(
      new Request('http://localhost/api/files', {
        headers: { 'X-API-Key': 'wrong-key-00000' },
      }),
      env,
      ctx
    );

    expect(res.status).toBe(401);
  });

  it('should authenticate successfully with Authorization: Bearer <token>', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const res = await app.fetch(
      new Request('http://localhost/api/files', {
        headers: { Authorization: `Bearer ${env.API_KEY}` },
      }),
      env,
      ctx
    );

    expect(res.status).toBe(200);
  });

  it('should reject malformed or invalid Authorization header', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const res = await app.fetch(
      new Request('http://localhost/api/files', {
        headers: { Authorization: 'Basic dXNlcjpwYXNz' },
      }),
      env,
      ctx
    );

    expect(res.status).toBe(401);
  });

  it('should authenticate successfully with HttpOnly session cookie', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const res = await app.fetch(
      new Request('http://localhost/api/files', {
        headers: { Cookie: `${AUTH_COOKIE_NAME}=${env.API_KEY}` },
      }),
      env,
      ctx
    );

    expect(res.status).toBe(200);
  });

  it('should authenticate with query parameter ?apiKey=<token>', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const res = await app.fetch(
      new Request(`http://localhost/api/files?apiKey=${env.API_KEY}`),
      env,
      ctx
    );

    expect(res.status).toBe(200);
  });

  it('POST /api/auth/login should set HttpOnly session cookie on valid credentials', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const res = await app.fetch(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: env.API_KEY }),
      }),
      env,
      ctx
    );

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.authenticated).toBe(true);

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain(AUTH_COOKIE_NAME);
    expect(setCookie?.toLowerCase()).toContain('httponly');
    expect(setCookie?.toLowerCase()).toContain('samesite=lax');
  });

  it('POST /api/auth/login should reject invalid or missing apiKey field', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const emptyBodyRes = await app.fetch(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
      env,
      ctx
    );
    expect(emptyBodyRes.status).toBe(400);

    const wrongKeyRes = await app.fetch(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: 'wrong-key-xyz' }),
      }),
      env,
      ctx
    );
    expect(wrongKeyRes.status).toBe(401);
  });

  it('POST /api/auth/logout should clear session cookie', async () => {
    const env = createMockEnv();
    const ctx = createMockExecutionContext();

    const res = await app.fetch(
      new Request('http://localhost/api/auth/logout', {
        method: 'POST',
      }),
      env,
      ctx
    );

    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain(AUTH_COOKIE_NAME);
  });

  it('timingSafeEqualStr: should correctly compare identical and non-identical strings', () => {
    expect(timingSafeEqualStr('token_secret_12345', 'token_secret_12345')).toBe(true);
    expect(timingSafeEqualStr('token_secret_12345', 'token_secret_99999')).toBe(false);
    expect(timingSafeEqualStr('short', 'longer_string_value')).toBe(false);
  });
});
