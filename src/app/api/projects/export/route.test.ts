import { beforeEach, describe, expect, it, vi } from "vitest";

const requireStaffSessionMock = vi.fn();
const projectFindManyMock = vi.fn();
const projectExportAuditCreateMock = vi.fn();

vi.mock("@/server/services/staff-context", () => ({
  requireStaffSession: requireStaffSessionMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findMany: projectFindManyMock
    },
    projectExportAudit: {
      create: projectExportAuditCreateMock
    }
  }
}));

describe("/api/projects/export", () => {
  beforeEach(() => {
    vi.resetModules();
    requireStaffSessionMock.mockReset();
    projectFindManyMock.mockReset();
    projectExportAuditCreateMock.mockReset();
  });

  it("POST exporta json", async () => {
    requireStaffSessionMock.mockResolvedValue({ userId: "u1", role: "ADMIN", name: "Admin", email: "a@a.com" });
    projectFindManyMock.mockResolvedValueOnce([
      {
        id: "p1",
        name: "P1",
        status: "ACTIVE",
        ownerUser: { name: "Admin", email: "a@a.com" },
        startDate: null,
        endDate: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
        _count: { members: 1 }
      }
    ]);
    projectExportAuditCreateMock.mockResolvedValueOnce({ id: "e1" });

    const { POST } = await import("./route");
    const req = { json: async () => ({ format: "json" }) } as any;
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(projectExportAuditCreateMock).toHaveBeenCalledTimes(1);
  });
});

