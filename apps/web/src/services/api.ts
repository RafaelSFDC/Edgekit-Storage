import type {
  ListResponse,
  StorageObject,
  UploadResponse,
  SignedUrlResponse,
  Webhook,
  WebhookDelivery,
  CreateWebhookPayload,
  UpdateWebhookPayload,
} from '../types';

/**
 * API client functions with credentials/cookie support for EdgeKit Storage
 */

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
  const json = await res.json();
  return { authenticated: Boolean(json.data?.authenticated) };
}

export async function loginAuth(apiKey: string): Promise<{ authenticated: boolean }> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ apiKey }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Falha ao autenticar.');
  }
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

  const json: ListResponse = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Erro ao listar arquivos do storage.');
  }
  return json.data;
}

export async function uploadFile(formData: FormData): Promise<StorageObject> {
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  const json: UploadResponse = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Erro durante o upload.');
  }
  return json.data;
}

export async function deleteFile(key: string): Promise<{ key: string }> {
  const res = await fetch(`${API_BASE}/api/files/${encodeURIComponent(key)}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Erro ao excluir o arquivo.');
  }
  return { key };
}

export async function batchDeleteFiles(keys: string[]): Promise<{ count: number; keys: string[] }> {
  const res = await fetch(`${API_BASE}/api/files/batch-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ keys }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Erro na exclusão em lote.');
  }
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

  const json: SignedUrlResponse = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Erro ao gerar URL assinada.');
  }
  return json.data;
}

export async function fetchHealth(): Promise<{ status: string; service: string }> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) {
    throw new Error('Falha no status de saúde do cluster.');
  }
  const json = await res.json();
  return json.data;
}

// ==========================================
// Webhook API Methods
// ==========================================

export async function fetchWebhooks(): Promise<Webhook[]> {
  const res = await fetch(`${API_BASE}/api/webhooks`, {
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Falha ao buscar webhooks.');
  }
  return json.data.webhooks;
}

export async function createWebhook(payload: CreateWebhookPayload): Promise<Webhook> {
  const res = await fetch(`${API_BASE}/api/webhooks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Falha ao criar webhook.');
  }
  return json.data;
}

export async function updateWebhook(id: string, payload: UpdateWebhookPayload): Promise<Webhook> {
  const res = await fetch(`${API_BASE}/api/webhooks/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Falha ao atualizar webhook.');
  }
  return json.data;
}

export async function deleteWebhook(id: string): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/api/webhooks/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Falha ao remover webhook.');
  }
  return json.data;
}

export async function testWebhook(id: string): Promise<{ message: string; delivery: WebhookDelivery }> {
  const res = await fetch(`${API_BASE}/api/webhooks/${encodeURIComponent(id)}/test`, {
    method: 'POST',
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Falha ao disparar ping de teste.');
  }
  return json.data;
}

export async function fetchWebhookDeliveries(
  webhookId: string,
  limit: number = 50
): Promise<WebhookDelivery[]> {
  const res = await fetch(`${API_BASE}/api/webhooks/${encodeURIComponent(webhookId)}/deliveries?limit=${limit}`, {
    credentials: 'include',
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Falha ao carregar entregas do webhook.');
  }
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
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Falha ao reenviar entrega.');
  }
  return json.data;
}
