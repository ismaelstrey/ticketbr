import type { ExternalWhatsAppProvider, WhatsAppRuntimeConfig } from "@/server/services/whatsapp-settings";
import { isN8nConfigured } from "@/server/services/n8n-adapter";
import { evolutionIsConfigured } from "@/server/services/evolution-service";
import { uazapiIsConfigured } from "@/server/services/uazapi-service";

export type WhatsAppProviderName = ExternalWhatsAppProvider;

export interface AvailableWhatsAppProviders {
  n8n: boolean;
  evolution: boolean;
  uazapi: boolean;
}

export function getAvailableWhatsAppProviders(config?: WhatsAppRuntimeConfig | null): AvailableWhatsAppProviders {
  return {
    n8n: isN8nConfigured(config),
    evolution: evolutionIsConfigured(config),
    uazapi: uazapiIsConfigured(config)
  };
}

export function resolveWhatsAppProvider(
  config?: WhatsAppRuntimeConfig | null,
  fallbackOrder: WhatsAppProviderName[] = ["n8n", "evolution", "uazapi"]
): WhatsAppProviderName | null {
  if (config?.whatsappProvider === "none") {
    return null;
  }

  const available = getAvailableWhatsAppProviders(config);
  const preferred = config?.whatsappProvider as WhatsAppProviderName | undefined;

  if (preferred && available[preferred]) {
    return preferred;
  }

  for (const provider of fallbackOrder) {
    if (available[provider]) {
      return provider;
    }
  }

  return null;
}

export function assertProviderConfigured(provider: WhatsAppProviderName, config?: WhatsAppRuntimeConfig | null) {
  const available = getAvailableWhatsAppProviders(config);
  return available[provider];
}
