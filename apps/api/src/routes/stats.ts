import { Hono } from 'hono';
import type { AppContext } from '../env';
import { apiKeyAuth } from '../middleware/auth';
import { apiSuccess, apiError } from '../utils/response';

export const statsRouter = new Hono<AppContext>();

/**
 * GET /api/stats
 * Aggregates file and storage statistics directly from R2 bucket.
 * Requires API Key authentication.
 */
statsRouter.get('/', apiKeyAuth(), async (c) => {
  try {
    let totalFiles = 0;
    let totalBytes = 0;
    let privateFiles = 0;
    let publicFiles = 0;
    const folders = new Set<string>();

    let truncated = true;
    let cursor: string | undefined = undefined;

    while (truncated) {
      const listed = await c.env.BUCKET.list({
        limit: 1000,
        cursor,
      });

      for (const obj of listed.objects) {
        totalFiles++;
        totalBytes += obj.size;
        if (obj.key.startsWith('private/')) {
          privateFiles++;
        } else {
          publicFiles++;
        }

        const slashIdx = obj.key.lastIndexOf('/');
        if (slashIdx !== -1) {
          const folderPath = obj.key.slice(0, slashIdx);
          folders.add(folderPath);
        }
      }

      truncated = listed.truncated;
      cursor = listed.truncated ? listed.cursor : undefined;
    }

    return apiSuccess(c, {
      totalFiles,
      totalBytes,
      privateFiles,
      publicFiles,
      foldersCount: folders.size,
    });
  } catch (err) {
    console.error('[Stats Error]:', err);
    return apiError(c, 'Failed to compute storage statistics', 500);
  }
});
