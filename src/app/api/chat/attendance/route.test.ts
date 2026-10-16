import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const guardStaffMock = vi.fn();
const conversationFindUniqueMock = vi.fn();
const conversationUpdateMock = vi.fn();
const userFindUniqueMock = vi.fn();
const findOrCreateConversationMock = vi.fn();
const recordCriticalFlowEventMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  getSession: getSessionMock
}));

vi.mock("@/server/services/staff-context", () => ({
  guardStaff: guardStaffMock
}));

vi.mock("@/server/services/critical-flow-observability", () => ({
  recordCriticalFlowEvent: recordCriticalFlowEventMock
}));

vi.mock("@/server/services/chat-service", () => ({
  chatService: {
    findOrCreateConversation: findOrCreateConversationMock
  }
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: {
      findUnique: conversationFindUniqueMock,
      update: conversationUpdateMock
    },
    user: {
      findUnique: userFindUniqueMock
    }
  }
}));

describe("POST /api/chat/attendance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardStaffMock.mockResolvedValue(null);
    getSessionMock.mockResolvedValue({ id: "agent1", name: "Atendente" });
    conversationFindUniqueMock.mockResolvedValue({
      id: "conv1",
      waChatId: "5511999999999@s.whatsapp.net",
      assignedTo: "agent1"
    });
    recordCriticalFlowEventMock.mockResolvedValue(undefined);
  });

  it("bloqueia transferência para usuário que não é staff", async () => {
    userFindUniqueMock.mockResolvedValueOnce({ id: "cust1", name: "Cliente", role: "CUSTOMER" });

    const { POST } = await import("./route");
    const req = {
      json: async () => ({
        action: "transfer",
        waChatId: "5511999999999@s.whatsapp.net",
        targetUserId: "cust1"
      })
    } as any;

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Atendente de destino nao encontrado");
    expect(conversationUpdateMock).not.toHaveBeenCalled();
  });

  it("bloqueia acesso quando a sessão não é de staff", async () => {
    guardStaffMock.mockResolvedValueOnce({ status: 403 });

    const { POST } = await import("./route");
    const req = { json: async () => ({}) } as any;

    const res = await POST(req);

    expect(res.status).toBe(403);
    expect(conversationFindUniqueMock).not.toHaveBeenCalled();
  });
});
