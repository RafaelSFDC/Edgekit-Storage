import { describe, it, expect } from 'vitest';
import app from '../src/index';
import { createMockEnv, createMockExecutionContext } from './helpers/mock-env';
import { generateStorageKey, resolveFileUrl, sanitizeSegment, buildPresignedUploadUrl } from '../src/utils/keys';

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
  });
});
