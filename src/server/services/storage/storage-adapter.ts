export interface StorageObjectEntry {
  key: string;
  lastModified?: Date;
  size?: number;
  etag?: string;
}

export interface StoragePutOptions {
  key: string;
  body: Buffer;
  contentType?: string;
  acl?: "private" | "public-read";
}

export interface StorageListOptions {
  prefix?: string;
  maxKeys?: number;
}

export interface StorageSignedUrlOptions {
  key: string;
  expiresInSeconds?: number;
  contentType?: string;
  acl?: "private" | "public-read";
  downloadFileName?: string;
}

export interface StorageAdapter {
  validate(): Promise<{ ok: true } | { ok: false; error: string }>;
  putObject(options: StoragePutOptions): Promise<void>;
  getObjectBuffer(key: string): Promise<{ body: Buffer; contentType?: string }>;
  getSignedUploadUrl(options: StorageSignedUrlOptions): Promise<string>;
  getSignedDownloadUrl(options: StorageSignedUrlOptions): Promise<string>;
  listObjects(options?: StorageListOptions): Promise<StorageObjectEntry[]>;
  deleteObject(key: string): Promise<void>;
}

