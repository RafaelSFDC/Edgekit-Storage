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
