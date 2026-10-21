import { beforeEach, describe, expect, it, vi } from "vitest";

const requireStaffSessionMock = vi.fn();
const sharedSecretFindManyMock = vi.fn();
const sharedSecretCreateMock = vi.fn();
const solicitanteFindFirstMock = vi.fn();
const writeAuditLogMock = vi.fn();

vi.mock("@/server/services/staff-context", () => ({ requireStaffSession: requireStaffSessionMock }));
vi.mock("@/server/services/audit-log", () => ({ writeAuditLog: writeAuditLogMock }));
vi.mock("@/lib/vault", () => ({
  MASKED_SECRET: "••••••••",
  encryptSecret: () => ({ alg: "aes-256-gcm", keyVersion: 1, iv: "a", tag: "b", ciphertext: "c" })
}));
vi.mock("@/lib/prisma", () => ({
  Prisma: {},
  prisma: {
    clientSharedSecret: { findMany: sharedSecretFindManyMock, create: sharedSecretCreateMock },
    solicitante: { findFirst: solicitanteFindFirstMock }
  }
}));

const session = { userId: "u1", role: "ADMIN", name: "Admin", email: "a@a.com" };

// Linha de senha padrão como o Prisma devolveria
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

describe("/api/inventory/shared-secrets", () => {
  beforeEach(() => {
    vi.resetModules();
    requireStaffSessionMock.mockReset().mockResolvedValue(session);
    sharedSecretFindManyMock.mockReset();
    sharedSecretCreateMock.mockReset();
    solicitanteFindFirstMock.mockReset();
    writeAuditLogMock.mockReset();
  });

  it("GET lista as senhas padrão do cliente com a contagem de credenciais", async () => {
    sharedSecretFindManyMock.mockResolvedValueOnce([
      sharedSecretRow({ _count: { credentials: 3 } })
    ]);

    const { GET } = await import("./route");
    const req = { nextUrl: { searchParams: new URLSearchParams({ solicitanteId: "sol1" }) } } as any;
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(sharedSecretFindManyMock.mock.calls[0][0].where).toMatchObject({
      deleted_at: null,
      solicitanteId: "sol1"
    });
    expect(body.data[0].credentialCount).toBe(3);
    // A senha nunca é exposta em claro
    expect(body.data[0].secret).toBe("••••••••");
  });

  it("POST cifra a senha, cria a senha padrão e registra auditoria", async () => {
    solicitanteFindFirstMock.mockResolvedValueOnce({ id: "sol1" });
    sharedSecretCreateMock.mockResolvedValueOnce(sharedSecretRow());

    const { POST } = await import("./route");
    const req = {
      json: async () => ({ solicitanteId: "sol1", label: "Senha padrão OLT", secret: "s3cr3t" })
    } as any;
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(sharedSecretCreateMock.mock.calls[0][0].data.secret.ciphertext).toBe("c");
    expect(writeAuditLogMock.mock.calls[0][0].action).toBe("inventory.shared_secret_created");
    expect(body.data.secret).toBe("••••••••");
    expect(body.data.credentialCount).toBe(0);
  });

  it("POST retorna 404 quando o solicitante não existe", async () => {
    solicitanteFindFirstMock.mockResolvedValueOnce(null);

    const { POST } = await import("./route");
    const req = { json: async () => ({ solicitanteId: "sol9", label: "x", secret: "y" }) } as any;
    const res = await POST(req);

    expect(res.status).toBe(404);
    expect(sharedSecretCreateMock).not.toHaveBeenCalled();
  });

  it("POST retorna 400 quando o payload é inválido", async () => {
    const { POST } = await import("./route");
    const req = { json: async () => ({ solicitanteId: "sol1", label: "" }) } as any;
    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(sharedSecretCreateMock).not.toHaveBeenCalled();
  });
});
