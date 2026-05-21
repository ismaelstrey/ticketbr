import { beforeEach, describe, expect, it, vi } from "vitest";

const ticketFindManyMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ticket: {
      findMany: ticketFindManyMock
    }
  }
}));

describe("getCustomerTicketsDashboard", () => {
  beforeEach(() => {
    vi.resetModules();
    ticketFindManyMock.mockReset();
  });

  it("filtra tickets pelo solicitante recebido", async () => {
    ticketFindManyMock.mockResolvedValueOnce([]);

    const { getCustomerTicketsDashboard } = await import("./customer-dashboard");
    await getCustomerTicketsDashboard("solicitante_1", { preset: "7d", status: "DOING", q: "login" });

    expect(ticketFindManyMock).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        solicitante_id: "solicitante_1",
        deleted_at: null,
        status: "DOING",
        OR: expect.any(Array)
      })
    }));
  });
});
