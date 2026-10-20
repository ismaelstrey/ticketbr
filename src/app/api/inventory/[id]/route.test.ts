import { beforeEach, describe, expect, it, vi } from "vitest";

const requireStaffSessionMock = vi.fn();
const equipmentFindFirstMock = vi.fn();
const equipmentUpdateMock = vi.fn();
const solicitanteFindFirstMock = vi.fn();
const resolveCredentialAccessBatchMock = vi.fn();
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
vi.mock("@/server/services/inventory-access", () => ({
  resolveCredentialAccessBatch: resolveCredentialAccessBatchMock
}));
vi.mock("@/lib/prisma", () => ({
  Prisma: { PrismaClientKnownRequestError },
  prisma: {
    equipment: { findFirst: equipmentFindFirstMock, update: equipmentUpdateMock },
    solicitante: { findFirst: solicitanteFindFirstMock }
  }
}));

const session = { userId: "u1", role: "ADMIN", name: "Admin", email: "a@a.com" };

// Monta uma linha de equipamento como o Prisma devolveria (com uma credencial aninhada)
function equipmentRow() {
  return {
    id: "e1",
    code: "PAT-1",
    name: "Switch core",
    type: "SWITCH",
    status: "ACTIVE",
    brand: null,
    model: null,
    serialNumber: null,
    hostname: null,
    ipAddress: "10.0.0.1",
    macAddress: null,
    location: null,
    func: null,
    description: null,
    solicitanteId: null,
    solicitante: null,
    created_at: new Date("2024-01-01T00:00:00Z"),
    updated_at: new Date("2024-01-02T00:00:00Z"),
    credentials: [
      {
        id: "c1",
        equipmentId: "e1",
        label: "Admin",
        protocol: "SSH",
        port: 22,
        username: "root",
        notes: null,
        accessPolicy: "OWNER_AND_ADMINS",
        ownerUserId: "u1",
        owner: { id: "u1", name: "Admin" },
        equipment: { id: "e1", name: "Switch core" },
        lastRotatedAt: null,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z")
      }
    ]
  };
}

describe("/api/inventory/[id]", () => {
  beforeEach(() => {
    vi.resetModules();
    requireStaffSessionMock.mockReset().mockResolvedValue(session);
    equipmentFindFirstMock.mockReset();
    equipmentUpdateMock.mockReset();
    solicitanteFindFirstMock.mockReset();
    resolveCredentialAccessBatchMock.mockReset().mockResolvedValue(new Map());
    writeAuditLogMock.mockReset();
  });

  it(
    "GET devolve o equipamento com as credenciais mascaradas",
    async () => {
      equipmentFindFirstMock.mockResolvedValueOnce(equipmentRow());
      resolveCredentialAccessBatchMock.mockResolvedValueOnce(
        new Map([["c1", { canView: true, canReveal: true, via: "owner" }]])
      );

      const { GET } = await import("./route");
      const res = await GET({} as any, { params: Promise.resolve({ id: "e1" }) });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.id).toBe("e1");
      expect(body.data.credentials[0].canReveal).toBe(true);
      expect(body.data.credentials[0].secret).toBe("••••••••");
    },
    20000
  );

  it("GET retorna 404 quando o equipamento não existe", async () => {
    equipmentFindFirstMock.mockResolvedValueOnce(null);

    const { GET } = await import("./route");
    const res = await GET({} as any, { params: Promise.resolve({ id: "x" }) });

    expect(res.status).toBe(404);
  });

  it("PUT atualiza o equipamento e registra auditoria", async () => {
    equipmentFindFirstMock.mockResolvedValueOnce({ id: "e1" });
    equipmentUpdateMock.mockResolvedValueOnce({ id: "e1", solicitanteId: null, name: "Novo nome" });

    const { PUT } = await import("./route");
    const req = { json: async () => ({ name: "Novo nome" }) } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: "e1" }) });

    expect(res.status).toBe(200);
    expect(equipmentUpdateMock).toHaveBeenCalledTimes(1);
    expect(writeAuditLogMock.mock.calls[0][0].action).toBe("inventory.equipment_updated");
  });

  it("PUT retorna 400 quando o payload é inválido", async () => {
    const { PUT } = await import("./route");
    const req = { json: async () => ({ type: "INVALIDO" }) } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: "e1" }) });

    expect(res.status).toBe(400);
    expect(equipmentUpdateMock).not.toHaveBeenCalled();
  });

  it("PUT retorna 404 quando o equipamento não existe", async () => {
    equipmentFindFirstMock.mockResolvedValueOnce(null);

    const { PUT } = await import("./route");
    const req = { json: async () => ({ name: "Novo nome" }) } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: "x" }) });

    expect(res.status).toBe(404);
  });

  it("PUT converte conflito de código (P2002) em 409", async () => {
    equipmentFindFirstMock.mockResolvedValueOnce({ id: "e1" });
    equipmentUpdateMock.mockRejectedValueOnce(new PrismaClientKnownRequestError("dup", { code: "P2002" }));

    const { PUT } = await import("./route");
    const req = { json: async () => ({ code: "PAT-1" }) } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: "e1" }) });

    expect(res.status).toBe(409);
  });

  it("DELETE faz a exclusão lógica e registra auditoria", async () => {
    equipmentFindFirstMock.mockResolvedValueOnce({ id: "e1", name: "Switch core" });
    equipmentUpdateMock.mockResolvedValueOnce({ id: "e1" });

    const { DELETE } = await import("./route");
    const res = await DELETE({} as any, { params: Promise.resolve({ id: "e1" }) });

    expect(res.status).toBe(200);
    expect(equipmentUpdateMock).toHaveBeenCalledTimes(1);
    expect(writeAuditLogMock.mock.calls[0][0].action).toBe("inventory.equipment_deleted");
  });

  it("DELETE retorna 404 quando o equipamento não existe", async () => {
    equipmentFindFirstMock.mockResolvedValueOnce(null);

    const { DELETE } = await import("./route");
    const res = await DELETE({} as any, { params: Promise.resolve({ id: "x" }) });

    expect(res.status).toBe(404);
  });
});
