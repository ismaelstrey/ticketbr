import { beforeEach, describe, expect, it, vi } from "vitest";

const requireStaffSessionMock = vi.fn();
const credentialFindFirstMock = vi.fn();
const grantFindFirstMock = vi.fn();
const grantDeleteMock = vi.fn();
const writeAuditLogMock = vi.fn();

// Recria a classe de erro do Prisma para validar os mapeamentos de status
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
vi.mock("@/lib/prisma", () => ({
  Prisma: { PrismaClientKnownRequestError },
  prisma: {
    equipmentCredential: { findFirst: credentialFindFirstMock },
    credentialAccessGrant: { findFirst: grantFindFirstMock, delete: grantDeleteMock }
  }
}));

const admin = { userId: "u1", role: "ADMIN", name: "Admin", email: "a@a.com" };
const agent = { userId: "u2", role: "AGENT", name: "Agente", email: "g@g.com" };

describe("/api/inventory/credentials/[id]/grants/[grantId]", () => {
  beforeEach(() => {
    vi.resetModules();
    requireStaffSessionMock.mockReset().mockResolvedValue(admin);
    credentialFindFirstMock.mockReset();
    grantFindFirstMock.mockReset();
    grantDeleteMock.mockReset();
    writeAuditLogMock.mockReset();
  });

  it("DELETE remove a concessão e registra auditoria", async () => {
    credentialFindFirstMock.mockResolvedValueOnce({ id: "c1", label: "Admin", ownerUserId: "u1" });
    grantFindFirstMock.mockResolvedValueOnce({
      id: "g1",
      subjectType: "ROLE",
      subjectId: null,
      role: "AGENT",
      level: "REVEAL"
    });
    grantDeleteMock.mockResolvedValueOnce({ id: "g1" });

    const { DELETE } = await import("./route");
    const res = await DELETE({} as any, { params: Promise.resolve({ id: "c1", grantId: "g1" }) });

    expect(res.status).toBe(200);
    expect(grantDeleteMock).toHaveBeenCalledTimes(1);
    expect(writeAuditLogMock.mock.calls[0][0].action).toBe("inventory.credential_grant_deleted");
  });

  it("DELETE retorna 404 quando a credencial não existe", async () => {
    credentialFindFirstMock.mockResolvedValueOnce(null);

    const { DELETE } = await import("./route");
    const res = await DELETE({} as any, { params: Promise.resolve({ id: "x", grantId: "g1" }) });

    expect(res.status).toBe(404);
    expect(grantDeleteMock).not.toHaveBeenCalled();
  });

  it("DELETE retorna 403 para quem não é ADMIN nem responsável", async () => {
    requireStaffSessionMock.mockResolvedValueOnce(agent);
    credentialFindFirstMock.mockResolvedValueOnce({ id: "c1", label: "Admin", ownerUserId: "dono" });

    const { DELETE } = await import("./route");
    const res = await DELETE({} as any, { params: Promise.resolve({ id: "c1", grantId: "g1" }) });

    expect(res.status).toBe(403);
    expect(grantDeleteMock).not.toHaveBeenCalled();
  });

  it("DELETE retorna 404 quando a concessão não existe", async () => {
    credentialFindFirstMock.mockResolvedValueOnce({ id: "c1", label: "Admin", ownerUserId: "u1" });
    grantFindFirstMock.mockResolvedValueOnce(null);

    const { DELETE } = await import("./route");
    const res = await DELETE({} as any, { params: Promise.resolve({ id: "c1", grantId: "g9" }) });

    expect(res.status).toBe(404);
  });

  it("DELETE converte P2025 em 404", async () => {
    credentialFindFirstMock.mockResolvedValueOnce({ id: "c1", label: "Admin", ownerUserId: "u1" });
    grantFindFirstMock.mockResolvedValueOnce({
      id: "g1",
      subjectType: "ROLE",
      subjectId: null,
      role: "AGENT",
      level: "REVEAL"
    });
    grantDeleteMock.mockRejectedValueOnce(new PrismaClientKnownRequestError("not found", { code: "P2025" }));

    const { DELETE } = await import("./route");
    const res = await DELETE({} as any, { params: Promise.resolve({ id: "c1", grantId: "g1" }) });

    expect(res.status).toBe(404);
  });
});
