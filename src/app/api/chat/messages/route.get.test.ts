import { describe, expect, it, vi, beforeEach } from "vitest";

const prismaMock = {
  conversation: {
    findUnique: vi.fn()
  },
  user: {
    findUnique: vi.fn()
  },
  message: {
    count: vi.fn(),
    groupBy: vi.fn(),
    findMany: vi.fn()
  }
};

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock
}));

describe("GET /api/chat/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.conversation.findUnique.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.message.count.mockResolvedValue(0);
    prismaMock.message.groupBy.mockResolvedValue([]);
    prismaMock.message.findMany.mockResolvedValue([]);
  });

  it("retorna 400 quando nenhum identificador é informado", async () => {
    const { GET } = await import("./route");
    const req = { nextUrl: { searchParams: new URLSearchParams() } } as any;
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("retorna lista vazia com meta quando conversa não existe", async () => {
    const { GET } = await import("./route");
    const params = new URLSearchParams({ waChatId: "5511999999999@s.whatsapp.net" });
    const req = { nextUrl: { searchParams: params } } as any;
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(0);
    expect(body.meta.totalMessages).toBe(0);
  });

  it("retorna mensagens ordenadas com paginação e metadados", async () => {
    prismaMock.conversation.findUnique.mockResolvedValueOnce({
      id: "c_1",
      waChatId: "5511999999999@s.whatsapp.net",
      assignedTo: "u_1"
    });

    prismaMock.message.count.mockResolvedValueOnce(2);
    prismaMock.message.groupBy.mockResolvedValueOnce([
      { direction: "in", _count: { _all: 1 } },
      { direction: "out", _count: { _all: 1 } }
    ]);

    prismaMock.message.findMany.mockResolvedValueOnce([
      {
        id: "m_2",
        waMessageId: "wamid.2",
        direction: "out",
        type: "text",
        body: "oi",
        mediaUrl: null,
        mimetype: null,
        status: "sent",
        createdAt: new Date("2026-03-20T10:00:00.000Z")
      },
      {
        id: "m_1",
        waMessageId: "wamid.1",
        direction: "in",
        type: "text",
        body: "olá",
        mediaUrl: null,
        mimetype: null,
        status: "sent",
        createdAt: new Date("2026-03-20T09:00:00.000Z")
      }
    ]);

    const { GET } = await import("./route");
    const params = new URLSearchParams({ contactId: "5511999999999@s.whatsapp.net", limit: "2" });
    const req = { nextUrl: { searchParams: params } } as any;
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.meta.totalMessages).toBe(2);
    expect(body.meta.usersTotal).toBe(2);
    expect(body.meta.conversationId).toBe("c_1");
    expect(body.paging.limit).toBe(2);
    expect(body.data[0].id).toBe("m_2");
    expect(body.data[0].timestamp).toBe("2026-03-20T10:00:00.000Z");
    expect(body.paging.nextCursor).toBe("m_1");
  });
});
