import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminSessionMock = vi.fn();
const requireStaffSessionMock = vi.fn();
const groupFindFirstMock = vi.fn();
const groupUpdateMock = vi.fn();
const memberDeleteManyMock = vi.fn();
const memberCreateManyMock = vi.fn();
const userCountMock = vi.fn();
const transactionMock = vi.fn();
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
  requireAdminSession: requireAdminSessionMock,
  requireStaffSession: requireStaffSessionMock
}));
vi.mock("@/server/services/audit-log", () => ({ writeAuditLog: writeAuditLogMock }));
vi.mock("@/lib/prisma", () => ({
  Prisma: { PrismaClientKnownRequestError },
  prisma: {
    userGroup: { findFirst: groupFindFirstMock, update: groupUpdateMock },
    userGroupMember: { deleteMany: memberDeleteManyMock, createMany: memberCreateManyMock },
    user: { count: userCountMock },
    $transaction: transactionMock
  }
}));

const session = { userId: "u1", role: "ADMIN", name: "Admin", email: "a@a.com" };

describe("/api/user-groups/[id]", () => {
  beforeEach(() => {
    vi.resetModules();
    requireAdminSessionMock.mockReset().mockResolvedValue(session);
    requireStaffSessionMock.mockReset().mockResolvedValue(session);
    groupFindFirstMock.mockReset();
    groupUpdateMock.mockReset();
    memberDeleteManyMock.mockReset();
    memberCreateManyMock.mockReset();
    userCountMock.mockReset();
    transactionMock.mockReset().mockImplementation(async (cb: (tx: unknown) => unknown) =>
      cb({
        userGroup: { update: groupUpdateMock },
        userGroupMember: { deleteMany: memberDeleteManyMock, createMany: memberCreateManyMock }
      })
    );
    writeAuditLogMock.mockReset();
  });

  it("GET devolve o grupo com seus membros", async () => {
    groupFindFirstMock.mockResolvedValueOnce({
      id: "grp1",
      name: "Infra",
      description: null,
      created_at: new Date("2024-01-01T00:00:00Z"),
      updated_at: new Date("2024-01-01T00:00:00Z"),
      members: [{ user: { id: "u2", name: "Agente", email: "g@g.com" } }]
    });

    const { GET } = await import("./route");
    const res = await GET({} as any, { params: Promise.resolve({ id: "grp1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe("grp1");
    expect(body.data.members[0].id).toBe("u2");
  });

  it("GET retorna 404 quando o grupo não existe", async () => {
    groupFindFirstMock.mockResolvedValueOnce(null);

    const { GET } = await import("./route");
    const res = await GET({} as any, { params: Promise.resolve({ id: "x" }) });

    expect(res.status).toBe(404);
  });

  it("PUT atualiza o grupo e substitui os membros", async () => {
    groupFindFirstMock.mockResolvedValueOnce({ id: "grp1" });
    userCountMock.mockResolvedValueOnce(2);

    const { PUT } = await import("./route");
    const req = { json: async () => ({ name: "Infra 2", memberIds: ["u2", "u3"] }) } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: "grp1" }) });

    expect(res.status).toBe(200);
    expect(groupUpdateMock).toHaveBeenCalledTimes(1);
    expect(memberDeleteManyMock).toHaveBeenCalledTimes(1);
    expect(memberCreateManyMock).toHaveBeenCalledTimes(1);
    expect(writeAuditLogMock.mock.calls[0][0].action).toBe("inventory.group_updated");
  });

  it("PUT retorna 404 quando o grupo não existe", async () => {
    groupFindFirstMock.mockResolvedValueOnce(null);

    const { PUT } = await import("./route");
    const req = { json: async () => ({ name: "Infra 2" }) } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: "x" }) });

    expect(res.status).toBe(404);
    expect(groupUpdateMock).not.toHaveBeenCalled();
  });

  it("PUT retorna 404 quando algum membro informado não existe", async () => {
    groupFindFirstMock.mockResolvedValueOnce({ id: "grp1" });
    userCountMock.mockResolvedValueOnce(1);

    const { PUT } = await import("./route");
    const req = { json: async () => ({ memberIds: ["u2", "u3"] }) } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: "grp1" }) });

    expect(res.status).toBe(404);
    expect(groupUpdateMock).not.toHaveBeenCalled();
  });

  it("PUT retorna 400 quando o payload é inválido", async () => {
    const { PUT } = await import("./route");
    const req = { json: async () => ({ name: "x" }) } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: "grp1" }) });

    expect(res.status).toBe(400);
  });

  it("PUT converte nome duplicado (P2002) em 409", async () => {
    groupFindFirstMock.mockResolvedValueOnce({ id: "grp1" });
    groupUpdateMock.mockRejectedValueOnce(new PrismaClientKnownRequestError("dup", { code: "P2002" }));

    const { PUT } = await import("./route");
    const req = { json: async () => ({ name: "Infra 2" }) } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: "grp1" }) });

    expect(res.status).toBe(409);
  });

  it("DELETE faz a exclusão lógica e registra auditoria", async () => {
    groupFindFirstMock.mockResolvedValueOnce({ id: "grp1", name: "Infra" });
    groupUpdateMock.mockResolvedValueOnce({ id: "grp1" });

    const { DELETE } = await import("./route");
    const res = await DELETE({} as any, { params: Promise.resolve({ id: "grp1" }) });

    expect(res.status).toBe(200);
    expect(groupUpdateMock).toHaveBeenCalledTimes(1);
    expect(writeAuditLogMock.mock.calls[0][0].action).toBe("inventory.group_deleted");
  });

  it("DELETE retorna 404 quando o grupo não existe", async () => {
    groupFindFirstMock.mockResolvedValueOnce(null);

    const { DELETE } = await import("./route");
    const res = await DELETE({} as any, { params: Promise.resolve({ id: "x" }) });

    expect(res.status).toBe(404);
  });
});
