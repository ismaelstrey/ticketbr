import { afterAll, beforeAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import http from "node:http";
import { S3StorageAdapter } from "./s3-adapter";

async function readBody(request: http.IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function startFakeS3(bucket: string) {
  const objects = new Map<string, { body: Buffer; contentType?: string; lastModified: Date }>();

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const [requestBucket, ...keyParts] = url.pathname.split("/").filter(Boolean);
    const key = decodeURIComponent(keyParts.join("/"));

    if (requestBucket !== bucket) {
      response.statusCode = 404;
      response.end();
      return;
    }

    if (request.method === "HEAD" && !key) {
      response.statusCode = 200;
      response.end();
      return;
    }

    if (request.method === "PUT" && key) {
      objects.set(key, {
        body: await readBody(request),
        contentType: request.headers["content-type"],
        lastModified: new Date()
      });
      response.statusCode = 200;
      response.end();
      return;
    }

    if (request.method === "GET" && url.searchParams.get("list-type") === "2") {
      const prefix = url.searchParams.get("prefix") ?? "";
      const maxKeys = Number(url.searchParams.get("max-keys") ?? 100);
      const contents = Array.from(objects.entries())
        .filter(([objectKey]) => objectKey.startsWith(prefix))
        .slice(0, Number.isFinite(maxKeys) ? maxKeys : 100)
        .map(([objectKey, item]) => `
          <Contents>
            <Key>${escapeXml(objectKey)}</Key>
            <LastModified>${item.lastModified.toISOString()}</LastModified>
            <ETag>"${crypto.createHash("md5").update(item.body).digest("hex")}"</ETag>
            <Size>${item.body.length}</Size>
          </Contents>`)
        .join("");

      response.statusCode = 200;
      response.setHeader("Content-Type", "application/xml");
      response.end(`<?xml version="1.0" encoding="UTF-8"?>
        <ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
          <Name>${escapeXml(bucket)}</Name>
          <Prefix>${escapeXml(prefix)}</Prefix>
          <KeyCount>${objects.size}</KeyCount>
          <MaxKeys>${maxKeys}</MaxKeys>
          <IsTruncated>false</IsTruncated>
          ${contents}
        </ListBucketResult>`);
      return;
    }

    if (request.method === "GET" && key) {
      const item = objects.get(key);
      if (!item) {
        response.statusCode = 404;
        response.end();
        return;
      }
      if (item.contentType) response.setHeader("Content-Type", item.contentType);
      response.statusCode = 200;
      response.end(item.body);
      return;
    }

    if (request.method === "DELETE" && key) {
      objects.delete(key);
      response.statusCode = 204;
      response.end();
      return;
    }

    response.statusCode = 501;
    response.end();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Fake S3 server did not start");

  return {
    endpoint: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  };
}

describe("S3StorageAdapter (integration via local S3 fake)", () => {
  let fakeS3: Awaited<ReturnType<typeof startFakeS3>> | undefined;
  let endpoint: string;
  const bucket = "ticketbr-test";
  const region = "us-east-1";
  const accessKeyId = "test";
  const secretAccessKey = "test";

  beforeAll(async () => {
    fakeS3 = await startFakeS3(bucket);
    endpoint = fakeS3.endpoint;
  }, 20_000);

  afterAll(async () => {
    if (fakeS3) {
      await fakeS3.close();
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
