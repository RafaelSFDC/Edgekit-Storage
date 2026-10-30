import { Hono } from 'hono';
import type { AppContext } from '../env';
import { apiKeyAuth } from '../middleware/auth';
import { apiError, apiSuccess } from '../utils/response';
import { isMimeAllowed, resolveMimeType, getExtensionFromFilename } from '../utils/mime';
import {
  generateStorageKey,
  resolveFileUrl,
  buildPresignedUploadUrl,
  verifySignedUploadToken,
} from '../utils/keys';
import { dispatchWebhookEvent } from '../services/webhook-dispatcher';

export const uploadRouter = new Hono<AppContext>();

/**
 * 1. DIRECT UPLOAD: POST / (Requires API Key or Session Cookie)
 * Supports single file upload or file + pre-resized variants (e.g. variant_thumb, variant_medium).
 */
uploadRouter.post('/', apiKeyAuth(), async (c) => {
  let formData: FormData;
  try {
    formData = await c.req.formData();
  } catch (err) {
    return apiError(
      c,
      'Invalid form data. Ensure Content-Type is multipart/form-data',
      400,
      err instanceof Error ? err.message : String(err)
    );
  }

  // Support "file" or "image" field as main original file
  const fileEntry = formData.get('file') || formData.get('image');

  if (!fileEntry || !(fileEntry instanceof File)) {
    return apiError(
      c,
      "No valid file provided in request body. Field must be named 'file' or 'image'",
      400
    );
  }

  const file = fileEntry as File;

  // Check file presence and empty payload
  if (file.size === 0) {
    return apiError(c, 'Uploaded file is empty (0 bytes)', 400);
  }

  // Calculate size limits
  const maxMb = Number(c.env.MAX_FILE_SIZE_MB || '25');
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return apiError(
      c,
      `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of ${maxMb} MB`,
      413
    );
  }

  // Resolve and validate MIME type
  const mimeType = resolveMimeType(file.name, file.type);
  const allowedConfig = c.env.ALLOWED_MIME_TYPES || 'image/*,application/pdf';

  if (!isMimeAllowed(mimeType, allowedConfig)) {
    return apiError(
      c,
      `File MIME type '${mimeType}' is not allowed. Allowed formats: ${allowedConfig}`,
      415
    );
  }

  // Optional parameters from form data
  const folder = formData.get('folder')?.toString() || undefined;
  const customName = formData.get('customName')?.toString() || undefined;
  const preserveName = formData.get('preserveName') === 'true' || formData.get('preserveName') === '1';
  const isPrivate = formData.get('private') === 'true' || formData.get('private') === '1';

  // Check for pre-resized variants (fields starting with variant_ or variant[name])
  const variantEntries: { name: string; file: File }[] = [];
  for (const [fieldName, value] of formData.entries()) {
    if (value instanceof File && value.size > 0) {
      let variantName: string | null = null;
      if (fieldName.startsWith('variant_')) {
        variantName = fieldName.slice('variant_'.length).trim();
      } else if (fieldName.startsWith('variant[') && fieldName.endsWith(']')) {
        variantName = fieldName.slice('variant['.length, -1).trim();
      }
      if (variantName && variantName.length > 0) {
        variantEntries.push({ name: variantName, file: value });
      }
    }
  }

  // Generate storage key for primary file
  const key = generateStorageKey({
    filename: file.name,
    folder,
    customName,
    preserveName,
    isPrivate,
  });

  try {
    // Save original to Cloudflare R2
    await c.env.BUCKET.put(key, file.stream(), {
      httpMetadata: {
        contentType: mimeType,
      },
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        uploadedVia: 'direct',
      },
    });

    const fileUrl = resolveFileUrl(key, c.req.url, c.env.PUBLIC_URL, isPrivate);

    // Save pre-resized variants if provided
    const lastDot = key.lastIndexOf('.');
    const baseKey = lastDot !== -1 ? key.slice(0, lastDot) : key;
    const variantsData: Record<
      string,
      { key: string; url: string; size: number; mimeType: string }
    > = {};

    for (const variant of variantEntries) {
      const variantMime = resolveMimeType(variant.file.name, variant.file.type);
      const variantExt =
        getExtensionFromFilename(variant.file.name) ||
        (lastDot !== -1 ? key.slice(lastDot + 1) : '');
      const variantKey = `${baseKey}_${variant.name}${variantExt ? `.${variantExt}` : ''}`;

      await c.env.BUCKET.put(variantKey, variant.file.stream(), {
        httpMetadata: {
          contentType: variantMime,
        },
        customMetadata: {
          originalName: variant.file.name,
          variantOf: key,
          variantName: variant.name,
          uploadedAt: new Date().toISOString(),
          uploadedVia: 'direct',
        },
      });

      const variantUrl = resolveFileUrl(variantKey, c.req.url, c.env.PUBLIC_URL, isPrivate);
      variantsData[variant.name] = {
        key: variantKey,
        url: variantUrl,
        size: variant.file.size,
        mimeType: variantMime,
      };
    }

    // Trigger file.uploaded webhook asynchronously via waitUntil
    dispatchWebhookEvent(c, 'file.uploaded', {
      key,
      url: fileUrl,
      size: file.size,
      mimeType,
      originalName: file.name,
      isPrivate,
      uploadedAt: new Date().toISOString(),
      uploadedVia: 'direct',
      variants: Object.keys(variantsData).length > 0 ? variantsData : undefined,
    });

    return apiSuccess(
      c,
      {
        key,
        url: fileUrl,
        size: file.size,
        mimeType,
        originalName: file.name,
        isPrivate,
        uploadedAt: new Date().toISOString(),
        ...(Object.keys(variantsData).length > 0 ? { variants: variantsData } : {}),
      },
      201
    );
  } catch (err) {
    console.error(`[Upload Error] Failed storing key ${key}:`, err);
    return apiError(
      c,
      'Failed storing file in R2 storage',
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
});

/**
 * 2. GENERATE PRESIGNED UPLOAD URL (HANDSHAKE): POST /presigned (Requires API Key)
 * Called by external backends to create temporary signed upload URLs for the main file and optional variants.
 */
uploadRouter.post('/presigned', apiKeyAuth(), async (c) => {
  let body: {
    filename?: string;
    mimeType?: string;
    folder?: string;
    preserveName?: boolean;
    customName?: string;
    isPrivate?: boolean;
    expiresInSeconds?: number;
    variants?: (string | { name: string; extension?: string })[];
  };

  try {
    body = await c.req.json();
  } catch {
    return apiError(c, 'Invalid JSON body. Expected { filename: string, ... }', 400);
  }

  const {
    filename,
    mimeType: reqMimeType,
    folder,
    preserveName = true,
    customName,
    isPrivate = false,
    expiresInSeconds = 600,
    variants: rawVariants,
  } = body;

  if (!filename || typeof filename !== 'string' || filename.trim() === '') {
    return apiError(c, 'Field "filename" is required', 400);
  }

  // Resolve and validate MIME type if specified
  const mimeType = resolveMimeType(filename, reqMimeType);
  const allowedConfig = c.env.ALLOWED_MIME_TYPES || 'image/*,application/pdf';

  if (!isMimeAllowed(mimeType, allowedConfig)) {
    return apiError(
      c,
      `File MIME type '${mimeType}' is not allowed. Allowed formats: ${allowedConfig}`,
      415
    );
  }

  const duration = Math.max(10, Math.min(Number(expiresInSeconds) || 600, 86400)); // 10s to 24h
  const maxMb = Number(c.env.MAX_FILE_SIZE_MB || '25');
  const maxBytes = maxMb * 1024 * 1024;

  const key = generateStorageKey({
    filename: filename.trim(),
    folder: folder?.trim(),
    customName: customName?.trim(),
    preserveName: Boolean(preserveName),
    isPrivate: Boolean(isPrivate),
  });

  const { uploadUrl, expiresAt } = await buildPresignedUploadUrl({
    key,
    secret: c.env.API_KEY,
    requestUrl: c.req.url,
    expiresInSeconds: duration,
  });

  const publicOrPrivateUrl = resolveFileUrl(key, c.req.url, c.env.PUBLIC_URL, isPrivate);

  // Generate presigned upload URLs for requested variants if provided
  const lastDot = key.lastIndexOf('.');
  const baseKey = lastDot !== -1 ? key.slice(0, lastDot) : key;
  const originalExt = lastDot !== -1 ? key.slice(lastDot + 1) : '';

  const variantsPresigned: Record<
    string,
    { uploadUrl: string; method: string; key: string; url: string; mimeType: string }
  > = {};

  if (Array.isArray(rawVariants) && rawVariants.length > 0) {
    for (const item of rawVariants) {
      const vName = typeof item === 'string' ? item.trim() : item?.name?.trim();
      if (!vName) continue;
      const vExt = (typeof item === 'object' && item?.extension) || originalExt || 'webp';
      const vKey = `${baseKey}_${vName}${vExt ? `.${vExt}` : ''}`;
      const vMime = resolveMimeType(vKey, typeof item === 'object' && item?.extension ? `image/${item.extension}` : mimeType);

      const presignedV = await buildPresignedUploadUrl({
        key: vKey,
        secret: c.env.API_KEY,
        requestUrl: c.req.url,
        expiresInSeconds: duration,
      });

      variantsPresigned[vName] = {
        uploadUrl: presignedV.uploadUrl,
        method: 'PUT',
        key: vKey,
        url: resolveFileUrl(vKey, c.req.url, c.env.PUBLIC_URL, isPrivate),
        mimeType: vMime,
      };
    }
  }

  return apiSuccess(
    c,
    {
      uploadUrl,
      method: 'PUT',
      key,
      url: publicOrPrivateUrl,
      expiresAt,
      expiresInSeconds: duration,
      mimeType,
      maxSizeBytes: maxBytes,
      isPrivate: Boolean(isPrivate),
      ...(Object.keys(variantsPresigned).length > 0 ? { variants: variantsPresigned } : {}),
    },
    201
  );
});

/**
 * 3. EXECUTE PRESIGNED UPLOAD: PUT /presigned/:key+ (Public endpoint validated via HMAC token)
 * Called directly by frontend/client browsers without exposing the master API Key.
 */
uploadRouter.put('/presigned/:key{.*}', async (c) => {
  const key = c.req.param('key');
  if (!key) {
    return apiError(c, 'Storage key is required in URL path', 400);
  }

  const token = c.req.query('token');
  const expires = c.req.query('expires');

  if (!token || !expires) {
    return apiError(c, 'Missing presigned token or expiration in query parameters', 403);
  }

  const expiresNum = Number(expires);
  if (isNaN(expiresNum)) {
    return apiError(c, 'Invalid expiration parameter', 400);
  }

  const isValid = await verifySignedUploadToken(key, c.env.API_KEY, token, expiresNum);
  if (!isValid) {
    return apiError(c, 'Forbidden: Presigned upload token is invalid or expired', 403);
  }

  // Check payload size if Content-Length is provided
  const contentLengthHeader = c.req.header('content-length');
  const maxMb = Number(c.env.MAX_FILE_SIZE_MB || '25');
  const maxBytes = maxMb * 1024 * 1024;

  if (contentLengthHeader && Number(contentLengthHeader) > maxBytes) {
    return apiError(
      c,
      `File size (${(Number(contentLengthHeader) / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of ${maxMb} MB`,
      413
    );
  }

  const body = c.req.raw.body;
  if (!body) {
    return apiError(c, 'Request body is empty (0 bytes received)', 400);
  }

  const contentType = c.req.header('content-type') || 'application/octet-stream';
  const resolvedMime = resolveMimeType(key, contentType);

  const allowedConfig = c.env.ALLOWED_MIME_TYPES || 'image/*,application/pdf';
  if (!isMimeAllowed(resolvedMime, allowedConfig)) {
    return apiError(
      c,
      `File MIME type '${resolvedMime}' is not allowed. Allowed formats: ${allowedConfig}`,
      415
    );
  }

  try {
    await c.env.BUCKET.put(key, body, {
      httpMetadata: {
        contentType: resolvedMime,
      },
      customMetadata: {
        originalName: key.split('/').pop() || key,
        uploadedAt: new Date().toISOString(),
        uploadedVia: 'presigned-handshake',
      },
    });

    const isPrivate = key.startsWith('private/');
    const fileUrl = resolveFileUrl(key, c.req.url, c.env.PUBLIC_URL, isPrivate);
    const size = contentLengthHeader ? Number(contentLengthHeader) : 0;

    // Trigger file.uploaded webhook asynchronously via waitUntil
    dispatchWebhookEvent(c, 'file.uploaded', {
      key,
      url: fileUrl,
      size,
      mimeType: resolvedMime,
      originalName: key.split('/').pop() || key,
      isPrivate,
      uploadedAt: new Date().toISOString(),
      uploadedVia: 'presigned-handshake',
    });

    return apiSuccess(
      c,
      {
        key,
        url: fileUrl,
        size,
        mimeType: resolvedMime,
        isPrivate,
        uploadedAt: new Date().toISOString(),
      },
      201
    );
  } catch (err) {
    console.error(`[Presigned Upload Error] Failed storing key ${key}:`, err);
    return apiError(
      c,
      'Failed storing file in R2 storage',
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
});
