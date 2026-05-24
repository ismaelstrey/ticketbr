import { describe, expect, it } from "vitest";
import { normalizeWhatsAppConfig, sanitizeWhatsAppConfig } from "./whatsapp-settings";

describe("whatsapp-settings", () => {
  it("aceita provider none sem credenciais externas", () => {
    expect(normalizeWhatsAppConfig({ whatsappProvider: "none", autoLinkTickets: true })).toEqual({
      whatsappProvider: "none",
      autoLinkTickets: true
    });
  });

  it("preserva provider none na resposta sanitizada", () => {
    expect(sanitizeWhatsAppConfig({ whatsappProvider: "none" }).whatsappProvider).toBe("none");
  });
});
