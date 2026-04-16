import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EnvelopeWithErrorSchema,
  ProjectCreateResponseSchema,
  ProjectListResponseSchema,
} from "./schemas";

const requireStaffSessionMock = vi.fn();
const projectFindManyMock = vi.fn();
const projectCountMock = vi.fn();
const projectCreateMock = vi.fn();

vi.mock("@/server/services/staff-context", () => ({
  requireStaffSession: requireStaffSessionMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findMany: projectFindManyMock,
      count: projectCountMock,
      create: projectCreateMock,
    },
  },
}));

describe("API Contract - /api/projects", () => {
  beforeEach(() => {
    vi.resetModules();
    requireStaffSessionMock.mockReset();
    projectFindManyMock.mockReset();
    projectCountMock.mockReset();
    projectCreateMock.mockReset();
  });

  it("GET returns list + pagination metadata contract", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u1", role: "ADMIN", name: "Admin", email: "a@a.com" });
    projectFindManyMock.mockResolvedValueOnce([{ id: "p1", name: "Projeto 1" }]);
    projectCountMock.mockResolvedValueOnce(1);

    const { GET } = await import("@/app/api/projects/route");
    const req = { nextUrl: { searchParams: new URLSearchParams({ page: "1", pageSize: "20" }) } } as any;
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(ProjectListResponseSchema.safeParse(body).success).toBe(true);
  });

  it("POST returns create contract", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u1", role: "AGENT", name: "Agente", email: "a@a.com" });
    projectCreateMock.mockResolvedValueOnce({ id: "p1", name: "Novo" });

    const { POST } = await import("@/app/api/projects/route");
    const req = { json: async () => ({ name: "Novo", description: null }) } as any;
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(ProjectCreateResponseSchema.safeParse(body).success).toBe(true);
  });

  it("POST returns bad request contract when body is invalid", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u1", role: "AGENT", name: "Agente", email: "a@a.com" });

    const { POST } = await import("@/app/api/projects/route");
    const req = { json: async () => ({}) } as any;
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(EnvelopeWithErrorSchema.safeParse(body).success).toBe(true);
  });
});
