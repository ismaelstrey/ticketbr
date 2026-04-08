import { beforeEach, describe, expect, it, vi } from "vitest";

const requireStaffSessionMock = vi.fn();
const projectFindManyMock = vi.fn();
const projectCountMock = vi.fn();
const projectCreateMock = vi.fn();

vi.mock("@/server/services/staff-context", () => ({
  requireStaffSession: requireStaffSessionMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findMany: projectFindManyMock,
      count: projectCountMock,
      create: projectCreateMock
    }
  }
}));

describe("/api/projects", () => {
  beforeEach(() => {
    vi.resetModules();
    requireStaffSessionMock.mockReset();
    projectFindManyMock.mockReset();
    projectCountMock.mockReset();
    projectCreateMock.mockReset();
  });

  it("GET retorna lista e meta", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u1", role: "ADMIN", name: "Admin", email: "a@a.com" });
    projectFindManyMock.mockResolvedValueOnce([{ id: "p1", name: "Projeto 1" }]);
    projectCountMock.mockResolvedValueOnce(1);

    const { GET } = await import("./route");
    const req = { nextUrl: { searchParams: new URLSearchParams({ page: "1", pageSize: "20" }) } } as any;
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta.total).toBe(1);
    expect(projectFindManyMock).toHaveBeenCalledTimes(1);
    expect(projectCountMock).toHaveBeenCalledTimes(1);
  });

  it("POST cria projeto", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u1", role: "AGENT", name: "Agente", email: "a@a.com" });
    projectCreateMock.mockResolvedValueOnce({ id: "p1", name: "Novo" });

    const { POST } = await import("./route");
    const req = { json: async () => ({ name: "Novo", description: null }) } as any;
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.id).toBe("p1");
    expect(projectCreateMock).toHaveBeenCalledTimes(1);
  });
});

