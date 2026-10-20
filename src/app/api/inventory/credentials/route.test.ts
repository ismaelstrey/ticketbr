import { beforeEach, describe, expect, it, vi } from "vitest";

const requireStaffSessionMock = vi.fn();
const credentialCountMock = vi.fn();
const credentialFindManyMock = vi.fn();
const credentialCreateMock = vi.fn();
const equipmentFindFirstMock = vi.fn();
const userFindUniqueMock = vi.fn();
const resolveCredentialAccessBatchMock = vi.fn();
const writeAuditLogMock = vi.fn();

vi.mock("@/server/services/staff-context", () => ({ requireStaffSession: requireStaffSessionMock }));
vi.mock("@/server/services/audit-log", () => ({ writeAuditLog: writeAuditLogMock }));
vi.mock("@/server/services/inventory-access", () => ({
  resolveCredentialAccessBatch: resolveCredentialAccessBatchMock
}));
vi.mock("@/lib/vault", () => ({
  MASKED_SECRET: "••••••••",
  encryptSecret: () => ({ alg: "aes-256-gcm", keyVersion: 1, iv: "a", tag: "b", ciphertext: "c" })
}));
vi.mock("@/lib/prisma", () => ({
  Prisma: {},
  prisma: {
    equipmentCredential: {
      count: credentialCountMock,
      findMany: credentialFindManyMock,
      create: credentialCreateMock
    },
    equipment: { findFirst: equipmentFindFirstMock },
    user: { findUnique: userFindUniqueMock }
  }
}));

const session = { userId: "u1", role: "ADMIN", name: "Admin", email: "a@a.com" };

// Linha de credencial como o Prisma devolveria após o create
function credentialRow() {
  return {
    id: "c1",
    equipmentId: "e1",
    label: "Admin switch",
    protocol: "SSH",
    port: 22,
    username: "root",
    notes: null,
    accessPolicy: "OWNER_AND_ADMINS",
    ownerUserId: "u1",
    owner: { id: "u1", name: "Admin" },
    equipment: { id: "e1", name: "Switch core" },
    lastRotatedAt: null,
    created_at: new Date("2024-01-01T00:00:00Z"),
    updated_at: new Date("2024-01-01T00:00:00Z")
  };
}

describe("/api/inventory/credentials", () => {
  beforeEach(() => {
    vi.resetModules();
    requireStaffSessionMock.mockReset().mockResolvedValue(session);
    credentialCountMock.mockReset();
    credentialFindManyMock.mockReset();
    credentialCreateMock.mockReset();
    equipmentFindFirstMock.mockReset();
    userFindUniqueMock.mockReset();
    resolveCredentialAccessBatchMock.mockReset().mockResolvedValue(new Map());
    writeAuditLogMock.mockReset();
  });

  it(
    "GET lista as credenciais aplicando a decisão de acesso",
    async () => {
      credentialCountMock.mockResolvedValueOnce(1);
      credentialFindManyMock.mockResolvedValueOnce([credentialRow()]);
      resolveCredentialAccessBatchMock.mockResolvedValueOnce(
        new Map([["c1", { canView: true, canReveal: false, via: null }]])
      );

      const { GET } = await import("./route");
      const req = { nextUrl: { searchParams: new URLSearchParams() } } as any;
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.total).toBe(1);
      expect(body.data[0].label).toBe("Admin switch");
      expect(body.data[0].canReveal).toBe(false);
    },
    20000
  );

  it(
    "POST cifra a senha, cria a credencial e registra auditoria",
    async () => {
      credentialCreateMock.mockResolvedValueOnce(credentialRow());

      const { POST } = await import("./route");
      const req = { json: async () => ({ label: "Admin switch", secret: "s3cr3t" }) } as any;
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(credentialCreateMock).toHaveBeenCalledTimes(1);
      // A senha nunca é persistida em claro
      expect(credentialCreateMock.mock.calls[0][0].data.secret.ciphertext).toBe("c");
      expect(writeAuditLogMock.mock.calls[0][0].action).toBe("inventory.credential_created");
      expect(body.data.secret).toBe("••••••••");
    },
    20000
  );

  it("POST retorna 404 quando o equipamento informado não existe", async () => {
    equipmentFindFirstMock.mockResolvedValueOnce(null);

    const { POST } = await import("./route");
    const req = { json: async () => ({ label: "x", secret: "y", equipmentId: "e9" }) } as any;
    const res = await POST(req);

    expect(res.status).toBe(404);
    expect(credentialCreateMock).not.toHaveBeenCalled();
  });

  it("POST retorna 404 quando o responsável informado não existe", async () => {
    userFindUniqueMock.mockResolvedValueOnce(null);

    const { POST } = await import("./route");
    const req = { json: async () => ({ label: "x", secret: "y", ownerUserId: "u9" }) } as any;
    const res = await POST(req);

    expect(res.status).toBe(404);
    expect(credentialCreateMock).not.toHaveBeenCalled();
  });

  it("POST retorna 400 quando o payload é inválido", async () => {
    const { POST } = await import("./route");
    const req = { json: async () => ({ label: "" }) } as any;
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});
