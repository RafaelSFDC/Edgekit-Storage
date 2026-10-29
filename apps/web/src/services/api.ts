import type { ListResponse, StorageObject, UploadResponse, SignedUrlResponse } from '../types';

/**
 * API client functions with credentials/cookie support for EdgeKit Storage
 */

export async function fetchAuthMe(): Promise<{ authenticated: boolean }> {
  const res = await fetch('/api/auth/me', {
    credentials: 'include',
  });
  if (!res.ok) {
    return { authenticated: false };
  }
  const json = await res.json();
  return { authenticated: Boolean(json.data?.authenticated) };
}

export async function loginAuth(apiKey: string): Promise<{ authenticated: boolean }> {
  const res = await fetch('/api/auth/login', {
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
  await fetch('/api/auth/logout', {
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

  const res = await fetch(`/api/files?${query.toString()}`, {
    credentials: 'include',
  });

  const json: ListResponse = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Erro ao listar arquivos do storage.');
  }
  return json.data;
}

export async function uploadFile(formData: FormData): Promise<StorageObject> {
  const res = await fetch('/upload', {
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
  const res = await fetch(`/api/files/${encodeURIComponent(key)}`, {
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
  const res = await fetch('/api/files/batch-delete', {
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
  const res = await fetch('/api/signed-url', {
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
  const res = await fetch('/health');
  if (!res.ok) {
    throw new Error('Falha no status de saúde do cluster.');
  }
  const json = await res.json();
  return json.data;
}
