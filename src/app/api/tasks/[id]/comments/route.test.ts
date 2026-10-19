import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireStaffSessionMock, commentFindManyMock, commentCreateMock, taskFindUniqueMock } = vi.hoisted(() => ({
  requireStaffSessionMock: vi.fn(),
  commentFindManyMock: vi.fn(),
  commentCreateMock: vi.fn(),
  taskFindUniqueMock: vi.fn()
}));

vi.mock("@/server/services/staff-context", () => ({
  requireStaffSession: requireStaffSessionMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    taskComment: { findMany: commentFindManyMock, create: commentCreateMock },
    task: { findUnique: taskFindUniqueMock }
  }
}));

import { GET, POST } from "./route";

const params = { params: Promise.resolve({ id: "t1" }) } as any;

function makeRequest(body: unknown) {
  return { json: async () => body } as any;
}

describe("/api/tasks/[id]/comments", () => {
  beforeEach(() => {
    requireStaffSessionMock.mockReset();
    commentFindManyMock.mockReset();
    commentCreateMock.mockReset();
    taskFindUniqueMock.mockReset();
    requireStaffSessionMock.mockResolvedValue({ userId: "u1", role: "AGENT", name: "Agente", email: "a@a.com" });
  });

  it("GET retorna 401 quando não há sessão de staff", async () => {
    requireStaffSessionMock.mockRejectedValueOnce(new Error("UNAUTHORIZED"));

    const res = await GET({} as any, params);

    expect(res.status).toBe(401);
  });

  it("GET lista os comentários da tarefa", async () => {
    commentFindManyMock.mockResolvedValueOnce([
      { id: "c1", taskId: "t1", authorId: "u1", body: "Olá", author: { id: "u1", name: "Agente", email: "a@a.com" } }
    ]);

    const res = await GET({} as any, params);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(commentFindManyMock).toHaveBeenCalledWith(expect.objectContaining({ where: { taskId: "t1" } }));
  });

  it("POST cria um comentário e usa o autor da sessão", async () => {
    taskFindUniqueMock.mockResolvedValueOnce({ id: "t1" });
    commentCreateMock.mockResolvedValueOnce({ id: "c1", taskId: "t1", authorId: "u1", body: "Novo" });

    const res = await POST(makeRequest({ body: "Novo" }), params);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.id).toBe("c1");
    expect(commentCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { taskId: "t1", authorId: "u1", body: "Novo" } })
    );
  });

  it("POST retorna 400 quando o corpo é vazio", async () => {
    const res = await POST(makeRequest({ body: "   " }), params);

    expect(res.status).toBe(400);
    expect(commentCreateMock).not.toHaveBeenCalled();
  });

  it("POST retorna 404 quando a tarefa não existe", async () => {
    taskFindUniqueMock.mockResolvedValueOnce(null);

    const res = await POST(makeRequest({ body: "Olá" }), params);

    expect(res.status).toBe(404);
    expect(commentCreateMock).not.toHaveBeenCalled();
  });
});
