import { describe, it, expect } from 'vitest';
import app from '../src/index';
import { createMockEnv, createMockExecutionContext } from './helpers/mock-env';
import { generateStorageKey, resolveFileUrl, sanitizeSegment, buildPresignedUploadUrl } from '../src/utils/keys';
import { isMimeAllowed } from '../src/utils/mime';

describe('Rigorous Backend Audit & Extreme Edge Cases Suite', () => {
  // =========================================================================
  // 1. CRASH INVESTIGATION: NULL & PRIMITIVE JSON DESTURCTURING
  // =========================================================================
  describe('Crash on Primitive / Null JSON Bodies across Endpoints', () => {
    const endpointsToAudit = [
      {
        name: 'POST /api/auth/login',
        path: '/api/auth/login',
        method: 'POST',
        requiresAuth: false,
      },
      {
        name: 'POST /upload/presigned',
        path: '/upload/presigned',
        method: 'POST',
        requiresAuth: true,
      },
      {
        name: 'POST /api/files/batch-delete',
        path: '/api/files/batch-delete',
        method: 'POST',
        requiresAuth: true,
      },
      {
        name: 'POST /api/signed-url',
        path: '/api/signed-url',
        method: 'POST',
        requiresAuth: true,
      },
      {
        name: 'POST /api/webhooks',
        path: '/api/webhooks',
        method: 'POST',
        requiresAuth: true,
      },
    ];

    for (const ep of endpointsToAudit) {
      it(`${ep.name} should return 400 Bad Request (NOT 500 Crash) when payload is JSON "null"`, async () => {
        const env = createMockEnv();
        const ctx = createMockExecutionContext();

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (ep.requiresAuth) {
          headers['X-API-Key'] = env.API_KEY;
        }

        const res = await app.fetch(
          new Request(`http://localhost${ep.path}`, {
            method: ep.method,
            headers,
            body: 'null',
          }),
          env,
          ctx
        );

        // A robust API must return 400 Bad Request, never an unhandled 500 TypeError
        expect(res.status).toBe(400);
      });

      it(`${ep.name} should return 400 Bad Request (NOT 500 Crash) when payload is a JSON number/array`, async () => {
        const env = createMockEnv();
        const ctx = createMockExecutionContext();

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (ep.requiresAuth) {
          headers['X-API-Key'] = env.API_KEY;
        }

        const res = await app.fetch(
          new Request(`http://localhost${ep.path}`, {
            method: ep.method,
            headers,
            body: '12345',
          }),
          env,
          ctx
        );

        expect(res.status).toBe(400);
      });
    }
  });

  // =========================================================================
  // 2. SECURITY AUDIT: CORS MISCONFIGURATION WITH CREDENTIALS
  // =========================================================================
  describe('CORS Wildcard & Credentials Flaw Verification', () => {
    it('CRITICAL: API must NOT reflect arbitrary malicious origins when ALLOWED_ORIGINS is empty and credentials: true', async () => {
      const env = createMockEnv({ ALLOWED_ORIGINS: '' });
      const ctx = createMockExecutionContext();

      const attackerOrigin = 'https://phishing-attacker-storage.com';
      const res = await app.fetch(
        new Request('http://localhost/api/files', {
          headers: {
            Origin: attackerOrigin,
            'X-API-Key': env.API_KEY,
          },
        }),
        env,
        ctx
      );

      const allowOrigin = res.headers.get('access-control-allow-origin');
      const allowCreds = res.headers.get('access-control-allow-credentials');

      // OWASP & Fetch Spec Rule:
      // An API allowing credentials (cookies) MUST NOT reflect arbitrary unvalidated origins.
      // If allowCreds === 'true', allowOrigin MUST NOT be the attacker origin.
      if (allowCreds === 'true') {
        expect(allowOrigin).not.toBe(attackerOrigin);
      }
    });
  });

  // =========================================================================
  // 3. ARCHITECTURAL AUDIT: PRIVATE FILE URL DUPLICATION
  // =========================================================================
  describe('Private File URL Construction Consistency', () => {
    it('resolveFileUrl must NOT produce double "/private/private/" prefix for private files', () => {
      const key = generateStorageKey({ filename: 'contract.pdf', isPrivate: true });
      expect(key.startsWith('private/')).toBe(true);

      const resolvedUrl = resolveFileUrl(key, 'http://localhost/upload', undefined, true);

      // The resolved URL should be http://localhost/private/2026/... NOT /private/private/...
      expect(resolvedUrl).not.toContain('/private/private/');
    });
  });

  // =========================================================================
  // 4. SANITIZATION & PATH TRAVERSAL DEFENSE
  // =========================================================================
  describe('Path Traversal & Injection Attack Resilience', () => {
    it('sanitizeSegment should effectively neutralize recursive "...." patterns', () => {
      // In single-pass regex replace(/\.\.+/g, ''), '....//' can collapse to dangerous combinations
      const rawPayload = '....//sensitive/folder';
      const sanitized = sanitizeSegment(rawPayload);

      expect(sanitized).not.toContain('..');
      expect(sanitized.startsWith('/')).toBe(false);
    });

    it('GET /f/:key must strictly block encoded path variations attempting to access private/', async () => {
      const env = createMockEnv();
      const ctx = createMockExecutionContext();

      await env.BUCKET.put('private/secrets/payroll.csv', new TextEncoder().encode('confidential'));

      // Variations attempting to bypass startsWith('private/')
      const bypassAttempts = [
        '/f//private/secrets/payroll.csv',
        '/f/./private/secrets/payroll.csv',
        '/f/private//secrets/payroll.csv',
      ];

      for (const attempt of bypassAttempts) {
        const res = await app.fetch(new Request(`http://localhost${attempt}`), env, ctx);
        // None of these should return 200 with private content
        expect(res.status).not.toBe(200);
      }
    });
  });

  // =========================================================================
  // 5. STORAGE & UPLOAD LIMIT AUDIT: STREAMING & CONTENT-LENGTH
  // =========================================================================
  describe('Presigned Upload Limits & Payload Verification', () => {
    it('PUT /upload/presigned/:key must enforce max file size even if Content-Length header is omitted or faked', async () => {
      // Max size: 1 MB
      const env = createMockEnv({ MAX_FILE_SIZE_MB: '1' });
      const ctx = createMockExecutionContext();

      const key = 'uploads/huge-file.png';
      const { uploadUrl } = await buildPresignedUploadUrl({
        key,
        secret: env.API_KEY,
        requestUrl: 'http://localhost/upload/presigned',
        expiresInSeconds: 600,
      });

      // 2 MB of data
      const twoMbPayload = new Uint8Array(2 * 1024 * 1024);

      // Request WITHOUT Content-Length header (e.g. chunked transfer or omitted by raw client)
      const res = await app.fetch(
        new Request(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'image/png',
          },
          body: twoMbPayload,
        }),
        env,
        ctx
      );

      // The upload should be rejected because payload exceeds 1 MB limit
      expect(res.status).toBe(413);
    });
  });

  // =========================================================================
  // 6. DATABASE INTEGRITY: D1 FOREIGN KEY CASCADE VERIFICATION
  // =========================================================================
  describe('Cloudflare D1 Database Foreign Key Enforcement', () => {
    it('Deleting a webhook record directly from D1 should cascade delete deliveries or fail if FK enabled', async () => {
      const env = createMockEnv();
      const db = env.DB!;

      // Insert webhook
      const whId = 'wh_audit_test_fk';
      await db
        .prepare(`
          INSERT INTO webhooks (id, name, url, secret, events, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(whId, 'FK Test', 'https://example.com/webhook', 'whsec_123', '["*"]', 1, new Date().toISOString(), new Date().toISOString())
        .run();

      // Insert delivery linked to this webhook
      const delId = 'del_audit_test_1';
      await db
        .prepare(`
          INSERT INTO webhook_deliveries (id, webhook_id, event_id, event_type, payload, success, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(delId, whId, 'evt_1', 'ping', '{}', 1, new Date().toISOString())
        .run();

      // Verify delivery exists
      const beforeDel = await db.prepare('SELECT id FROM webhook_deliveries WHERE id = ?').bind(delId).first();
      expect(beforeDel).toBeDefined();

      // Delete webhook directly (simulate raw query or admin cleanup)
      await db.prepare('DELETE FROM webhooks WHERE id = ?').bind(whId).run();

      // Check whether delivery was cascaded
      const afterDel = await db.prepare('SELECT id FROM webhook_deliveries WHERE id = ?').bind(delId).first();

      // In a database with enforced foreign keys (ON DELETE CASCADE), the orphaned delivery should be deleted.
      expect(afterDel).toBeNull();
    });
  });

  // =========================================================================
  // 7. WEBHOOK SECURITY & SSRF VULNERABILITY AUDIT
  // =========================================================================
  describe('Webhook SSRF (Server-Side Request Forgery) Audit', () => {
    it('POST /api/webhooks should reject internal / private IP addresses (SSRF prevention)', async () => {
      const env = createMockEnv();
      const ctx = createMockExecutionContext();

      const internalTargets = [
        'http://127.0.0.1:8080/internal-admin',
        'http://localhost:8787/private-vault',
        'http://169.254.169.254/latest/meta-data/', // Cloud metadata service
        'http://0.0.0.0/',
      ];

      for (const targetUrl of internalTargets) {
        const res = await app.fetch(
          new Request('http://localhost/api/webhooks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': env.API_KEY,
            },
            body: JSON.stringify({
              name: 'SSRF Probe',
              url: targetUrl,
            }),
          }),
          env,
          ctx
        );

        // A secure webhook engine should reject private IP ranges to prevent SSRF
        expect(res.status).toBe(400);
      }
    });

    it('POST /api/webhooks should reject IPv6 link-local and unique-local private addresses', async () => {
      const env = createMockEnv();
      const ctx = createMockExecutionContext();

      const ipv6Private = [
        'http://[fe80::1]/webhook',
        'http://[fd00::1]/webhook',
        'http://[::1]:8080/hook',
      ];

      for (const targetUrl of ipv6Private) {
        const res = await app.fetch(
          new Request('http://localhost/api/webhooks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': env.API_KEY,
            },
            body: JSON.stringify({
              name: 'IPv6 SSRF Probe',
              url: targetUrl,
            }),
          }),
          env,
          ctx
        );

        expect(res.status).toBe(400);
      }
    });
  });

  // =========================================================================
  // 8. SECURITY HEADERS & SVG XSS DEFENSE
  // =========================================================================
  describe('SVG Stored XSS & MIME Security Headers', () => {
    it('GET /f/:key serves SVG with Content-Security-Policy sandbox and X-Content-Type-Options: nosniff', async () => {
      const env = createMockEnv();
      const ctx = createMockExecutionContext();

      const svgKey = 'images/vector-icon.svg';
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
      await env.BUCKET.put(svgKey, new TextEncoder().encode(svgContent), {
        httpMetadata: { contentType: 'image/svg+xml' },
      });

      const res = await app.fetch(new Request(`http://localhost/f/${svgKey}`), env, ctx);
      expect(res.status).toBe(200);

      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
      expect(res.headers.get('content-security-policy')).toContain("default-src 'none'");
      expect(res.headers.get('content-security-policy')).toContain('sandbox');
    });

    it('GET /private/:key also enforces CSP sandbox and nosniff for private SVG files', async () => {
      const env = createMockEnv();
      const ctx = createMockExecutionContext();

      const svgKey = 'private/charts/q3.svg';
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>';
      await env.BUCKET.put(svgKey, new TextEncoder().encode(svgContent), {
        httpMetadata: { contentType: 'image/svg+xml' },
      });

      const res = await app.fetch(
        new Request(`http://localhost/private/charts/q3.svg`, {
          headers: { 'X-API-Key': env.API_KEY },
        }),
        env,
        ctx
      );
      expect(res.status).toBe(200);
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
      expect(res.headers.get('content-security-policy')).toContain('sandbox');
    });
  });

  // =========================================================================
  // 9. PAGINATION & BATCH LIMIT SAFEGUARDS
  // =========================================================================
  describe('Pagination & Batch Limit Safeguards', () => {
    it('GET /api/files should safely handle negative or invalid limit parameters', async () => {
      const env = createMockEnv();
      const ctx = createMockExecutionContext();

      const resNegative = await app.fetch(
        new Request('http://localhost/api/files?limit=-10', {
          headers: { 'X-API-Key': env.API_KEY },
        }),
        env,
        ctx
      );
      expect(resNegative.status).toBe(200);

      const resNaN = await app.fetch(
        new Request('http://localhost/api/files?limit=invalid', {
          headers: { 'X-API-Key': env.API_KEY },
        }),
        env,
        ctx
      );
      expect(resNaN.status).toBe(200);
    });

    it('POST /api/files/batch-delete should reject batches exceeding 1000 keys with 400 Bad Request', async () => {
      const env = createMockEnv();
      const ctx = createMockExecutionContext();

      const excessiveKeys = Array.from({ length: 1001 }, (_, i) => `file_${i}.png`);

      const res = await app.fetch(
        new Request('http://localhost/api/files/batch-delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': env.API_KEY,
          },
          body: JSON.stringify({ keys: excessiveKeys }),
        }),
        env,
        ctx
      );

      expect(res.status).toBe(400);
      const json: any = await res.json();
      expect(json.error.message).toContain('1000 keys');
    });
  });

  // =========================================================================
  // 10. HEALTH CHECK DEPENDENCY READINESS
  // =========================================================================
  describe('Health Check Readiness Probe', () => {
    it('GET /health returns 200 and dependency statuses when healthy', async () => {
      const env = createMockEnv();
      const ctx = createMockExecutionContext();

      const res = await app.fetch(new Request('http://localhost/health'), env, ctx);
      expect(res.status).toBe(200);

      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.dependencies.r2).toBe('ok');
    });
  });

  // =========================================================================
  // 11. VARIANT UPLOAD MIME & SIZE HARDENING (SEC-01 & SEC-02)
  // =========================================================================
  describe('Variant Upload MIME & Size Limit Enforcement', () => {
    it('POST /upload must reject forbidden MIME types in variant files (SEC-01)', async () => {
      const env = createMockEnv({ ALLOWED_MIME_TYPES: 'image/png' });
      const ctx = createMockExecutionContext();

      const form = new FormData();
      const validFile = new File(['valid png'], 'test.png', { type: 'image/png' });
      const forbiddenVariant = new File(['echo exploit'], 'exploit.sh', { type: 'application/x-sh' });

      form.append('file', validFile);
      form.append('variant_exploit', forbiddenVariant);

      const res = await app.fetch(
        new Request('http://localhost/upload', {
          method: 'POST',
          headers: {
            'X-API-Key': env.API_KEY,
          },
          body: form,
        }),
        env,
        ctx
      );

      expect(res.status).toBe(415);
      const json: any = await res.json();
      expect(json.error.message).toContain('not allowed');
    });

    it('POST /upload must reject variants exceeding MAX_FILE_SIZE_MB (SEC-02)', async () => {
      const env = createMockEnv({ MAX_FILE_SIZE_MB: '1' });
      const ctx = createMockExecutionContext();

      const form = new FormData();
      const validFile = new File(['valid png'], 'test.png', { type: 'image/png' });
      const hugeVariant = new File([new Uint8Array(2 * 1024 * 1024)], 'thumb.png', { type: 'image/png' });

      form.append('file', validFile);
      form.append('variant_huge', hugeVariant);

      const res = await app.fetch(
        new Request('http://localhost/upload', {
          method: 'POST',
          headers: {
            'X-API-Key': env.API_KEY,
          },
          body: form,
        }),
        env,
        ctx
      );

      expect(res.status).toBe(413);
      const json: any = await res.json();
      expect(json.error.message).toContain('exceeds maximum allowed limit');
    });
  });

  // =========================================================================
  // 12. MIME PARAMETER HANDLING & SVG CSP SANDBOX (BUG-02 & SEC-03)
  // =========================================================================
  describe('MIME Parameter Normalization & SVG Sandbox CSP', () => {
    it('isMimeAllowed must permit valid MIME types with parameters such as charset', () => {
      expect(isMimeAllowed('application/pdf; charset=utf-8', 'image/*,application/pdf')).toBe(true);
      expect(isMimeAllowed('image/svg+xml; charset=UTF-8', 'image/*')).toBe(true);
      expect(isMimeAllowed('text/plain; charset=iso-8859-1', 'image/*')).toBe(false);
    });

    it('GET /f/:key must enforce Content-Security-Policy sandbox on SVG even with parameters in MIME', async () => {
      const env = createMockEnv();
      const ctx = createMockExecutionContext();

      const svgKey = 'images/vector-param.svg';
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
      await env.BUCKET.put(svgKey, new TextEncoder().encode(svgContent), {
        httpMetadata: { contentType: 'image/svg+xml; charset=utf-8' },
      });

      const res = await app.fetch(new Request(`http://localhost/f/${svgKey}`), env, ctx);
      expect(res.status).toBe(200);

      const csp = res.headers.get('content-security-policy');
      expect(csp).toBeDefined();
      expect(csp).toContain('sandbox');
      expect(csp).toContain("default-src 'none'");
    });
  });

  // =========================================================================
  // 13. TYPE RESILIENCE ON OPTIONAL BODY FIELDS (BUG-01)
  // =========================================================================
  describe('Type Resilience On Malformed Optional Body Fields', () => {
    it('POST /upload/presigned handles numeric customName cleanly without 500 error', async () => {
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
            filename: 'photo.png',
            customName: 12345,
          }),
        }),
        env,
        ctx
      );

      // Successfully handles request or validates with 200/201 (not 500 crash)
      expect(res.status).toBe(201);
    });

    it('PUT /api/webhooks/:id returns 400 Bad Request for non-string fields', async () => {
      const env = createMockEnv();
      const ctx = createMockExecutionContext();

      // Create webhook
      const createRes = await app.fetch(
        new Request('http://localhost/api/webhooks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': env.API_KEY,
          },
          body: JSON.stringify({
            name: 'Original Hook',
            url: 'https://example.com/webhook',
          }),
        }),
        env,
        ctx
      );
      const created: any = await createRes.json();
      const id = created.data.id;

      // Update with invalid types
      const updateRes = await app.fetch(
        new Request(`http://localhost/api/webhooks/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': env.API_KEY,
          },
          body: JSON.stringify({
            name: { invalid: true },
          }),
        }),
        env,
        ctx
      );

      expect(updateRes.status).toBe(400);
    });
  });

  // =========================================================================
  // 14. CROSS-ORIGIN LOGOUT COOKIE DIRECTIVES (SEC-04)
  // =========================================================================
  describe('Cross-Origin Session Cookie Logout Directives', () => {
    it('POST /api/auth/logout includes SameSite=None and Secure on cross-origin requests', async () => {
      const env = createMockEnv();
      const ctx = createMockExecutionContext();

      const res = await app.fetch(
        new Request('https://api.example.com/api/auth/logout', {
          method: 'POST',
          headers: {
            Origin: 'https://dashboard.example.com',
          },
        }),
        env,
        ctx
      );

      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toBeDefined();
      expect(setCookie?.toLowerCase()).toContain('samesite=none');
      expect(setCookie?.toLowerCase()).toContain('secure');
    });
  });
});
