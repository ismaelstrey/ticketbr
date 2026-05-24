import { beforeEach, describe, expect, it, vi } from "vitest";

const isN8nConfiguredMock = vi.fn();
const sendMessageToN8nMock = vi.fn();
const evolutionIsConfiguredMock = vi.fn();
const sendTextToEvolutionMock = vi.fn();
const sendMediaToEvolutionMock = vi.fn();
const uazapiIsConfiguredMock = vi.fn();
const sendTextToUazapiMock = vi.fn();
const sendMediaToUazapiMock = vi.fn();

vi.mock("@/server/services/n8n-adapter", () => ({
  isN8nConfigured: isN8nConfiguredMock,
  sendMessageToN8n: sendMessageToN8nMock
}));

vi.mock("@/server/services/evolution-service", () => ({
  evolutionIsConfigured: evolutionIsConfiguredMock,
  sendTextToEvolution: sendTextToEvolutionMock,
  sendMediaToEvolution: sendMediaToEvolutionMock
}));

vi.mock("@/server/services/uazapi-service", () => ({
  uazapiIsConfigured: uazapiIsConfiguredMock,
  sendTextToUazapi: sendTextToUazapiMock,
  sendMediaToUazapi: sendMediaToUazapiMock
}));

describe("sendOutboundMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falha quando nenhum provider esta configurado", async () => {
    isN8nConfiguredMock.mockReturnValue(false);
    evolutionIsConfiguredMock.mockReturnValue(false);
    uazapiIsConfiguredMock.mockReturnValue(false);

    const { sendOutboundMessage } = await import("./chat-outbound");

    await expect(sendOutboundMessage({ contactId: "5511999999999@s.whatsapp.net", text: "oi" }, null))
      .rejects.toThrow("Nenhuma integracao externa de WhatsApp configurada");
  });

  it("falha sem chamar adapters externos quando o provider e none", async () => {
    isN8nConfiguredMock.mockReturnValue(true);
    evolutionIsConfiguredMock.mockReturnValue(true);
    uazapiIsConfiguredMock.mockReturnValue(true);

    const { sendOutboundMessage } = await import("./chat-outbound");

    await expect(sendOutboundMessage({ contactId: "5511999999999@s.whatsapp.net", text: "oi" }, { whatsappProvider: "none" }))
      .rejects.toThrow("Use o canal Portal para chat nativo");
    expect(sendMessageToN8nMock).toHaveBeenCalledTimes(0);
    expect(sendTextToEvolutionMock).toHaveBeenCalledTimes(0);
    expect(sendTextToUazapiMock).toHaveBeenCalledTimes(0);
  });

  it("envia texto via UAZAPI quando esse e o provider ativo", async () => {
    isN8nConfiguredMock.mockReturnValue(false);
    evolutionIsConfiguredMock.mockReturnValue(false);
    uazapiIsConfiguredMock.mockReturnValue(true);
    sendTextToUazapiMock.mockResolvedValueOnce({ ok: true });

    const { sendOutboundMessage } = await import("./chat-outbound");
    const result = await sendOutboundMessage({
      contactId: "5511999999999@s.whatsapp.net",
      text: "Ola",
      contactPhone: "5511999999999"
    }, { whatsappProvider: "uazapi", uazapiBaseUrl: "https://api.uazapi.com", uazapiToken: "tok" });

    expect(sendTextToUazapiMock).toHaveBeenCalledWith({ number: "5511999999999", text: "Ola" }, expect.anything());
    expect(result.provider).toBe("uazapi");
  });
});
