import { beforeEach, describe, expect, it, vi } from "vitest";

const requireStaffSessionMock = vi.fn();
const projectFindUniqueMock = vi.fn();
const projectUpdateMock = vi.fn();
const projectDeleteMock = vi.fn();

vi.mock("@/server/services/staff-context", () => ({
  requireStaffSession: requireStaffSessionMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findUnique: projectFindUniqueMock,
      update: projectUpdateMock,
      delete: projectDeleteMock
    }
  }
}));

describe("/api/projects/[id]", () => {
  beforeEach(() => {
    vi.resetModules();
    requireStaffSessionMock.mockReset();
    projectFindUniqueMock.mockReset();
    projectUpdateMock.mockReset();
    projectDeleteMock.mockReset();
  });

  it("GET retorna 404 quando não existe", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u1", role: "ADMIN", name: "Admin", email: "a@a.com" });
    projectFindUniqueMock.mockResolvedValueOnce(null);

    const { GET } = await import("./route");
    const res = await GET({} as any, { params: Promise.resolve({ id: "p1" }) } as any);
    expect(res.status).toBe(404);
  });

  it("PATCH retorna 403 quando não é dono nem admin", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u2", role: "AGENT", name: "Agente", email: "a@a.com" });
    projectFindUniqueMock.mockResolvedValueOnce({ id: "p1", ownerUserId: "u1", startDate: null, endDate: null });

    const { PATCH } = await import("./route");
    const req = { json: async () => ({ name: "X" }) } as any;
    const res = await PATCH(req, { params: Promise.resolve({ id: "p1" }) } as any);
    expect(res.status).toBe(403);
  });

  it("DELETE remove quando admin", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u1", role: "ADMIN", name: "Admin", email: "a@a.com" });
    projectFindUniqueMock.mockResolvedValueOnce({ id: "p1", ownerUserId: "u2" });
    projectDeleteMock.mockResolvedValueOnce({ id: "p1" });

    const { DELETE } = await import("./route");
    const res = await DELETE({} as any, { params: Promise.resolve({ id: "p1" }) } as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
  });
});

