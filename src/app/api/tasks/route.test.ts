import { beforeEach, describe, expect, it, vi } from "vitest";

const requireStaffSessionMock = vi.fn();

const taskFindManyMock = vi.fn();
const taskFindFirstMock = vi.fn();
const taskCreateMock = vi.fn();

vi.mock("@/server/services/staff-context", () => ({
  requireStaffSession: requireStaffSessionMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: {
      findMany: taskFindManyMock,
      findFirst: taskFindFirstMock,
      create: taskCreateMock
    }
  }
}));

describe("/api/tasks", () => {
  beforeEach(() => {
    vi.resetModules();
    requireStaffSessionMock.mockReset();
    taskFindManyMock.mockReset();
    taskFindFirstMock.mockReset();
    taskCreateMock.mockReset();
  });

  it("GET retorna lista de tarefas", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u1", role: "ADMIN", name: "Admin", email: "a@a.com" });
    taskFindManyMock.mockResolvedValueOnce([{ id: "t1", title: "Teste" }]);

    const { GET } = await import("./route");
    const req = { nextUrl: { searchParams: new URLSearchParams() } } as any;
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(requireStaffSessionMock).toHaveBeenCalledTimes(1);
    expect(taskFindManyMock).toHaveBeenCalledTimes(1);
  });

  it("POST cria tarefa e define sortOrder incremental", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u1", role: "ADMIN", name: "Admin", email: "a@a.com" });
    taskFindFirstMock.mockResolvedValueOnce({ sortOrder: 2000 });
    taskCreateMock.mockResolvedValueOnce({ id: "t1", title: "Nova" });

    const { POST } = await import("./route");
    const req = {
      json: async () => ({ title: "Nova", description: "", priority: "MEDIUM", status: "PENDING", dueAt: null, assigneeId: null })
    } as any;
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(taskCreateMock).toHaveBeenCalledTimes(1);
    expect(taskCreateMock.mock.calls[0][0].data.sortOrder).toBe(3000);
  });
});

