import { beforeEach, describe, expect, it, vi } from "vitest";

const requireCompanyAdminContextMock = vi.fn();
const writeAuditLogMock = vi.fn();
const hashMock = vi.fn();

const funcionarioFindManyMock = vi.fn();
const userCreateMock = vi.fn();
const funcionarioCreateMock = vi.fn();

vi.mock("@/server/services/customer-context", () => ({
  requireCompanyAdminContext: requireCompanyAdminContextMock
}));

vi.mock("@/server/services/audit-log", () => ({
  writeAuditLog: writeAuditLogMock
}));

vi.mock("bcryptjs", async () => {
  const actual: any = await vi.importActual("bcryptjs");
  return { ...actual, hash: hashMock };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    funcionario: {
      findMany: funcionarioFindManyMock,
      create: funcionarioCreateMock
    },
    user: {
      create: userCreateMock
    }
  }
}));

describe("/api/customer/admin/members", () => {
  beforeEach(() => {
    vi.resetModules();
    requireCompanyAdminContextMock.mockReset();
    writeAuditLogMock.mockReset();
    hashMock.mockReset();
    funcionarioFindManyMock.mockReset();
    userCreateMock.mockReset();
    funcionarioCreateMock.mockReset();
  });

  it("GET lista membros quando é admin", async () => {
    requireCompanyAdminContextMock.mockResolvedValue({
      user: { id: "u_admin", email: "a@a.com", name: "Admin", role: "CUSTOMER" },
      solicitante: { id: "s1", nome_fantasia: "ACME", razao_social: "ACME", email: "acme@a.com" },
      member: { id: "m_admin", solicitante_id: "s1", isAdmin: true }
    });

    funcionarioFindManyMock.mockResolvedValueOnce([
      {
        id: "m1",
        nome: "Cliente",
        email: "c@a.com",
        telefone: "51999999999",
        isAdmin: false,
        user: { id: "u1", email: "c@a.com", name: "Cliente" }
      }
    ]);

    const { GET } = await import("./route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data[0].userId).toBe("u1");
  });

  it("POST cria usuário e vínculo", async () => {
    requireCompanyAdminContextMock.mockResolvedValue({
      user: { id: "u_admin", email: "a@a.com", name: "Admin", role: "CUSTOMER" },
      solicitante: { id: "s1", nome_fantasia: "ACME", razao_social: "ACME", email: "acme@a.com" },
      member: { id: "m_admin", solicitante_id: "s1", isAdmin: true }
    });

    hashMock.mockResolvedValueOnce("hash");
    userCreateMock.mockResolvedValueOnce({ id: "u2", email: "novo@a.com", name: "Novo" });
    funcionarioCreateMock.mockResolvedValueOnce({ id: "m2", isAdmin: false });

    const { POST } = await import("./route");
    const req = {
      json: async () => ({ name: "Novo", email: "novo@a.com", password: "12345678", telefone: "51999999999", isAdmin: false })
    } as any;
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.id).toBe("u2");
    expect(userCreateMock).toHaveBeenCalledTimes(1);
    expect(funcionarioCreateMock).toHaveBeenCalledTimes(1);
  });
});

