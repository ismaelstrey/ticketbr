import { afterAll, beforeAll, describe, expect, it } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import crypto from "node:crypto";
import S3rver from "s3rver";
import { S3Client, CreateBucketCommand } from "@aws-sdk/client-s3";
import { S3StorageAdapter } from "./s3-adapter";

function tmpDir(prefix: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return dir;
}

describe("S3StorageAdapter (integration via s3rver)", () => {
  let s3rver: any;
  let endpoint: string;
  const bucket = "ticketbr-test";
  const region = "us-east-1";
  const accessKeyId = "S3RVER";
  const secretAccessKey = "S3RVER";

  beforeAll(async () => {
    const dir = tmpDir("ticketbr-s3-");
    const port = 4569 + Math.floor(Math.random() * 1000);
    s3rver = new S3rver({
      address: "127.0.0.1",
      port,
      directory: dir,
      silent: true
    });
    await s3rver.run();
    endpoint = `http://127.0.0.1:${port}`;

    const client = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey }
    });
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  }, 20_000);

  afterAll(async () => {
    if (s3rver) {
      await s3rver.close();
    }
  });

  it("puts, lists, gets, and deletes objects", async () => {
    const adapter = new S3StorageAdapter({
      provider: "minio",
      accessKeyId,
      secretAccessKey,
      region,
      bucket,
      endpoint,
      forcePathStyle: true,
      defaultAcl: "private"
    });

    const validate = await adapter.validate();
    expect(validate.ok).toBe(true);

    const key = `uploads/${crypto.randomUUID()}.txt`;
    await adapter.putObject({ key, body: Buffer.from("hello"), contentType: "text/plain" });

    const list = await adapter.listObjects({ prefix: "uploads/", maxKeys: 50 });
    expect(list.some((item) => item.key === key)).toBe(true);

    const fetched = await adapter.getObjectBuffer(key);
    expect(fetched.contentType).toBe("text/plain");
    expect(fetched.body.toString("utf8")).toBe("hello");

    await adapter.deleteObject(key);
    const listAfter = await adapter.listObjects({ prefix: "uploads/", maxKeys: 50 });
    expect(listAfter.some((item) => item.key === key)).toBe(false);
  }, 20_000);

  it("fails validation for missing bucket", async () => {
    const adapter = new S3StorageAdapter({
      provider: "minio",
      accessKeyId,
      secretAccessKey,
      region,
      bucket: "missing-bucket",
      endpoint,
      forcePathStyle: true,
      defaultAcl: "private"
    });

    const validate = await adapter.validate();
    expect(validate.ok).toBe(false);
  });
});
