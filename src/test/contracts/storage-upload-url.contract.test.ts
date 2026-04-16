import { beforeEach, describe, expect, it, vi } from "vitest";
import { EnvelopeWithErrorSchema, StorageUploadUrlResponseSchema } from "./schemas";

const getSessionMock = vi.fn();
const getStorageConfigFromDatabaseMock = vi.fn();
const createStorageAdapterMock = vi.fn();
const writeAuditLogMock = vi.fn();
const getSignedUploadUrlMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  getSession: getSessionMock,
}));

vi.mock("@/server/services/storage-settings", () => ({
  getStorageConfigFromDatabase: getStorageConfigFromDatabaseMock,
}));

vi.mock("@/server/services/storage/storage-factory", () => ({
  createStorageAdapter: createStorageAdapterMock,
}));

vi.mock("@/server/services/audit-log", () => ({
  writeAuditLog: writeAuditLogMock,
}));

describe("API Contract - POST /api/storage/upload-url", () => {
  beforeEach(() => {
    vi.resetModules();
    getSessionMock.mockReset();
    getStorageConfigFromDatabaseMock.mockReset();
    createStorageAdapterMock.mockReset();
    writeAuditLogMock.mockReset();
    getSignedUploadUrlMock.mockReset();
    createStorageAdapterMock.mockReturnValue({
      getSignedUploadUrl: getSignedUploadUrlMock,
    });
  });

  it("returns upload URL contract for admin users", async () => {
    getSessionMock.mockResolvedValueOnce({ id: "u1", role: "ADMIN" });
    getStorageConfigFromDatabaseMock.mockResolvedValueOnce({ bucket: "ticketbr-bucket", provider: "s3" });
    getSignedUploadUrlMock.mockResolvedValueOnce("https://storage.example.com/upload?sig=1");

    const { POST } = await import("@/app/api/storage/upload-url/route");
    const req = new Request("http://localhost/api/storage/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "docs/ticket-1.pdf", contentType: "application/pdf" }),
    });

    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(StorageUploadUrlResponseSchema.safeParse(body).success).toBe(true);
    expect(writeAuditLogMock).toHaveBeenCalledTimes(1);
  });

  it("returns unauthorized contract when no session is present", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const { POST } = await import("@/app/api/storage/upload-url/route");
    const req = new Request("http://localhost/api/storage/upload-url", { method: "POST" });
    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(EnvelopeWithErrorSchema.safeParse(body).success).toBe(true);
  });

  it("returns forbidden contract for non-admin users", async () => {
    getSessionMock.mockResolvedValueOnce({ id: "u2", role: "AGENT" });

    const { POST } = await import("@/app/api/storage/upload-url/route");
    const req = new Request("http://localhost/api/storage/upload-url", { method: "POST" });
    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(EnvelopeWithErrorSchema.safeParse(body).success).toBe(true);
  });
});
