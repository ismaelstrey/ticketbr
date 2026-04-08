import { beforeEach, describe, expect, it, vi } from "vitest";

const requireStaffSessionMock = vi.fn();
const taskFindUniqueMock = vi.fn();
const taskFindFirstMock = vi.fn();
const taskUpdateMock = vi.fn();

vi.mock("@/server/services/staff-context", () => ({
  requireStaffSession: requireStaffSessionMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: {
      findUnique: taskFindUniqueMock,
      findFirst: taskFindFirstMock,
      update: taskUpdateMock
    }
  }
}));

describe("/api/tasks/[id]/move", () => {
  beforeEach(() => {
    vi.resetModules();
    requireStaffSessionMock.mockReset();
    taskFindUniqueMock.mockReset();
    taskFindFirstMock.mockReset();
    taskUpdateMock.mockReset();
  });

  it("PATCH move para coluna e atribui sortOrder após último", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u1", role: "ADMIN", name: "Admin", email: "a@a.com" });
    taskFindUniqueMock.mockResolvedValueOnce({ id: "t1", status: "PENDING", sortOrder: 1000 });
    taskFindFirstMock.mockResolvedValueOnce({ sortOrder: 5000 });
    taskUpdateMock.mockResolvedValueOnce({ id: "t1", status: "IN_PROGRESS", sortOrder: 6000 });

    const { PATCH } = await import("./route");
    const req = { json: async () => ({ status: "IN_PROGRESS" }) } as any;
    const res = await PATCH(req, { params: Promise.resolve({ id: "t1" }) } as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(taskUpdateMock).toHaveBeenCalledTimes(1);
    expect(taskUpdateMock.mock.calls[0][0].data.sortOrder).toBe(6000);
    expect(body.data.id).toBe("t1");
  }, 15_000);
});
