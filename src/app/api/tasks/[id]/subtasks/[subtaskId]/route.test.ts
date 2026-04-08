import { beforeEach, describe, expect, it, vi } from "vitest";

const requireStaffSessionMock = vi.fn();
const subtaskFindUniqueMock = vi.fn();
const subtaskUpdateMock = vi.fn();

vi.mock("@/server/services/staff-context", () => ({
  requireStaffSession: requireStaffSessionMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    taskSubtask: {
      findUnique: subtaskFindUniqueMock,
      update: subtaskUpdateMock
    }
  }
}));

describe("/api/tasks/[id]/subtasks/[subtaskId]", () => {
  beforeEach(() => {
    vi.resetModules();
    requireStaffSessionMock.mockReset();
    subtaskFindUniqueMock.mockReset();
    subtaskUpdateMock.mockReset();
  });

  it("PATCH retorna 404 quando subtarefa não pertence à tarefa", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u1", role: "ADMIN", name: "Admin", email: "a@a.com" });
    subtaskFindUniqueMock.mockResolvedValueOnce({ id: "s1", taskId: "other" });

    const { PATCH } = await import("./route");
    const req = { json: async () => ({ isDone: true }) } as any;
    const res = await PATCH(req, { params: Promise.resolve({ id: "t1", subtaskId: "s1" }) } as any);
    expect(res.status).toBe(404);
  });

  it("PATCH atualiza subtarefa quando pertence", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u1", role: "ADMIN", name: "Admin", email: "a@a.com" });
    subtaskFindUniqueMock.mockResolvedValueOnce({ id: "s1", taskId: "t1" });
    subtaskUpdateMock.mockResolvedValueOnce({ id: "s1", isDone: true });

    const { PATCH } = await import("./route");
    const req = { json: async () => ({ isDone: true }) } as any;
    const res = await PATCH(req, { params: Promise.resolve({ id: "t1", subtaskId: "s1" }) } as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.id).toBe("s1");
  });
});

