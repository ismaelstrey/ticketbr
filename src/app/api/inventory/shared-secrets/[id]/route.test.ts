import { beforeEach, describe, expect, it, vi } from "vitest";

const requireStaffSessionMock = vi.fn();
const sharedSecretFindFirstMock = vi.fn();
const sharedSecretUpdateMock = vi.fn();
const credentialCountMock = vi.fn();
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
vi.mock("@/lib/vault", () => ({
  MASKED_SECRET: "••••••••",
  encryptSecret: () => ({ alg: "aes-256-gcm", keyVersion: 1, iv: "a", tag: "b", ciphertext: "rotated" })
}));
vi.mock("@/lib/prisma", () => ({
  Prisma: { PrismaClientKnownRequestError },
  prisma: {
    clientSharedSecret: { findFirst: sharedSecretFindFirstMock, update: sharedSecretUpdateMock },
    equipmentCredential: { count: credentialCountMock }
  }
}));

const session = { userId: "u1", role: "ADMIN", name: "Admin", email: "a@a.com" };

function sharedSecretRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "s1",
    solicitanteId: "sol1",
    label: "Senha padrão OLT",
    notes: null,
    created_at: new Date("2024-01-01T00:00:00Z"),
    updated_at: new Date("2024-01-01T00:00:00Z"),
    ...overrides
  };
}

describe("/api/inventory/shared-secrets/[id]", () => {
  beforeEach(() => {
    vi.resetModules();
    requireStaffSessionMock.mockReset().mockResolvedValue(session);
    sharedSecretFindFirstMock.mockReset();
    sharedSecretUpdateMock.mockReset();
    credentialCountMock.mockReset().mockResolvedValue(0);
    writeAuditLogMock.mockReset();
  });

  it("GET retorna a senha padrão com a contagem de credenciais", async () => {
    sharedSecretFindFirstMock.mockResolvedValueOnce(sharedSecretRow({ _count: { credentials: 2 } }));

    const { GET } = await import("./route");
    const res = await GET({} as any, { params: Promise.resolve({ id: "s1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe("s1");
    expect(body.data.credentialCount).toBe(2);
  });

  it("GET retorna 404 quando a senha padrão não existe", async () => {
    sharedSecretFindFirstMock.mockResolvedValueOnce(null);

    const { GET } = await import("./route");
    const res = await GET({} as any, { params: Promise.resolve({ id: "x" }) });

    expect(res.status).toBe(404);
  });

  it("PUT com nova senha recifra, propaga e audita a rotação", async () => {
    sharedSecretFindFirstMock.mockResolvedValueOnce({ id: "s1", label: "Senha padrão OLT", solicitanteId: "sol1" });
    sharedSecretUpdateMock.mockResolvedValueOnce(sharedSecretRow());
    credentialCountMock.mockResolvedValueOnce(4);

    const { PUT } = await import("./route");
    const req = { json: async () => ({ secret: "nova-senha" }) } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: "s1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(sharedSecretUpdateMock.mock.calls[0][0].data.secret.ciphertext).toBe("rotated");
    expect(writeAuditLogMock.mock.calls[0][0].action).toBe("inventory.shared_secret_rotated");
    expect(body.data.credentialCount).toBe(4);
  });

  it("PUT sem senha apenas atualiza os demais campos", async () => {
    sharedSecretFindFirstMock.mockResolvedValueOnce({ id: "s1", label: "Senha padrão OLT", solicitanteId: "sol1" });
    sharedSecretUpdateMock.mockResolvedValueOnce(sharedSecretRow({ label: "Renomeada" }));

    const { PUT } = await import("./route");
    const req = { json: async () => ({ label: "Renomeada" }) } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: "s1" }) });

    expect(res.status).toBe(200);
    expect(sharedSecretUpdateMock.mock.calls[0][0].data.secret).toBeUndefined();
    expect(writeAuditLogMock.mock.calls[0][0].action).toBe("inventory.shared_secret_updated");
  });

  it("PUT retorna 404 quando a senha padrão não existe", async () => {
    sharedSecretFindFirstMock.mockResolvedValueOnce(null);

    const { PUT } = await import("./route");
    const req = { json: async () => ({ label: "x" }) } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: "x" }) });

    expect(res.status).toBe(404);
  });

  it("PUT retorna 404 quando o update lança P2025", async () => {
    sharedSecretFindFirstMock.mockResolvedValueOnce({ id: "s1", label: "Senha padrão OLT", solicitanteId: "sol1" });
    sharedSecretUpdateMock.mockRejectedValueOnce(new PrismaClientKnownRequestError("gone", { code: "P2025" }));

    const { PUT } = await import("./route");
    const req = { json: async () => ({ label: "x" }) } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: "s1" }) });

    expect(res.status).toBe(404);
  });

  it("DELETE retorna 409 quando a senha padrão ainda está em uso", async () => {
    sharedSecretFindFirstMock.mockResolvedValueOnce({ id: "s1", label: "Senha padrão OLT", solicitanteId: "sol1" });
    credentialCountMock.mockResolvedValueOnce(2);

    const { DELETE } = await import("./route");
    const res = await DELETE({} as any, { params: Promise.resolve({ id: "s1" }) });

    expect(res.status).toBe(409);
    expect(sharedSecretUpdateMock).not.toHaveBeenCalled();
  });

  it("DELETE faz a exclusão lógica e registra auditoria quando não está em uso", async () => {
    sharedSecretFindFirstMock.mockResolvedValueOnce({ id: "s1", label: "Senha padrão OLT", solicitanteId: "sol1" });
    credentialCountMock.mockResolvedValueOnce(0);
    sharedSecretUpdateMock.mockResolvedValueOnce(sharedSecretRow());

    const { DELETE } = await import("./route");
    const res = await DELETE({} as any, { params: Promise.resolve({ id: "s1" }) });

    expect(res.status).toBe(200);
    expect(sharedSecretUpdateMock.mock.calls[0][0].data.deleted_at).toBeInstanceOf(Date);
    expect(writeAuditLogMock.mock.calls[0][0].action).toBe("inventory.shared_secret_deleted");
  });

  it("DELETE retorna 404 quando a senha padrão não existe", async () => {
    sharedSecretFindFirstMock.mockResolvedValueOnce(null);

    const { DELETE } = await import("./route");
    const res = await DELETE({} as any, { params: Promise.resolve({ id: "x" }) });

    expect(res.status).toBe(404);
  });
});
