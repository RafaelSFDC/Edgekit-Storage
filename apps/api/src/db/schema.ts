/**
 * Automatic table initialization for Cloudflare D1
 * Ensures tables exist without requiring manual migration steps in dev.
 */

let isSchemaInitialized = false;

export async function ensureD1Schema(db?: D1Database): Promise<boolean> {
  if (!db) {
    return false;
  }

  if (isSchemaInitialized) {
    return true;
  }

  try {
    await db.batch([
      db.prepare(`
        CREATE TABLE IF NOT EXISTS webhooks (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          url TEXT NOT NULL,
          secret TEXT NOT NULL,
          events TEXT NOT NULL DEFAULT '["*"]',
          filter_prefix TEXT,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS webhook_deliveries (
          id TEXT PRIMARY KEY,
          webhook_id TEXT NOT NULL,
          event_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          payload TEXT NOT NULL,
          status_code INTEGER,
          response_body TEXT,
          duration_ms INTEGER,
          success INTEGER NOT NULL DEFAULT 0,
          error_message TEXT,
          attempt INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE
        );
      `),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_webhooks_is_active ON webhooks(is_active);`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries(created_at DESC);`),
    ]);

    isSchemaInitialized = true;
    return true;
  } catch (err) {
    console.warn('[D1 Schema Warning]: Failed to auto-initialize schema:', err);
    return false;
  }
}
