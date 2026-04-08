import { beforeEach, describe, expect, it, vi } from "vitest";

const requireStaffSessionMock = vi.fn();
const projectCountMock = vi.fn();
const projectFindManyMock = vi.fn();

vi.mock("@/server/services/staff-context", () => ({
  requireStaffSession: requireStaffSessionMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      count: projectCountMock,
      findMany: projectFindManyMock
    }
  }
}));

describe("/api/projects/dashboard", () => {
  beforeEach(() => {
    vi.resetModules();
    requireStaffSessionMock.mockReset();
    projectCountMock.mockReset();
    projectFindManyMock.mockReset();
  });

  it("GET retorna KPIs e recentes", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u1", role: "ADMIN", name: "Admin", email: "a@a.com" });
    projectCountMock.mockResolvedValueOnce(10);
    projectCountMock.mockResolvedValueOnce(6);
    projectCountMock.mockResolvedValueOnce(2);
    projectCountMock.mockResolvedValueOnce(2);
    projectCountMock.mockResolvedValueOnce(1);
    projectFindManyMock.mockResolvedValueOnce([{ id: "p1", name: "P1", status: "ACTIVE", updatedAt: new Date() }]);

    const { GET } = await import("./route");
    const res = await GET({} as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.kpis.total).toBe(10);
    expect(Array.isArray(body.data.recent)).toBe(true);
  });
});

