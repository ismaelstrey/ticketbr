import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireStaffSessionMock, commentFindUniqueMock, commentDeleteMock } = vi.hoisted(() => ({
  requireStaffSessionMock: vi.fn(),
  commentFindUniqueMock: vi.fn(),
  commentDeleteMock: vi.fn()
}));

vi.mock("@/server/services/staff-context", () => ({
  requireStaffSession: requireStaffSessionMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    taskComment: { findUnique: commentFindUniqueMock, delete: commentDeleteMock }
  }
}));

import { DELETE } from "./route";

const params = { params: Promise.resolve({ id: "t1", commentId: "c1" }) } as any;

describe("/api/tasks/[id]/comments/[commentId]", () => {
  beforeEach(() => {
    requireStaffSessionMock.mockReset();
    commentFindUniqueMock.mockReset();
    commentDeleteMock.mockReset();
    commentDeleteMock.mockResolvedValue({ id: "c1" });
  });

  it("retorna 404 quando o comentário não existe", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u1", role: "ADMIN", name: "Admin", email: "a@a.com" });
    commentFindUniqueMock.mockResolvedValueOnce(null);

    const res = await DELETE({} as any, params);

    expect(res.status).toBe(404);
    expect(commentDeleteMock).not.toHaveBeenCalled();
  });

  it("retorna 404 quando o comentário pertence a outra tarefa", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u1", role: "ADMIN", name: "Admin", email: "a@a.com" });
    commentFindUniqueMock.mockResolvedValueOnce({ id: "c1", taskId: "other", authorId: "u1" });

    const res = await DELETE({} as any, params);

    expect(res.status).toBe(404);
  });

  it("retorna 403 quando não é o autor nem administrador", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u2", role: "AGENT", name: "Agente", email: "a@a.com" });
    commentFindUniqueMock.mockResolvedValueOnce({ id: "c1", taskId: "t1", authorId: "u1" });

    const res = await DELETE({} as any, params);

    expect(res.status).toBe(403);
    expect(commentDeleteMock).not.toHaveBeenCalled();
  });

  it("exclui o comentário quando é o autor", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u1", role: "AGENT", name: "Agente", email: "a@a.com" });
    commentFindUniqueMock.mockResolvedValueOnce({ id: "c1", taskId: "t1", authorId: "u1" });

    const res = await DELETE({} as any, params);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(commentDeleteMock).toHaveBeenCalledWith({ where: { id: "c1" } });
  });

  it("permite que o administrador exclua comentário de terceiros", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "admin", role: "ADMIN", name: "Admin", email: "a@a.com" });
    commentFindUniqueMock.mockResolvedValueOnce({ id: "c1", taskId: "t1", authorId: "u1" });

    const res = await DELETE({} as any, params);

    expect(res.status).toBe(200);
    expect(commentDeleteMock).toHaveBeenCalledTimes(1);
  });
});
