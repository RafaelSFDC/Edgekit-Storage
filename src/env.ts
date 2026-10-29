export interface Bindings {
  /**
   * Cloudflare R2 Bucket binding
   */
  BUCKET: R2Bucket;

  /**
   * Secret API Key required for upload, delete, and list operations
   */
  API_KEY: string;

  /**
   * Direct public URL of your R2 bucket.
   * e.g. "https://media.yourdomain.com" or "https://pub-xxxxxx.r2.dev"
   * If left blank, falls back to the Worker URL ("/f/:key").
   */
  PUBLIC_URL?: string;

  /**
   * Comma-separated list of allowed MIME types or wildcards.
   * e.g. "image/*,application/pdf" or "*" for any type.
   */
  ALLOWED_MIME_TYPES?: string;

  /**
   * Maximum allowed file upload size in Megabytes. Defaults to 25 MB.
   */
  MAX_FILE_SIZE_MB?: string;

  /**
   * Whether to enable public file streaming via Worker route /f/:key as a fallback.
   * Defaults to "true".
   */
  ENABLE_WORKER_FALLBACK_STREAM?: string;

  /**
   * Static assets fetcher for serving the React Dashboard
   */
  ASSETS?: Fetcher;
}

export type AppContext = {
  Bindings: Bindings;
};
