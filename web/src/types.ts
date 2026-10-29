export interface StorageObject {
  key: string;
  size: number;
  uploadedAt: string;
  mimeType: string;
  url: string;
  etag?: string;
  isPrivate?: boolean;
}

export interface UploadResponse {
  success: boolean;
  data: StorageObject & {
    originalName?: string;
  };
  error?: {
    message: string;
    details?: unknown;
  };
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
  };
}

export interface UploadItem {
  id: string;
  file: File;
  previewUrl?: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  result?: StorageObject;
}
