import { Hono } from 'hono';
import type { AppContext } from '../env';
import { apiKeyAuth } from '../middleware/auth';
import { apiError, apiSuccess } from '../utils/response';
import { isMimeAllowed, resolveMimeType } from '../utils/mime';
import { generateStorageKey, resolveFileUrl } from '../utils/keys';

export const uploadRouter = new Hono<AppContext>();

// Require API key for uploads
uploadRouter.use('*', apiKeyAuth());

uploadRouter.post('/', async (c) => {
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

  // Support "file" or "image" field
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

  // Generate storage key
  const key = generateStorageKey({
    filename: file.name,
    folder,
    customName,
    preserveName,
    isPrivate,
  });

  try {
    // Save to Cloudflare R2
    await c.env.BUCKET.put(key, file.stream(), {
      httpMetadata: {
        contentType: mimeType,
      },
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    const fileUrl = resolveFileUrl(key, c.req.url, c.env.PUBLIC_URL, isPrivate);

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
