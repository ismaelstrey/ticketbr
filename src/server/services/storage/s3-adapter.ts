import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand, HeadBucketCommand, PutBucketLifecycleConfigurationCommand } from "@aws-sdk/client-s3";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "node:stream";
import type { StorageAdapter, StorageListOptions, StorageObjectEntry, StoragePutOptions, StorageSignedUrlOptions } from "./storage-adapter";
import type { StorageRuntimeConfig } from "@/server/services/storage-settings";

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function normalizeError(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

export class S3StorageAdapter implements StorageAdapter {
  private s3: S3Client;
  private sts: STSClient | null;
  private bucket: string;
  private region: string;
  private defaultAcl: "private" | "public-read";
  private retentionDays?: number;

  constructor(config: StorageRuntimeConfig) {
    this.bucket = config.bucket;
    this.region = config.region;
    this.defaultAcl = config.defaultAcl ?? "private";
    this.retentionDays = config.retentionDays;

    this.s3 = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: Boolean(config.forcePathStyle),
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });

    this.sts = config.provider === "aws"
      ? new STSClient({
        region: config.region,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey
        }
      })
      : null;
  }

  async validate() {
    try {
      if (this.sts) {
        await this.sts.send(new GetCallerIdentityCommand({}));
      }

      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));

      if (typeof this.retentionDays === "number" && Number.isFinite(this.retentionDays) && this.retentionDays > 0) {
        await this.s3.send(
          new PutBucketLifecycleConfigurationCommand({
            Bucket: this.bucket,
            LifecycleConfiguration: {
              Rules: [
                {
                  ID: "ticketbr-retention",
                  Status: "Enabled",
                  Filter: { Prefix: "" },
                  Expiration: { Days: this.retentionDays }
                }
              ]
            }
          })
        );
      }

      return { ok: true } as const;
    } catch (error) {
      return { ok: false, error: normalizeError(error) } as const;
    }
  }

  async putObject(options: StoragePutOptions) {
    const acl = options.acl ?? this.defaultAcl;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: options.key,
        Body: options.body,
        ContentType: options.contentType,
        ACL: acl
      })
    );
  }

  async getObjectBuffer(key: string) {
    const out = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const bodyStream = out.Body as Readable | undefined;
    if (!bodyStream) {
      return { body: Buffer.alloc(0), contentType: out.ContentType };
    }
    const body = await streamToBuffer(bodyStream);
    return { body, contentType: out.ContentType };
  }

  async getSignedUploadUrl(options: StorageSignedUrlOptions) {
    const expiresInSeconds = options.expiresInSeconds ?? 60;
    const acl = options.acl ?? this.defaultAcl;
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: options.key,
      ContentType: options.contentType,
      ACL: acl
    });
    return getSignedUrl(this.s3, cmd, { expiresIn: expiresInSeconds });
  }

  async getSignedDownloadUrl(options: StorageSignedUrlOptions) {
    const expiresInSeconds = options.expiresInSeconds ?? 60;
    const disposition = options.downloadFileName
      ? `attachment; filename="${options.downloadFileName.replace(/"/g, "")}"`
      : undefined;

    const cmd = new GetObjectCommand({
      Bucket: this.bucket,
      Key: options.key,
      ResponseContentDisposition: disposition
    });
    return getSignedUrl(this.s3, cmd, { expiresIn: expiresInSeconds });
  }

  async listObjects(options?: StorageListOptions): Promise<StorageObjectEntry[]> {
    const out = await this.s3.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: options?.prefix,
        MaxKeys: options?.maxKeys ?? 100
      })
    );

    return (out.Contents ?? [])
      .filter((item) => Boolean(item.Key))
      .map((item) => ({
        key: String(item.Key),
        lastModified: item.LastModified,
        size: typeof item.Size === "number" ? item.Size : undefined,
        etag: item.ETag ? String(item.ETag) : undefined
      }));
  }

  async deleteObject(key: string) {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

