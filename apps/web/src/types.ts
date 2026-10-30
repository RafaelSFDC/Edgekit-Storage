export interface StorageObject {
  key: string;
  size: number;
  uploadedAt: string;
  mimeType: string;
  url: string;
  etag?: string;
  isPrivate?: boolean;
  customMetadata?: Record<string, string>;
}

export interface ListResponse {
  success: boolean;
  data: {
    objects: StorageObject[];
    truncated: boolean;
    cursor: string | null;
    delimitedPrefixes?: string[];
  };
  error?: {
    message: string;
    code?: string | number;
  };
}

export interface UploadResponse {
  success: boolean;
  data: StorageObject;
  error?: {
    message: string;
    code?: string | number;
  };
}

export interface SignedUrlResponse {
  success: boolean;
  data: {
    url: string;
    key: string;
    expiresAt: string;
    expiresInSeconds: number;
  };
  error?: {
    message: string;
  };
}

export interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  result?: StorageObject;
}

export interface StorageStats {
  totalFiles: number;
  totalBytes: number;
  privateFiles: number;
  publicFiles: number;
  foldersCount: number;
}

export interface WebhookStats {
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  lastDeliveryAt: string | null;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  filterPrefix: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stats?: WebhookStats;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventId: string;
  eventType: string;
  payload: string;
  statusCode: number | null;
  responseBody: string | null;
  durationMs: number;
  success: boolean;
  errorMessage: string | null;
  attempt: number;
  createdAt: string;
}

export interface CreateWebhookPayload {
  name: string;
  url: string;
  secret?: string;
  events?: string[];
  filterPrefix?: string | null;
  isActive?: boolean;
}

export interface UpdateWebhookPayload {
  name?: string;
  url?: string;
  secret?: string;
  events?: string[];
  filterPrefix?: string | null;
  isActive?: boolean;
}
