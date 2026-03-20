import { describe, expect, it, vi } from "vitest";

const isN8nConfiguredMock = vi.fn();
const evolutionIsConfiguredMock = vi.fn();
const uazapiIsConfiguredMock = vi.fn();

vi.mock("@/server/services/n8n-adapter", () => ({
  isN8nConfigured: isN8nConfiguredMock
}));

vi.mock("@/server/services/evolution-service", () => ({
  evolutionIsConfigured: evolutionIsConfiguredMock
}));

vi.mock("@/server/services/uazapi-service", () => ({
  uazapiIsConfigured: uazapiIsConfiguredMock
}));

describe("chat-provider", () => {
  it("prioriza o provider configurado quando ele está disponível", async () => {
    isN8nConfiguredMock.mockReturnValue(true);
    evolutionIsConfiguredMock.mockReturnValue(true);
    uazapiIsConfiguredMock.mockReturnValue(true);

    const { resolveWhatsAppProvider } = await import("./chat-provider");
    expect(resolveWhatsAppProvider({ whatsappProvider: "uazapi" })).toBe("uazapi");
  });

  it("usa a ordem de fallback quando o provider preferido não está disponível", async () => {
    isN8nConfiguredMock.mockReturnValue(true);
    evolutionIsConfiguredMock.mockReturnValue(false);
    uazapiIsConfiguredMock.mockReturnValue(false);

    const { resolveWhatsAppProvider } = await import("./chat-provider");
    expect(resolveWhatsAppProvider({ whatsappProvider: "uazapi" }, ["evolution", "n8n"])).toBe("n8n");
  });
});
