import { beforeEach, describe, expect, it, vi } from "vitest";

const guardAdminMock = vi.fn();
const requireStaffSessionMock = vi.fn();
const groupFindManyMock = vi.fn();
const groupCreateMock = vi.fn();
const userCountMock = vi.fn();
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

vi.mock("@/server/services/staff-context", () => ({
  guardAdmin: guardAdminMock,
  requireStaffSession: requireStaffSessionMock
}));
vi.mock("@/server/services/audit-log", () => ({ writeAuditLog: writeAuditLogMock }));
vi.mock("@/lib/prisma", () => ({
  Prisma: { PrismaClientKnownRequestError },
  prisma: {
    userGroup: { findMany: groupFindManyMock, create: groupCreateMock },
    user: { count: userCountMock }
  }
}));

const session = { userId: "u1", role: "ADMIN", name: "Admin", email: "a@a.com" };

function request(search = "") {
  return { nextUrl: new URL(`http://localhost/api/user-groups${search}`) } as any;
}

describe("/api/user-groups", () => {
  beforeEach(() => {
    vi.resetModules();
    guardAdminMock.mockReset().mockResolvedValue(null);
    requireStaffSessionMock.mockReset().mockResolvedValue(session);
    groupFindManyMock.mockReset();
    groupCreateMock.mockReset();
    userCountMock.mockReset();
    writeAuditLogMock.mockReset();
  });

  it("GET lista os grupos com seus membros", async () => {
    groupFindManyMock.mockResolvedValueOnce([
      {
        id: "grp1",
        name: "Infra",
        description: null,
        created_at: new Date("2024-01-01T00:00:00Z"),
        updated_at: new Date("2024-01-01T00:00:00Z"),
        members: [{ user: { id: "u2", name: "Agente", email: "g@g.com" } }]
      }
    ]);

    const { GET } = await import("./route");
    const res = await GET(request("?search=infra"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].members[0].id).toBe("u2");
  });

  it("GET retorna 401 quando não há sessão de staff", async () => {
    requireStaffSessionMock.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

    const { GET } = await import("./route");
    const res = await GET(request());

    expect(res.status).toBe(401);
  });

  it("POST retorna 403 quando o guardAdmin bloqueia (não-admin)", async () => {
    guardAdminMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Sem permissão" }), { status: 403 })
    );

    const { POST } = await import("./route");
    const req = { json: async () => ({ name: "Infra" }) } as any;
    const res = await POST(req);

    expect(res.status).toBe(403);
    expect(groupCreateMock).not.toHaveBeenCalled();
  });

  it("POST cria o grupo e registra auditoria", async () => {
    groupCreateMock.mockResolvedValueOnce({
      id: "grp1",
      name: "Infra",
      description: null,
      created_at: new Date("2024-01-01T00:00:00Z"),
      updated_at: new Date("2024-01-01T00:00:00Z")
    });

    const { POST } = await import("./route");
    const req = { json: async () => ({ name: "Infra" }) } as any;
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.name).toBe("Infra");
    expect(writeAuditLogMock.mock.calls[0][0].action).toBe("inventory.group_created");
  });

  it("POST retorna 404 quando algum membro informado não existe", async () => {
    userCountMock.mockResolvedValueOnce(1);

    const { POST } = await import("./route");
    const req = { json: async () => ({ name: "Infra", memberIds: ["u2", "u3"] }) } as any;
    const res = await POST(req);

    expect(res.status).toBe(404);
    expect(groupCreateMock).not.toHaveBeenCalled();
  });

  it("POST retorna 400 quando o payload é inválido", async () => {
    const { POST } = await import("./route");
    const req = { json: async () => ({ name: "x" }) } as any;
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("POST converte nome duplicado (P2002) em 409", async () => {
    groupCreateMock.mockRejectedValueOnce(new PrismaClientKnownRequestError("dup", { code: "P2002" }));

    const { POST } = await import("./route");
    const req = { json: async () => ({ name: "Infra" }) } as any;
    const res = await POST(req);

    expect(res.status).toBe(409);
  });
});
