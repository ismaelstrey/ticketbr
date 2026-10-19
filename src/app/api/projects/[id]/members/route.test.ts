import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireStaffSessionMock,
  projectFindUniqueMock,
  userFindUniqueMock,
  memberFindUniqueMock,
  memberCreateMock
} = vi.hoisted(() => ({
  requireStaffSessionMock: vi.fn(),
  projectFindUniqueMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  memberFindUniqueMock: vi.fn(),
  memberCreateMock: vi.fn()
}));

vi.mock("@/server/services/staff-context", () => ({
  requireStaffSession: requireStaffSessionMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { findUnique: projectFindUniqueMock },
    user: { findUnique: userFindUniqueMock },
    projectMember: { findUnique: memberFindUniqueMock, create: memberCreateMock }
  }
}));

import { GET, POST } from "./route";

describe("/api/projects/[id]/members", () => {
  beforeEach(() => {
    requireStaffSessionMock.mockReset();
    projectFindUniqueMock.mockReset();
    userFindUniqueMock.mockReset();
    memberFindUniqueMock.mockReset();
    memberCreateMock.mockReset();
  });

  it("GET retorna 404 quando o projeto não existe", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u1", role: "ADMIN", name: "Admin", email: "a@a.com" });
    projectFindUniqueMock.mockResolvedValueOnce(null);

    const res = await GET({} as any, { params: Promise.resolve({ id: "p1" }) } as any);
    expect(res.status).toBe(404);
  });

  it("GET retorna 403 quando o usuário não é dono nem membro", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u9", role: "AGENT", name: "Agente", email: "a@a.com" });
    projectFindUniqueMock.mockResolvedValueOnce({ id: "p1", ownerUserId: "u1", members: [] });

    const res = await GET({} as any, { params: Promise.resolve({ id: "p1" }) } as any);
    expect(res.status).toBe(403);
  });

  it("GET lista membros quando o usuário é membro", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u2", role: "AGENT", name: "Agente", email: "a@a.com" });
    projectFindUniqueMock.mockResolvedValueOnce({
      id: "p1",
      ownerUserId: "u1",
      members: [{ id: "m1", userId: "u2", role: "member", createdAt: new Date(), user: { id: "u2", name: "Agente", email: "a@a.com" } }]
    });

    const res = await GET({} as any, { params: Promise.resolve({ id: "p1" }) } as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });

  it("POST retorna 403 quando não é dono nem admin", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u2", role: "AGENT", name: "Agente", email: "a@a.com" });
    projectFindUniqueMock.mockResolvedValueOnce({ id: "p1", ownerUserId: "u1" });

    const req = { json: async () => ({ userId: "u3" }) } as any;
    const res = await POST(req, { params: Promise.resolve({ id: "p1" }) } as any);
    expect(res.status).toBe(403);
  });

  it("POST retorna 409 quando o usuário já é membro", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u1", role: "AGENT", name: "Dono", email: "a@a.com" });
    projectFindUniqueMock.mockResolvedValueOnce({ id: "p1", ownerUserId: "u1" });
    userFindUniqueMock.mockResolvedValueOnce({ id: "u3", role: "AGENT" });
    memberFindUniqueMock.mockResolvedValueOnce({ id: "m1" });

    const req = { json: async () => ({ userId: "u3" }) } as any;
    const res = await POST(req, { params: Promise.resolve({ id: "p1" }) } as any);
    expect(res.status).toBe(409);
  });

  it("POST adiciona membro com sucesso (201)", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u1", role: "AGENT", name: "Dono", email: "a@a.com" });
    projectFindUniqueMock.mockResolvedValueOnce({ id: "p1", ownerUserId: "u1" });
    userFindUniqueMock.mockResolvedValueOnce({ id: "u3", role: "AGENT" });
    memberFindUniqueMock.mockResolvedValueOnce(null);
    memberCreateMock.mockResolvedValueOnce({
      id: "m2",
      userId: "u3",
      role: "member",
      createdAt: new Date(),
      user: { id: "u3", name: "Novo", email: "n@n.com" }
    });

    const req = { json: async () => ({ userId: "u3", role: "member" }) } as any;
    const res = await POST(req, { params: Promise.resolve({ id: "p1" }) } as any);
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.userId).toBe("u3");
  });

  it("POST retorna 400 quando o usuário alvo não é staff", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u1", role: "ADMIN", name: "Admin", email: "a@a.com" });
    projectFindUniqueMock.mockResolvedValueOnce({ id: "p1", ownerUserId: "u2" });
    userFindUniqueMock.mockResolvedValueOnce({ id: "u3", role: "CUSTOMER" });

    const req = { json: async () => ({ userId: "u3" }) } as any;
    const res = await POST(req, { params: Promise.resolve({ id: "p1" }) } as any);
    expect(res.status).toBe(400);
  });
});
