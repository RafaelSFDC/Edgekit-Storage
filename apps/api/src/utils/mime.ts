const COMMON_EXTENSIONS: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  avif: 'image/avif',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  pdf: 'application/pdf',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  json: 'application/json',
  txt: 'text/plain',
};

/**
 * Extracts the file extension (in lower-case without the dot) from a filename.
 */
export function getExtensionFromFilename(filename: string): string {
  const parts = filename.split('.');
  if (parts.length <= 1) return '';
  return (parts.pop() || '').toLowerCase().trim();
}

/**
 * Detects or improves MIME type if file.type is generic or missing.
 */
export function resolveMimeType(filename: string, reportedType?: string): string {
  if (reportedType && reportedType !== 'application/octet-stream' && reportedType.trim() !== '') {
    return reportedType.toLowerCase();
  }
  const ext = getExtensionFromFilename(filename);
  if (ext && COMMON_EXTENSIONS[ext]) {
    return COMMON_EXTENSIONS[ext];
  }
  return reportedType || 'application/octet-stream';
}

/**
 * Verifies if a given MIME type is allowed according to the configured pattern list.
 * Supports '*' (all allowed), 'image/*' (wildcard subtypes), and exact matches like 'application/pdf'.
 */
export function isMimeAllowed(mimeType: string, allowedConfig?: string): boolean {
  const config = (allowedConfig || 'image/*,application/pdf').trim();

  // If set to wildcard '*', all types are permitted
  if (config === '*') {
    return true;
  }

  const normalizedMime = mimeType.toLowerCase().trim();
  const allowedRules = config
    .split(',')
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean);

  for (const rule of allowedRules) {
    if (rule === '*') {
      return true;
    }
    if (rule.endsWith('/*')) {
      const typePrefix = rule.slice(0, -1); // e.g. "image/"
      if (normalizedMime.startsWith(typePrefix)) {
        return true;
      }
    } else if (rule === normalizedMime) {
      return true;
    }
  }

  return false;
}
