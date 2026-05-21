import { beforeEach, describe, expect, it, vi } from "vitest";

const requireCustomerContextMock = vi.fn();
const writeAuditLogMock = vi.fn();
const notifyTicketCommentedMock = vi.fn();
const ticketFindFirstMock = vi.fn();
const ticketEventCreateMock = vi.fn();

vi.mock("@/server/services/customer-context", () => ({
  requireCustomerContext: requireCustomerContextMock
}));

vi.mock("@/server/services/audit-log", () => ({
  writeAuditLog: writeAuditLogMock
}));

vi.mock("@/server/services/customer-notifications", () => ({
  notifyTicketCommented: notifyTicketCommentedMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ticket: {
      findFirst: ticketFindFirstMock
    },
    ticketEvent: {
      create: ticketEventCreateMock,
      findMany: vi.fn()
    }
  }
}));

describe("/api/customer/tickets/[id]/comments", () => {
  beforeEach(() => {
    vi.resetModules();
    requireCustomerContextMock.mockReset();
    writeAuditLogMock.mockReset();
    notifyTicketCommentedMock.mockReset();
    ticketFindFirstMock.mockReset();
    ticketEventCreateMock.mockReset();

    requireCustomerContextMock.mockResolvedValue({
      user: { id: "u1", email: "c@a.com", name: "Cliente", role: "CUSTOMER" },
      solicitante: { id: "s1", nome_fantasia: "ACME", razao_social: "ACME", email: "acme@a.com" },
      member: { id: "m1", solicitante_id: "s1", isAdmin: false }
    });
  });

  it("POST retorna 404 quando o ticket nao pertence ao cliente", async () => {
    ticketFindFirstMock.mockResolvedValueOnce(null);

    const { POST } = await import("./route");
    const req = { json: async () => ({ message: "Pode verificar?" }) } as any;
    const res = await POST(req, { params: Promise.resolve({ id: "ticket_de_outra_empresa" }) });

    expect(res.status).toBe(404);
    expect(ticketEventCreateMock).not.toHaveBeenCalled();
  });
});
