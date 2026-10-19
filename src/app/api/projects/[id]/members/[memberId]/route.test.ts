import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireStaffSessionMock,
  projectFindUniqueMock,
  memberFindUniqueMock,
  memberUpdateMock,
  memberDeleteMock
} = vi.hoisted(() => ({
  requireStaffSessionMock: vi.fn(),
  projectFindUniqueMock: vi.fn(),
  memberFindUniqueMock: vi.fn(),
  memberUpdateMock: vi.fn(),
  memberDeleteMock: vi.fn()
}));

vi.mock("@/server/services/staff-context", () => ({
  requireStaffSession: requireStaffSessionMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { findUnique: projectFindUniqueMock },
    projectMember: { findUnique: memberFindUniqueMock, update: memberUpdateMock, delete: memberDeleteMock }
  }
}));

import { DELETE, PATCH } from "./route";

describe("/api/projects/[id]/members/[memberId]", () => {
  beforeEach(() => {
    requireStaffSessionMock.mockReset();
    projectFindUniqueMock.mockReset();
    memberFindUniqueMock.mockReset();
    memberUpdateMock.mockReset();
    memberDeleteMock.mockReset();
  });

  it("PATCH retorna 403 quando não é dono nem admin", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u9", role: "AGENT", name: "Agente", email: "a@a.com" });
    projectFindUniqueMock.mockResolvedValueOnce({ id: "p1", ownerUserId: "u1" });

    const req = { json: async () => ({ role: "viewer" }) } as any;
    const res = await PATCH(req, { params: Promise.resolve({ id: "p1", memberId: "m2" }) } as any);
    expect(res.status).toBe(403);
  });

  it("PATCH retorna 409 quando tenta alterar o papel do dono", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u1", role: "AGENT", name: "Dono", email: "a@a.com" });
    projectFindUniqueMock.mockResolvedValueOnce({ id: "p1", ownerUserId: "u1" });
    memberFindUniqueMock.mockResolvedValueOnce({ id: "m1", projectId: "p1", role: "owner" });

    const req = { json: async () => ({ role: "viewer" }) } as any;
    const res = await PATCH(req, { params: Promise.resolve({ id: "p1", memberId: "m1" }) } as any);
    expect(res.status).toBe(409);
  });

  it("PATCH atualiza o papel com sucesso", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u1", role: "AGENT", name: "Dono", email: "a@a.com" });
    projectFindUniqueMock.mockResolvedValueOnce({ id: "p1", ownerUserId: "u1" });
    memberFindUniqueMock.mockResolvedValueOnce({ id: "m2", projectId: "p1", role: "member" });
    memberUpdateMock.mockResolvedValueOnce({
      id: "m2",
      userId: "u3",
      role: "viewer",
      createdAt: new Date(),
      user: { id: "u3", name: "Membro", email: "m@m.com" }
    });

    const req = { json: async () => ({ role: "viewer" }) } as any;
    const res = await PATCH(req, { params: Promise.resolve({ id: "p1", memberId: "m2" }) } as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.role).toBe("viewer");
  });

  it("DELETE retorna 409 quando tenta remover o dono", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u1", role: "ADMIN", name: "Admin", email: "a@a.com" });
    projectFindUniqueMock.mockResolvedValueOnce({ id: "p1", ownerUserId: "u1" });
    memberFindUniqueMock.mockResolvedValueOnce({ id: "m1", projectId: "p1", role: "owner" });

    const res = await DELETE({} as any, { params: Promise.resolve({ id: "p1", memberId: "m1" }) } as any);
    expect(res.status).toBe(409);
  });

  it("DELETE remove um membro com sucesso", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u1", role: "AGENT", name: "Dono", email: "a@a.com" });
    projectFindUniqueMock.mockResolvedValueOnce({ id: "p1", ownerUserId: "u1" });
    memberFindUniqueMock.mockResolvedValueOnce({ id: "m2", projectId: "p1", role: "member" });
    memberDeleteMock.mockResolvedValueOnce({ id: "m2" });

    const res = await DELETE({} as any, { params: Promise.resolve({ id: "p1", memberId: "m2" }) } as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
  });
});
