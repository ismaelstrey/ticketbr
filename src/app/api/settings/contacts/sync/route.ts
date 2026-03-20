import { NextRequest, NextResponse } from "next/server";
import { normalizeWhatsAppConfig, resolveWhatsAppConfig } from "@/server/services/whatsapp-settings";
import { syncWhatsAppContacts } from "@/server/services/whatsapp-contacts";
import { isUazapiConfigured } from "@/server/services/uazapi-adapter";

function isMaskedSecret(value: unknown) {
  return typeof value === "string" && value.includes("•");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const bodyConfig = normalizeWhatsAppConfig(body) || {};
    const storedConfig = await resolveWhatsAppConfig(request);

    const merged: any = {
      ...(storedConfig || {}),
      ...bodyConfig
    };

    if (body?.whatsappProvider === "n8n" || body?.whatsappProvider === "evolution" || body?.whatsappProvider === "uazapi") {
      merged.whatsappProvider = body.whatsappProvider;
    }

    if (storedConfig) {
      if (isMaskedSecret(body.apiKey) && storedConfig.apiKey) merged.apiKey = storedConfig.apiKey;
      if (isMaskedSecret(body.n8nApiKey) && storedConfig.n8nApiKey) merged.n8nApiKey = storedConfig.n8nApiKey;
      if (isMaskedSecret(body.uazapiToken) && storedConfig.uazapiToken) merged.uazapiToken = storedConfig.uazapiToken;
      if (isMaskedSecret(body.uazapiAdminToken) && storedConfig.uazapiAdminToken) merged.uazapiAdminToken = storedConfig.uazapiAdminToken;
    }

    const config = merged;

    if (config?.whatsappProvider === "uazapi" && !isUazapiConfigured(config)) {
      return NextResponse.json(
        {
          error:
            "Integração UAZAPI não configurada para sincronização de contatos. Configure o token e a URL base (ou subdomínio) em Configurações > UAZAPI e salve."
        },
        { status: 400 }
      );
    }

    const result = await syncWhatsAppContacts(config);
    return NextResponse.json({ data: result });
  } catch (error: any) {
    console.error("Error syncing WhatsApp contacts", error);
    return NextResponse.json({ error: error?.message ?? "Erro ao sincronizar contatos" }, { status: 500 });
  }
}
