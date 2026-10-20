import { beforeEach, describe, expect, it, vi } from "vitest";

const requireStaffSessionMock = vi.fn();
const credentialFindFirstMock = vi.fn();
const grantFindManyMock = vi.fn();
const grantCreateMock = vi.fn();
const userFindUniqueMock = vi.fn();
const groupFindFirstMock = vi.fn();
const describeGrantsMock = vi.fn();
const writeAuditLogMock = vi.fn();

vi.mock("@/server/services/staff-context", () => ({ requireStaffSession: requireStaffSessionMock }));
vi.mock("@/server/services/audit-log", () => ({ writeAuditLog: writeAuditLogMock }));
vi.mock("@/server/services/inventory-access", () => ({ describeGrants: describeGrantsMock }));
vi.mock("@/lib/prisma", () => ({
  Prisma: {},
  prisma: {
    equipmentCredential: { findFirst: credentialFindFirstMock },
    credentialAccessGrant: { findMany: grantFindManyMock, create: grantCreateMock },
    user: { findUnique: userFindUniqueMock },
    userGroup: { findFirst: groupFindFirstMock }
  }
}));

const admin = { userId: "u1", role: "ADMIN", name: "Admin", email: "a@a.com" };
const agent = { userId: "u2", role: "AGENT", name: "Agente", email: "g@g.com" };

describe("/api/inventory/credentials/[id]/grants", () => {
  beforeEach(() => {
    vi.resetModules();
    requireStaffSessionMock.mockReset().mockResolvedValue(admin);
    credentialFindFirstMock.mockReset();
    grantFindManyMock.mockReset();
    grantCreateMock.mockReset();
    userFindUniqueMock.mockReset();
    groupFindFirstMock.mockReset();
    describeGrantsMock.mockReset().mockImplementation(async (grants: unknown[]) => grants);
    writeAuditLogMock.mockReset();
  });

  it("GET devolve as concessões da credencial", async () => {
    credentialFindFirstMock.mockResolvedValueOnce({ id: "c1" });
    grantFindManyMock.mockResolvedValueOnce([
      { id: "g1", subjectType: "ROLE", subjectId: null, role: "AGENT", level: "REVEAL" }
    ]);

    const { GET } = await import("./route");
    const res = await GET({} as any, { params: Promise.resolve({ id: "c1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });

  it("GET retorna 404 quando a credencial não existe", async () => {
    credentialFindFirstMock.mockResolvedValueOnce(null);

    const { GET } = await import("./route");
    const res = await GET({} as any, { params: Promise.resolve({ id: "x" }) });

    expect(res.status).toBe(404);
  });

  it(
    "POST cria uma concessão para papel e audita",
    async () => {
      credentialFindFirstMock.mockResolvedValueOnce({ id: "c1", label: "Admin", ownerUserId: "u1" });
      grantCreateMock.mockResolvedValueOnce({
        id: "g1",
        subjectType: "ROLE",
        subjectId: null,
        role: "AGENT",
        level: "REVEAL"
      });

      const { POST } = await import("./route");
      const req = { json: async () => ({ subjectType: "ROLE", role: "AGENT" }) } as any;
      const res = await POST(req, { params: Promise.resolve({ id: "c1" }) });

      expect(res.status).toBe(201);
      expect(grantCreateMock).toHaveBeenCalledTimes(1);
      expect(writeAuditLogMock.mock.calls[0][0].action).toBe("inventory.credential_grant_created");
    },
    20000
  );

  it("POST retorna 403 para quem não é ADMIN nem responsável", async () => {
    requireStaffSessionMock.mockResolvedValueOnce(agent);
    credentialFindFirstMock.mockResolvedValueOnce({ id: "c1", label: "Admin", ownerUserId: "dono" });

    const { POST } = await import("./route");
    const req = { json: async () => ({ subjectType: "ROLE", role: "AGENT" }) } as any;
    const res = await POST(req, { params: Promise.resolve({ id: "c1" }) });

    expect(res.status).toBe(403);
    expect(grantCreateMock).not.toHaveBeenCalled();
  });

  it("POST retorna 404 quando o usuário do sujeito não existe", async () => {
    credentialFindFirstMock.mockResolvedValueOnce({ id: "c1", label: "Admin", ownerUserId: "u1" });
    userFindUniqueMock.mockResolvedValueOnce(null);

    const { POST } = await import("./route");
    const req = { json: async () => ({ subjectType: "USER", subjectId: "u9" }) } as any;
    const res = await POST(req, { params: Promise.resolve({ id: "c1" }) });

    expect(res.status).toBe(404);
  });

  it("POST retorna 404 quando o grupo do sujeito não existe", async () => {
    credentialFindFirstMock.mockResolvedValueOnce({ id: "c1", label: "Admin", ownerUserId: "u1" });
    groupFindFirstMock.mockResolvedValueOnce(null);

    const { POST } = await import("./route");
    const req = { json: async () => ({ subjectType: "GROUP", subjectId: "grp9" }) } as any;
    const res = await POST(req, { params: Promise.resolve({ id: "c1" }) });

    expect(res.status).toBe(404);
  });

  it("POST retorna 400 quando o payload é inválido", async () => {
    const { POST } = await import("./route");
    const req = { json: async () => ({ subjectType: "USER" }) } as any;
    const res = await POST(req, { params: Promise.resolve({ id: "c1" }) });

    expect(res.status).toBe(400);
  });
});
