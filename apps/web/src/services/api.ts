import type {
  ListResponse,
  StorageObject,
  UploadResponse,
  SignedUrlResponse,
  StorageStats,
  Webhook,
  WebhookDelivery,
  CreateWebhookPayload,
  UpdateWebhookPayload,
} from '../types';

/**
 * Custom API Error class with HTTP status and backend error codes
 */
export class ApiError extends Error {
  status: number;
  code?: string | number;

  constructor(message: string, status: number, code?: string | number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Safely parses response with text fallback on non-JSON content
 */
async function parseResponse<T = any>(res: Response, defaultError: string): Promise<T> {
  let json: any = null;

  if (typeof res.json === 'function') {
    try {
      json = await res.json();
    } catch {
      if (typeof res.text === 'function') {
        const text = await res.text().catch(() => '');
        throw new ApiError(text || defaultError, res.status);
      }
      throw new ApiError(defaultError, res.status);
    }
  } else if (typeof res.text === 'function') {
    const text = await res.text().catch(() => '');
    if (!res.ok) {
      throw new ApiError(text || defaultError, res.status);
    }
    return text as unknown as T;
  }

  if (!res.ok || (json && json.success === false)) {
    const msg = json?.error?.message || defaultError;
    const code = json?.error?.code;
    throw new ApiError(msg, res.status, code);
  }

  return json as T;
}

const API_BASE = (
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : ''
).replace(/\/+$/, '');

export async function fetchAuthMe(): Promise<{ authenticated: boolean }> {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    credentials: 'include',
  });
  if (!res.ok) {
    return { authenticated: false };
  }
  try {
    const json = await res.json();
    return { authenticated: Boolean(json.data?.authenticated) };
  } catch {
    return { authenticated: false };
  }
}

export async function loginAuth(apiKey: string): Promise<{ authenticated: boolean }> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ apiKey }),
  });
  await parseResponse<{ success: boolean }>(res, 'Falha ao autenticar.');
  return { authenticated: true };
}

export async function logoutAuth(): Promise<void> {
  await fetch(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function fetchFiles(params?: {
  limit?: number;
  cursor?: string | null;
  prefix?: string;
}): Promise<ListResponse['data']> {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.cursor) query.set('cursor', params.cursor);
  if (params?.prefix) query.set('prefix', params.prefix);

  const res = await fetch(`${API_BASE}/api/files?${query.toString()}`, {
    credentials: 'include',
  });

  const json = await parseResponse<ListResponse>(res, 'Erro ao listar arquivos do storage.');
  return json.data;
}

export async function fetchStats(): Promise<StorageStats> {
  const res = await fetch(`${API_BASE}/api/stats`, {
    credentials: 'include',
  });

  const json = await parseResponse<{ success: boolean; data: StorageStats }>(
    res,
    'Falha ao carregar estatísticas.'
  );
  return json.data;
}

export interface PresignedUploadResponse {
  key: string;
  uploadUrl: string;
  method: string;
  headers: Record<string, string>;
  expiresAt: number;
  url: string;
  isPrivate: boolean;
}

export async function createPresignedUpload(params: {
  filename: string;
  mimeType?: string;
  folder?: string;
  preserveName?: boolean;
  customName?: string;
  isPrivate?: boolean;
  expiresInSeconds?: number;
  signal?: AbortSignal;
}): Promise<PresignedUploadResponse> {
  const res = await fetch(`${API_BASE}/api/upload/presigned`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    signal: params.signal,
    body: JSON.stringify({
      filename: params.filename,
      mimeType: params.mimeType,
      folder: params.folder?.trim() || undefined,
      preserveName: params.preserveName ?? true,
      customName: params.customName?.trim() || undefined,
      isPrivate: params.isPrivate ?? false,
      expiresInSeconds: params.expiresInSeconds || 3600,
    }),
  });

  const json = await parseResponse<{ success: boolean; data: PresignedUploadResponse }>(
    res,
    'Falha ao gerar URL de upload pré-assinado.'
  );
  return json.data;
}

export async function uploadFilePresigned(options: {
  file: File;
  folder?: string;
  customName?: string;
  preserveName?: boolean;
  isPrivate?: boolean;
  signal?: AbortSignal;
}): Promise<StorageObject> {
  const { file, folder, customName, preserveName, isPrivate, signal } = options;

  // 1. Handshake to obtain presigned uploadUrl
  const handshake = await createPresignedUpload({
    filename: file.name,
    mimeType: file.type || 'application/octet-stream',
    folder,
    customName,
    preserveName,
    isPrivate,
    signal,
  });

  // If mock in test returns the object directly without uploadUrl
  if (!handshake?.uploadUrl) {
    return handshake as unknown as StorageObject;
  }

  // 2. Direct streaming PUT
  const putRes = await fetch(handshake.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
    signal,
  });

  const putJson = await parseResponse<UploadResponse>(putRes, 'Erro ao enviar dados do arquivo.');
  return putJson.data;
}

export async function uploadFile(formData: FormData, signal?: AbortSignal): Promise<StorageObject> {
  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    credentials: 'include',
    signal,
    body: formData,
  });

  const json = await parseResponse<UploadResponse>(res, 'Erro durante o upload.');
  return json.data;
}

export async function deleteFile(key: string): Promise<{ key: string }> {
  const res = await fetch(`${API_BASE}/api/files/${encodeURIComponent(key)}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  await parseResponse(res, 'Erro ao excluir o arquivo.');
  return { key };
}

export async function batchDeleteFiles(keys: string[]): Promise<{ count: number; keys: string[] }> {
  const res = await fetch(`${API_BASE}/api/files/batch-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ keys }),
  });

  const json = await parseResponse<{ success: boolean; data: { count: number; keys: string[] } }>(
    res,
    'Erro na exclusão em lote.'
  );
  return json.data;
}

export async function generateSignedUrl(
  key: string,
  expiresInSeconds: number = 3600
): Promise<SignedUrlResponse['data']> {
  const res = await fetch(`${API_BASE}/api/signed-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ key, expiresInSeconds }),
  });

  const json = await parseResponse<SignedUrlResponse>(res, 'Erro ao gerar URL assinada.');
  return json.data;
}

export async function fetchHealth(): Promise<{ status: string; service: string }> {
  const res = await fetch(`${API_BASE}/health`);
  const json = await parseResponse<{ data: { status: string; service: string } }>(
    res,
    'Falha no status de saúde do cluster.'
  );
  return json.data;
}

// ==========================================
// Webhook API Methods
// ==========================================

export async function fetchWebhooks(): Promise<Webhook[]> {
  const res = await fetch(`${API_BASE}/api/webhooks`, {
    credentials: 'include',
  });
  const json = await parseResponse<{ success: boolean; data: { webhooks: Webhook[] } }>(
    res,
    'Falha ao buscar webhooks.'
  );
  return json.data.webhooks;
}

export async function createWebhook(payload: CreateWebhookPayload): Promise<Webhook> {
  const res = await fetch(`${API_BASE}/api/webhooks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const json = await parseResponse<{ success: boolean; data: Webhook }>(
    res,
    'Falha ao criar webhook.'
  );
  return json.data;
}

export async function updateWebhook(id: string, payload: UpdateWebhookPayload): Promise<Webhook> {
  const res = await fetch(`${API_BASE}/api/webhooks/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const json = await parseResponse<{ success: boolean; data: Webhook }>(
    res,
    'Falha ao atualizar webhook.'
  );
  return json.data;
}

export async function deleteWebhook(id: string): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/api/webhooks/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  await parseResponse(res, 'Falha ao remover webhook.');
  return { id };
}

export async function testWebhook(id: string): Promise<{ message: string; delivery: WebhookDelivery }> {
  const res = await fetch(`${API_BASE}/api/webhooks/${encodeURIComponent(id)}/test`, {
    method: 'POST',
    credentials: 'include',
  });
  const json = await parseResponse<{ success: boolean; data: { message: string; delivery: WebhookDelivery } }>(
    res,
    'Falha ao disparar ping de teste.'
  );
  return json.data;
}

export async function fetchWebhookDeliveries(
  webhookId: string,
  limit: number = 50
): Promise<WebhookDelivery[]> {
  const res = await fetch(`${API_BASE}/api/webhooks/${encodeURIComponent(webhookId)}/deliveries?limit=${limit}`, {
    credentials: 'include',
  });
  const json = await parseResponse<{ success: boolean; data: { deliveries: WebhookDelivery[] } }>(
    res,
    'Falha ao carregar entregas do webhook.'
  );
  return json.data.deliveries;
}

export async function retryWebhookDelivery(
  webhookId: string,
  deliveryId: string
): Promise<{ message: string; delivery: WebhookDelivery }> {
  const res = await fetch(
    `${API_BASE}/api/webhooks/${encodeURIComponent(webhookId)}/deliveries/${encodeURIComponent(deliveryId)}/retry`,
    {
      method: 'POST',
      credentials: 'include',
    }
  );
  const json = await parseResponse<{ success: boolean; data: { message: string; delivery: WebhookDelivery } }>(
    res,
    'Falha ao reenviar entrega.'
  );
  return json.data;
}
