import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const listNotificationsMock = vi.fn();
const markNotificationsReadMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  getSession: getSessionMock
}));

vi.mock("@/server/services/notifications", () => ({
  listNotifications: listNotificationsMock,
  markNotificationsRead: markNotificationsReadMock
}));

// Evita persistência real de métricas de rota durante os testes
vi.mock("@/server/services/route-metrics-observability", () => ({
  recordRouteMetric: async () => {},
  trackRouteResponse: async (_route: string, _method: string, _context: unknown, response: Response) => response
}));

describe("/api/notifications", () => {
  beforeEach(() => {
    vi.resetModules();
    getSessionMock.mockReset();
    listNotificationsMock.mockReset();
    markNotificationsReadMock.mockReset();
  });

  it("GET retorna 401 sem sessão", async () => {
    getSessionMock.mockResolvedValue(null);

    const { GET } = await import("./route");
    const req = { nextUrl: { searchParams: new URLSearchParams() } } as any;
    const res = await GET(req);

    expect(res.status).toBe(401);
    expect(listNotificationsMock).not.toHaveBeenCalled();
  });

  it("GET lista notificações do usuário autenticado", async () => {
    getSessionMock.mockResolvedValue({ id: "u1", name: "Ana", role: "ADMIN" });
    listNotificationsMock.mockResolvedValue({ items: [{ id: "n1" }], unreadCount: 2 });

    const { GET } = await import("./route");
    const req = { nextUrl: { searchParams: new URLSearchParams("limit=5") } } as any;
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.unreadCount).toBe(2);
    expect(listNotificationsMock).toHaveBeenCalledWith("u1", { limit: 5 });
  });

  it("PATCH retorna 400 para payload inválido", async () => {
    getSessionMock.mockResolvedValue({ id: "u1" });

    const { PATCH } = await import("./route");
    const req = { json: async () => ({ all: "nao-boolean" }) } as any;
    const res = await PATCH(req);

    expect(res.status).toBe(400);
    expect(markNotificationsReadMock).not.toHaveBeenCalled();
  });

  it("PATCH marca todas como lidas", async () => {
    getSessionMock.mockResolvedValue({ id: "u1" });
    markNotificationsReadMock.mockResolvedValue({ updated: 3 });

    const { PATCH } = await import("./route");
    const req = { json: async () => ({ all: true }) } as any;
    const res = await PATCH(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.updated).toBe(3);
    expect(markNotificationsReadMock).toHaveBeenCalledWith("u1", { all: true });
  });
});
