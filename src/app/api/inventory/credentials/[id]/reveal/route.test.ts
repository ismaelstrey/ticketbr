import { beforeEach, describe, expect, it, vi } from "vitest";

const requireStaffSessionMock = vi.fn();
const credentialFindFirstMock = vi.fn();
const grantFindManyMock = vi.fn();
const groupMemberFindManyMock = vi.fn();
const writeAuditLogMock = vi.fn();

vi.mock("@/server/services/staff-context", () => ({
  requireStaffSession: requireStaffSessionMock
}));

vi.mock("@/server/services/audit-log", () => ({
  writeAuditLog: writeAuditLogMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    equipmentCredential: { findFirst: credentialFindFirstMock },
    credentialAccessGrant: { findMany: grantFindManyMock },
    userGroupMember: { findMany: groupMemberFindManyMock }
  }
}));

vi.mock("@/lib/vault", () => ({
  decryptSecret: () => "senha-revelada",
  isEncryptedPayload: (value: unknown) =>
    Boolean(value && typeof value === "object" && (value as Record<string, unknown>).alg === "aes-256-gcm")
}));

const encryptedSecret = { alg: "aes-256-gcm", keyVersion: 1, iv: "a", tag: "b", ciphertext: "c" };

describe("POST /api/inventory/credentials/[id]/reveal", () => {
  beforeEach(() => {
    vi.resetModules();
    requireStaffSessionMock.mockReset();
    credentialFindFirstMock.mockReset();
    grantFindManyMock.mockReset();
    groupMemberFindManyMock.mockReset();
    writeAuditLogMock.mockReset();
    grantFindManyMock.mockResolvedValue([]);
    groupMemberFindManyMock.mockResolvedValue([]);
  });

  it(
    "agente sem permissão recebe 403 e a tentativa é auditada",
    async () => {
      requireStaffSessionMock.mockResolvedValue({ userId: "agent1", role: "AGENT", name: "Agente", email: "g@g.com" });
      credentialFindFirstMock.mockResolvedValueOnce({
        id: "c1",
        label: "Admin switch",
        ownerUserId: "outro",
        accessPolicy: "OWNER_AND_ADMINS",
        secret: encryptedSecret,
        equipmentId: "e1"
      });

      const { POST } = await import("./route");
      const res = await POST({} as any, { params: Promise.resolve({ id: "c1" }) });

      expect(res.status).toBe(403);
      expect(writeAuditLogMock).toHaveBeenCalledTimes(1);
      expect(writeAuditLogMock.mock.calls[0][0].action).toBe("inventory.credential_reveal_denied");
    },
    20000
  );

  it("administrador recebe a senha decifrada e a revelação é auditada", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "admin1", role: "ADMIN", name: "Admin", email: "a@a.com" });
    credentialFindFirstMock.mockResolvedValueOnce({
      id: "c1",
      label: "Admin switch",
      ownerUserId: "outro",
      accessPolicy: "OWNER_AND_ADMINS",
      secret: encryptedSecret,
      equipmentId: "e1"
    });

    const { POST } = await import("./route");
    const res = await POST({} as any, { params: Promise.resolve({ id: "c1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.secret).toBe("senha-revelada");
    expect(writeAuditLogMock.mock.calls[0][0].action).toBe("inventory.credential_revealed");
  });

  it("retorna 404 quando a credencial não existe", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "admin1", role: "ADMIN", name: "Admin", email: "a@a.com" });
    credentialFindFirstMock.mockResolvedValueOnce(null);

    const { POST } = await import("./route");
    const res = await POST({} as any, { params: Promise.resolve({ id: "x" }) });

    expect(res.status).toBe(404);
  });

  it("revela a senha padrão do cliente quando a credencial está vinculada", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "admin1", role: "ADMIN", name: "Admin", email: "a@a.com" });
    credentialFindFirstMock.mockResolvedValueOnce({
      id: "c1",
      label: "Admin switch",
      ownerUserId: "outro",
      accessPolicy: "OWNER_AND_ADMINS",
      // Sem senha própria: o segredo vem da senha padrão do cliente
      secret: null,
      equipmentId: "e1",
      sharedSecretId: "s1",
      sharedSecret: { secret: encryptedSecret }
    });

    const { POST } = await import("./route");
    const res = await POST({} as any, { params: Promise.resolve({ id: "c1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.secret).toBe("senha-revelada");
    expect(writeAuditLogMock.mock.calls[0][0].metadata.sharedSecretId).toBe("s1");
  });

  it("retorna 500 quando o segredo não está disponível", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "admin1", role: "ADMIN", name: "Admin", email: "a@a.com" });
    credentialFindFirstMock.mockResolvedValueOnce({
      id: "c1",
      label: "Admin switch",
      ownerUserId: "outro",
      accessPolicy: "OWNER_AND_ADMINS",
      secret: null,
      equipmentId: "e1",
      sharedSecretId: null,
      sharedSecret: null
    });

    const { POST } = await import("./route");
    const res = await POST({} as any, { params: Promise.resolve({ id: "c1" }) });

    expect(res.status).toBe(500);
  });
});
