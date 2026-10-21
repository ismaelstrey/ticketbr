import { beforeEach, describe, expect, it, vi } from "vitest";

const requireStaffSessionMock = vi.fn();
const credentialFindFirstMock = vi.fn();
const credentialUpdateMock = vi.fn();
const equipmentFindFirstMock = vi.fn();
const sharedSecretFindFirstMock = vi.fn();
const userFindUniqueMock = vi.fn();
const resolveCredentialAccessBatchMock = vi.fn();
const writeAuditLogMock = vi.fn();

const { PrismaClientKnownRequestError } = vi.hoisted(() => {
  class PrismaClientKnownRequestError extends Error {
    code: string;
    constructor(message: string, options: { code: string }) {
      super(message);
      this.code = options.code;
    }
  }
  return { PrismaClientKnownRequestError };
});

vi.mock("@/server/services/staff-context", () => ({ requireStaffSession: requireStaffSessionMock }));
vi.mock("@/server/services/audit-log", () => ({ writeAuditLog: writeAuditLogMock }));
vi.mock("@/server/services/inventory-access", () => ({
  resolveCredentialAccessBatch: resolveCredentialAccessBatchMock
}));
vi.mock("@/lib/vault", () => ({
  MASKED_SECRET: "••••••••",
  encryptSecret: () => ({ alg: "aes-256-gcm", keyVersion: 1, iv: "a", tag: "b", ciphertext: "rotated" }),
  isEncryptedPayload: (value: unknown) =>
    Boolean(value && typeof value === "object" && (value as Record<string, unknown>).alg === "aes-256-gcm")
}));
vi.mock("@/lib/prisma", () => ({
  Prisma: { PrismaClientKnownRequestError },
  prisma: {
    equipmentCredential: { findFirst: credentialFindFirstMock, update: credentialUpdateMock },
    equipment: { findFirst: equipmentFindFirstMock },
    clientSharedSecret: { findFirst: sharedSecretFindFirstMock },
    user: { findUnique: userFindUniqueMock }
  }
}));

const session = { userId: "u1", role: "ADMIN", name: "Admin", email: "a@a.com" };

function credentialRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "c1",
    equipmentId: null,
    label: "Admin",
    protocol: "SSH",
    port: 22,
    username: "root",
    notes: null,
    accessPolicy: "OWNER_AND_ADMINS",
    ownerUserId: "u1",
    owner: { id: "u1", name: "Admin" },
    equipment: null,
    sharedSecretId: null,
    sharedSecret: null,
    lastRotatedAt: null,
    created_at: new Date("2024-01-01T00:00:00Z"),
    updated_at: new Date("2024-01-01T00:00:00Z"),
    ...overrides
  };
}

describe("/api/inventory/credentials/[id]", () => {
  beforeEach(() => {
    vi.resetModules();
    requireStaffSessionMock.mockReset().mockResolvedValue(session);
    credentialFindFirstMock.mockReset();
    credentialUpdateMock.mockReset();
    equipmentFindFirstMock.mockReset();
    sharedSecretFindFirstMock.mockReset();
    userFindUniqueMock.mockReset();
    resolveCredentialAccessBatchMock.mockReset().mockResolvedValue(new Map());
    writeAuditLogMock.mockReset();
  });

  it("GET retorna a credencial com a senha mascarada", async () => {
    credentialFindFirstMock.mockResolvedValueOnce(credentialRow());

    const { GET } = await import("./route");
    const res = await GET({} as any, { params: Promise.resolve({ id: "c1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.secret).toBe("••••••••");
  });

  it("GET retorna 404 quando a credencial não existe", async () => {
    credentialFindFirstMock.mockResolvedValueOnce(null);

    const { GET } = await import("./route");
    const res = await GET({} as any, { params: Promise.resolve({ id: "x" }) });

    expect(res.status).toBe(404);
  });

  it("PUT com nova senha recifra, marca rotação e audita", async () => {
    credentialFindFirstMock.mockResolvedValueOnce({ id: "c1", label: "Admin" });
    credentialUpdateMock.mockResolvedValueOnce(credentialRow({ lastRotatedAt: new Date() }));

    const { PUT } = await import("./route");
    const req = { json: async () => ({ secret: "nova-senha" }) } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: "c1" }) });

    expect(res.status).toBe(200);
    const data = credentialUpdateMock.mock.calls[0][0].data;
    expect(data.secret.ciphertext).toBe("rotated");
    expect(data.lastRotatedAt).toBeInstanceOf(Date);
    expect(writeAuditLogMock.mock.calls[0][0].action).toBe("inventory.credential_rotated");
  });

  it("PUT sem senha apenas atualiza os demais campos", async () => {
    credentialFindFirstMock.mockResolvedValueOnce({ id: "c1", label: "Admin" });
    credentialUpdateMock.mockResolvedValueOnce(credentialRow({ label: "Renomeada" }));

    const { PUT } = await import("./route");
    const req = { json: async () => ({ label: "Renomeada" }) } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: "c1" }) });

    expect(res.status).toBe(200);
    expect(credentialUpdateMock.mock.calls[0][0].data.secret).toBeUndefined();
    expect(writeAuditLogMock.mock.calls[0][0].action).toBe("inventory.credential_updated");
  });

  it("PUT retorna 404 quando a credencial não existe", async () => {
    credentialFindFirstMock.mockResolvedValueOnce(null);

    const { PUT } = await import("./route");
    const req = { json: async () => ({ label: "x" }) } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: "x" }) });

    expect(res.status).toBe(404);
  });

  it("PUT retorna 400 quando o payload é inválido", async () => {
    const { PUT } = await import("./route");
    const req = { json: async () => ({ port: 0 }) } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: "c1" }) });

    expect(res.status).toBe(400);
  });

  it("PUT converte P2025 em 404", async () => {
    credentialFindFirstMock.mockResolvedValueOnce({ id: "c1", label: "Admin" });
    credentialUpdateMock.mockRejectedValueOnce(new PrismaClientKnownRequestError("gone", { code: "P2025" }));

    const { PUT } = await import("./route");
    const req = { json: async () => ({ label: "x" }) } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: "c1" }) });

    expect(res.status).toBe(404);
  });

  it("DELETE faz a exclusão lógica e registra auditoria", async () => {
    credentialFindFirstMock.mockResolvedValueOnce({ id: "c1", label: "Admin" });
    credentialUpdateMock.mockResolvedValueOnce(credentialRow());

    const { DELETE } = await import("./route");
    const res = await DELETE({} as any, { params: Promise.resolve({ id: "c1" }) });

    expect(res.status).toBe(200);
    expect(credentialUpdateMock.mock.calls[0][0].data.deleted_at).toBeInstanceOf(Date);
    expect(writeAuditLogMock.mock.calls[0][0].action).toBe("inventory.credential_deleted");
  });

  it("DELETE retorna 404 quando a credencial não existe", async () => {
    credentialFindFirstMock.mockResolvedValueOnce(null);

    const { DELETE } = await import("./route");
    const res = await DELETE({} as any, { params: Promise.resolve({ id: "x" }) });

    expect(res.status).toBe(404);
  });

  it("PUT vincula a senha padrão do mesmo cliente", async () => {
    credentialFindFirstMock.mockResolvedValueOnce({ id: "c1", label: "Admin", equipmentId: "e1", secret: null });
    sharedSecretFindFirstMock.mockResolvedValueOnce({ id: "s1", solicitanteId: "sol1" });
    equipmentFindFirstMock.mockResolvedValueOnce({ solicitanteId: "sol1" });
    credentialUpdateMock.mockResolvedValueOnce(credentialRow({ sharedSecretId: "s1" }));

    const { PUT } = await import("./route");
    const req = { json: async () => ({ sharedSecretId: "s1" }) } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: "c1" }) });

    expect(res.status).toBe(200);
    expect(credentialUpdateMock.mock.calls[0][0].data.sharedSecret).toEqual({ connect: { id: "s1" } });
  });

  it("PUT retorna 409 quando a senha padrão pertence a outro cliente", async () => {
    credentialFindFirstMock.mockResolvedValueOnce({ id: "c1", label: "Admin", equipmentId: "e1", secret: null });
    sharedSecretFindFirstMock.mockResolvedValueOnce({ id: "s1", solicitanteId: "sol2" });
    equipmentFindFirstMock.mockResolvedValueOnce({ solicitanteId: "sol1" });

    const { PUT } = await import("./route");
    const req = { json: async () => ({ sharedSecretId: "s1" }) } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: "c1" }) });

    expect(res.status).toBe(409);
    expect(credentialUpdateMock).not.toHaveBeenCalled();
  });

  it("PUT retorna 404 quando a senha padrão informada não existe", async () => {
    credentialFindFirstMock.mockResolvedValueOnce({ id: "c1", label: "Admin", equipmentId: "e1", secret: null });
    sharedSecretFindFirstMock.mockResolvedValueOnce(null);

    const { PUT } = await import("./route");
    const req = { json: async () => ({ sharedSecretId: "s9" }) } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: "c1" }) });

    expect(res.status).toBe(404);
    expect(credentialUpdateMock).not.toHaveBeenCalled();
  });

  it("PUT desvincula a senha padrão mantendo a senha própria existente", async () => {
    credentialFindFirstMock.mockResolvedValueOnce({
      id: "c1",
      label: "Admin",
      equipmentId: "e1",
      secret: { alg: "aes-256-gcm", keyVersion: 1, iv: "a", tag: "b", ciphertext: "c" }
    });
    credentialUpdateMock.mockResolvedValueOnce(credentialRow());

    const { PUT } = await import("./route");
    const req = { json: async () => ({ sharedSecretId: null }) } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: "c1" }) });

    expect(res.status).toBe(200);
    expect(credentialUpdateMock.mock.calls[0][0].data.sharedSecret).toEqual({ disconnect: true });
  });

  it("PUT retorna 400 ao desvincular sem senha própria", async () => {
    credentialFindFirstMock.mockResolvedValueOnce({ id: "c1", label: "Admin", equipmentId: "e1", secret: null });

    const { PUT } = await import("./route");
    const req = { json: async () => ({ sharedSecretId: null }) } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: "c1" }) });

    expect(res.status).toBe(400);
    expect(credentialUpdateMock).not.toHaveBeenCalled();
  });
});
