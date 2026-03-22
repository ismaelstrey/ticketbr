import { beforeEach, describe, expect, it, vi } from "vitest";

const executeRawMock = vi.fn();
const queryRawMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $executeRawUnsafe: executeRawMock,
    $queryRawUnsafe: queryRawMock
  }
}));

describe("chat-preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    executeRawMock.mockResolvedValue(undefined);
  });

  it("retorna defaults quando não há preferências salvas", async () => {
    queryRawMock.mockResolvedValueOnce([]);
    const { getChatInteractionPreferences } = await import("./chat-preferences");
    const preferences = await getChatInteractionPreferences("user_1");

    expect(preferences).toEqual({
      enableSound: true,
      enableAlert: false,
      preferredChannel: "whatsapp"
    });
  });

  it("normaliza e salva preferências por usuário", async () => {
    const { saveChatInteractionPreferences } = await import("./chat-preferences");
    const preferences = await saveChatInteractionPreferences("user_1", {
      enableSound: false,
      enableAlert: true,
      preferredChannel: "email"
    });

    expect(preferences).toEqual({
      enableSound: false,
      enableAlert: true,
      preferredChannel: "email"
    });
    expect(executeRawMock).toHaveBeenCalled();
  });
});
