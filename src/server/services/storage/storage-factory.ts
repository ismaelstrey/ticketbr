import type { StorageAdapter } from "./storage-adapter";
import { S3StorageAdapter } from "./s3-adapter";
import type { StorageRuntimeConfig } from "@/server/services/storage-settings";

export function createStorageAdapter(config: StorageRuntimeConfig): StorageAdapter {
  return new S3StorageAdapter(config);
}

