import { beforeEach, describe, expect, it, vi } from "vitest";

const requireStaffSessionMock = vi.fn();
const equipmentCountMock = vi.fn();
const equipmentFindManyMock = vi.fn();
const equipmentCreateMock = vi.fn();
const solicitanteFindFirstMock = vi.fn();
const writeAuditLogMock = vi.fn();

vi.mock("@/server/services/staff-context", () => ({
  requireStaffSession: requireStaffSessionMock
}));

vi.mock("@/server/services/audit-log", () => ({
  writeAuditLog: writeAuditLogMock
}));

vi.mock("@/lib/prisma", () => ({
  Prisma: {},
  prisma: {
    equipment: {
      count: equipmentCountMock,
      findMany: equipmentFindManyMock,
      create: equipmentCreateMock
    },
    solicitante: {
      findFirst: solicitanteFindFirstMock
    }
  }
}));

describe("/api/inventory", () => {
  beforeEach(() => {
    vi.resetModules();
    requireStaffSessionMock.mockReset();
    equipmentCountMock.mockReset();
    equipmentFindManyMock.mockReset();
    equipmentCreateMock.mockReset();
    solicitanteFindFirstMock.mockReset();
    writeAuditLogMock.mockReset();
    requireStaffSessionMock.mockResolvedValue({ userId: "u1", role: "ADMIN", name: "Admin", email: "a@a.com" });
  });

  it(
    "GET retorna a listagem paginada",
    async () => {
      equipmentCountMock.mockResolvedValueOnce(1);
      equipmentFindManyMock.mockResolvedValueOnce([
        {
          id: "e1",
          code: null,
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
          created_at: new Date(),
          updated_at: new Date(),
          _count: { credentials: 2 }
        }
      ]);

      const { GET } = await import("./route");
      const req = { nextUrl: { searchParams: new URLSearchParams() } } as any;
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.total).toBe(1);
      expect(body.data[0].credentialCount).toBe(2);
    },
    20000
  );

  it(
    "POST cria equipamento e registra auditoria",
    async () => {
      equipmentCreateMock.mockResolvedValueOnce({
        id: "e1",
        name: "Roteador borda",
        type: "ROUTER",
        solicitanteId: null
      });

      const { POST } = await import("./route");
      const req = {
        json: async () => ({ name: "Roteador borda", type: "ROUTER" })
      } as any;
      const res = await POST(req);

      expect(res.status).toBe(201);
      expect(equipmentCreateMock).toHaveBeenCalledTimes(1);
      expect(writeAuditLogMock).toHaveBeenCalledTimes(1);
      expect(writeAuditLogMock.mock.calls[0][0].action).toBe("inventory.equipment_created");
    },
    20000
  );

  it("POST retorna 400 quando o payload é inválido", async () => {
    const { POST } = await import("./route");
    const req = { json: async () => ({ name: "x" }) } as any;
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});
