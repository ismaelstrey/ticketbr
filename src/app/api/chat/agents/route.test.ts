import { beforeEach, describe, expect, it, vi } from "vitest";

const userFindManyMock = vi.fn();
const guardStaffMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: userFindManyMock
    }
  }
}));

vi.mock("@/server/services/staff-context", () => ({
  guardStaff: guardStaffMock
}));

describe("GET /api/chat/agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardStaffMock.mockResolvedValue(null);
    userFindManyMock.mockResolvedValue([]);
  });

  it("lista apenas usuários de staff (ADMIN/AGENT)", async () => {
    userFindManyMock.mockResolvedValueOnce([
      { id: "u1", name: "Ana", email: "ana@empresa.com", role: "AGENT" }
    ]);

    const { GET } = await import("./route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);

    // Garante que a consulta filtra por papéis de staff, sem expor clientes
    const where = (userFindManyMock.mock.calls[0]?.[0] as any)?.where;
    expect(where).toEqual({ role: { in: ["ADMIN", "AGENT"] } });
    expect(body.data).toEqual([
      { id: "u1", name: "Ana", email: "ana@empresa.com", role: "AGENT" }
    ]);
  });

  it("bloqueia acesso quando a sessão não é de staff", async () => {
    guardStaffMock.mockResolvedValueOnce({ status: 403 });

    const { GET } = await import("./route");
    const res = await GET();

    expect(res.status).toBe(403);
    expect(userFindManyMock).not.toHaveBeenCalled();
  });
});
