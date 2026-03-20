import { describe, expect, it, vi } from "vitest";

const findUniqueOrThrowMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: {
      findUniqueOrThrow: findUniqueOrThrowMock
    }
  }
}));

describe("buildConversationContext", () => {
  it("retorna contexto com mensagens recentes em ordem cronológica", async () => {
    findUniqueOrThrowMock.mockResolvedValueOnce({
      id: "conv_1",
      waChatId: "5511999999999@s.whatsapp.net",
      instance: "ticketbr",
      status: "open",
      botActive: true,
      humanActive: false,
      assignedTo: null,
      lastMessageAt: new Date("2026-03-20T10:00:00.000Z"),
      messages: [
        {
          id: "m2",
          direction: "in",
          type: "text",
          body: "segunda",
          status: "delivered",
          createdAt: new Date("2026-03-20T10:00:00.000Z")
        },
        {
          id: "m1",
          direction: "out",
          type: "text",
          body: "primeira",
          status: "sent",
          createdAt: new Date("2026-03-20T09:59:00.000Z")
        }
      ]
    });

    const { buildConversationContext } = await import("./chat-context");
    const context = await buildConversationContext("conv_1", { recentLimit: 2 });

    expect(findUniqueOrThrowMock).toHaveBeenCalledWith({
      where: { id: "conv_1" },
      include: {
        messages: {
          take: 2,
          orderBy: { createdAt: "desc" }
        }
      }
    });
    expect(context.recentMessages.map((message) => message.id)).toEqual(["m1", "m2"]);
    expect(context.botActive).toBe(true);
  });
});
