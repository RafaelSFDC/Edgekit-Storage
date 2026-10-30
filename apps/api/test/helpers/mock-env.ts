import type { Bindings } from '../../src/env';

export interface MockR2StoredObject {
  key: string;
  data: Uint8Array;
  httpMetadata?: { contentType?: string };
  customMetadata?: Record<string, string>;
  uploaded: Date;
  httpEtag: string;
}

export function createMockR2Bucket() {
  const store = new Map<string, MockR2StoredObject>();

  return {
    _store: store,
    async put(
      key: string,
      value: any,
      options?: {
        httpMetadata?: { contentType?: string };
        customMetadata?: Record<string, string>;
      }
    ) {
      let bytes: Uint8Array;
      if (value instanceof Uint8Array) {
        bytes = value;
      } else if (typeof value === 'string') {
        bytes = new TextEncoder().encode(value);
      } else if (value && typeof value.getReader === 'function') {
        // ReadableStream
        const reader = value.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value: chunk } = await reader.read();
          if (done) break;
          chunks.push(chunk);
        }
        const total = chunks.reduce((acc, c) => acc + c.length, 0);
        bytes = new Uint8Array(total);
        let offset = 0;
        for (const c of chunks) {
          bytes.set(c, offset);
          offset += c.length;
        }
      } else if (value instanceof Blob || value instanceof File) {
        bytes = new Uint8Array(await value.arrayBuffer());
      } else {
        bytes = new Uint8Array();
      }

      const stored: MockR2StoredObject = {
        key,
        data: bytes,
        httpMetadata: options?.httpMetadata,
        customMetadata: options?.customMetadata,
        uploaded: new Date(),
        httpEtag: `W/"mock-etag-${key}-${Date.now()}"`,
      };
      store.set(key, stored);

      return {
        key,
        size: bytes.length,
        httpEtag: stored.httpEtag,
        uploaded: stored.uploaded,
        httpMetadata: stored.httpMetadata,
        customMetadata: stored.customMetadata,
      };
    },

    async get(key: string, options?: { onlyIf?: Headers; range?: Headers }) {
      const item = store.get(key);
      if (!item) return null;

      // Handle conditional request (If-None-Match)
      if (options?.onlyIf) {
        const ifNoneMatch = options.onlyIf.get('if-none-match');
        if (ifNoneMatch && (ifNoneMatch === item.httpEtag || ifNoneMatch === '*')) {
          return {
            key: item.key,
            size: item.data.length,
            httpEtag: item.httpEtag,
            uploaded: item.uploaded,
            httpMetadata: item.httpMetadata,
            customMetadata: item.customMetadata,
            writeHttpMetadata: (h: Headers) => {
              if (item.httpMetadata?.contentType) {
                h.set('content-type', item.httpMetadata.contentType);
              }
            },
          };
        }
      }

      // ReadableStream for body
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(item.data);
          controller.close();
        },
      });

      return {
        key: item.key,
        size: item.data.length,
        httpEtag: item.httpEtag,
        uploaded: item.uploaded,
        httpMetadata: item.httpMetadata,
        customMetadata: item.customMetadata,
        body: stream,
        writeHttpMetadata: (h: Headers) => {
          if (item.httpMetadata?.contentType) {
            h.set('content-type', item.httpMetadata.contentType);
          }
        },
      };
    },

    async head(key: string) {
      const item = store.get(key);
      if (!item) return null;
      return {
        key: item.key,
        size: item.data.length,
        httpEtag: item.httpEtag,
        uploaded: item.uploaded,
        httpMetadata: item.httpMetadata,
        customMetadata: item.customMetadata,
      };
    },

    async delete(keys: string | string[]) {
      const toDelete = Array.isArray(keys) ? keys : [keys];
      for (const k of toDelete) {
        store.delete(k);
      }
    },

    async list(options?: {
      limit?: number;
      cursor?: string;
      prefix?: string;
      delimiter?: string;
    }) {
      const limit = options?.limit ?? 20;
      let all = Array.from(store.values());

      if (options?.prefix) {
        all = all.filter((o) => o.key.startsWith(options.prefix!));
      }

      const startIndex = options?.cursor ? parseInt(options.cursor, 10) : 0;
      const sliced = all.slice(startIndex, startIndex + limit);
      const isTruncated = startIndex + limit < all.length;
      const nextCursor = isTruncated ? String(startIndex + limit) : undefined;

      return {
        objects: sliced.map((item) => ({
          key: item.key,
          size: item.data.length,
          httpEtag: item.httpEtag,
          uploaded: item.uploaded,
          httpMetadata: item.httpMetadata,
          customMetadata: item.customMetadata,
        })),
        truncated: isTruncated,
        cursor: nextCursor,
        delimitedPrefixes: [] as string[],
      };
    },
  };
}

export function createMockD1Database() {
  const webhooks = new Map<string, any>();
  const deliveries = new Map<string, any>();

  function createStatement(sql: string, boundParams: any[] = []) {
    return {
      bind(...params: any[]) {
        return createStatement(sql, params);
      },
      async all<T = any>() {
        const s = sql.trim().toUpperCase();
        if (s.includes('SELECT * FROM WEBHOOKS ORDER BY CREATED_AT DESC')) {
          const results = Array.from(webhooks.values()).sort(
            (a, b) => b.created_at.localeCompare(a.created_at)
          );
          return { results: results as T[], success: true };
        }
        if (s.includes('SELECT * FROM WEBHOOKS WHERE IS_ACTIVE = 1')) {
          const results = Array.from(webhooks.values()).filter((w) => w.is_active === 1);
          return { results: results as T[], success: true };
        }
        if (s.includes('FROM WEBHOOK_DELIVERIES') && s.includes('GROUP BY WEBHOOK_ID')) {
          const map = new Map<string, any>();
          for (const d of deliveries.values()) {
            if (!map.has(d.webhook_id)) {
              map.set(d.webhook_id, {
                webhook_id: d.webhook_id,
                total_deliveries: 0,
                successful_deliveries: 0,
                failed_deliveries: 0,
                last_delivery_at: null,
              });
            }
            const st = map.get(d.webhook_id);
            st.total_deliveries++;
            if (d.success === 1) st.successful_deliveries++;
            else st.failed_deliveries++;
            if (!st.last_delivery_at || d.created_at > st.last_delivery_at) {
              st.last_delivery_at = d.created_at;
            }
          }
          return { results: Array.from(map.values()) as T[], success: true };
        }
        if (s.includes('FROM WEBHOOK_DELIVERIES') && s.includes('WHERE WEBHOOK_ID = ?')) {
          const whId = boundParams[0];
          const limit = boundParams[1] || 50;
          const matching = Array.from(deliveries.values())
            .filter((d) => d.webhook_id === whId)
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .slice(0, limit);
          return { results: matching as T[], success: true };
        }
        return { results: [] as T[], success: true };
      },
      async first<T = any>() {
        const s = sql.trim().toUpperCase();
        if (s.includes('SELECT * FROM WEBHOOKS WHERE ID = ?')) {
          return (webhooks.get(boundParams[0]) || null) as T;
        }
        if (s.includes('SELECT ID FROM WEBHOOKS WHERE ID = ?')) {
          const wh = webhooks.get(boundParams[0]);
          return wh ? ({ id: wh.id } as T) : null;
        }
        if (s.includes('WHERE ID = ? AND WEBHOOK_ID = ?')) {
          const [dId, whId] = boundParams;
          const d = deliveries.get(dId);
          if (d && d.webhook_id === whId) return d as T;
          return null;
        }
        return null;
      },
      async run() {
        const s = sql.trim().toUpperCase();
        if (s.startsWith('INSERT INTO WEBHOOKS')) {
          const [
            id,
            name,
            url,
            secret,
            events,
            filter_prefix,
            is_active,
            created_at,
            updated_at,
          ] = boundParams;
          webhooks.set(id, {
            id,
            name,
            url,
            secret,
            events,
            filter_prefix,
            is_active,
            created_at,
            updated_at,
          });
          return { success: true };
        }
        if (s.startsWith('UPDATE WEBHOOKS')) {
          const [
            name,
            url,
            secret,
            events,
            filter_prefix,
            is_active,
            updated_at,
            id,
          ] = boundParams;
          const existing = webhooks.get(id);
          if (existing) {
            webhooks.set(id, {
              ...existing,
              name,
              url,
              secret,
              events,
              filter_prefix,
              is_active,
              updated_at,
            });
          }
          return { success: true };
        }
        if (s.startsWith('DELETE FROM WEBHOOK_DELIVERIES WHERE WEBHOOK_ID = ?')) {
          const whId = boundParams[0];
          for (const [k, v] of Array.from(deliveries.entries())) {
            if (v.webhook_id === whId) deliveries.delete(k);
          }
          return { success: true };
        }
        if (s.startsWith('DELETE FROM WEBHOOKS WHERE ID = ?')) {
          webhooks.delete(boundParams[0]);
          return { success: true };
        }
        if (s.startsWith('INSERT INTO WEBHOOK_DELIVERIES')) {
          const [
            id,
            webhook_id,
            event_id,
            event_type,
            payload,
            status_code,
            response_body,
            duration_ms,
            success,
            error_message,
            attempt,
            created_at,
          ] = boundParams;
          deliveries.set(id, {
            id,
            webhook_id,
            event_id,
            event_type,
            payload,
            status_code,
            response_body,
            duration_ms,
            success,
            error_message,
            attempt,
            created_at,
          });
          return { success: true };
        }
        return { success: true };
      },
    };
  }

  return {
    _webhooks: webhooks,
    _deliveries: deliveries,
    prepare(sql: string) {
      return createStatement(sql);
    },
    async batch(statements: any[]) {
      const results = [];
      for (const stmt of statements) {
        results.push(await stmt.run());
      }
      return results;
    },
  };
}

export function createMockExecutionContext() {
  const promises: Promise<any>[] = [];
  return {
    waitUntil(promise: Promise<any>) {
      promises.push(promise);
    },
    async drain() {
      await Promise.allSettled(promises);
    },
  };
}

export function createMockEnv(overrides?: Partial<Bindings>): Bindings {
  return {
    BUCKET: createMockR2Bucket() as any,
    DB: createMockD1Database() as any,
    API_KEY: 'test-api-key-12345',
    PUBLIC_URL: 'http://localhost:8787/f',
    ALLOWED_MIME_TYPES: 'image/*,application/pdf',
    MAX_FILE_SIZE_MB: '25',
    ENABLE_WORKER_FALLBACK_STREAM: 'true',
    ALLOWED_ORIGINS: 'http://localhost:3000,http://localhost:5173',
    ...overrides,
  };
}
