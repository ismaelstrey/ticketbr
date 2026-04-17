import { NextRequest, NextResponse } from "next/server";
import {
  WHATSAPP_CONFIG_COOKIE,
  decodeWhatsAppConfigCookie,
  getWhatsAppConfigFromDatabase,
  normalizeWhatsAppConfig,
  resolveWhatsAppConfig
} from "@/server/services/whatsapp-settings";
import { syncWhatsAppContacts } from "@/server/services/whatsapp-contacts";
import { isUazapiConfigured } from "@/server/services/uazapi-adapter";
import { writeAuditLog } from "@/server/services/audit-log";
import { enforceAdminRouteSecurity, withRateLimitHeaders } from "@/server/services/sensitive-route-guard";

function isMaskedSecret(value: unknown) {
  return typeof value === "string" && value.includes("••••");
}

export async function POST(request: NextRequest) {
  try {
    const guard = await enforceAdminRouteSecurity(request, "settings.contacts.sync");
    if (!guard.ok) {
      return guard.response;
    }

    const body = await request.json().catch(() => ({}));
    const bodyConfig = normalizeWhatsAppConfig(body);

    const cookieValue = request.cookies.get(WHATSAPP_CONFIG_COOKIE)?.value;
    const cookieConfig = decodeWhatsAppConfigCookie(cookieValue);
    const storedConfig = cookieConfig ?? await getWhatsAppConfigFromDatabase();

    const merged = bodyConfig ? { ...bodyConfig } : null;
    if (merged && storedConfig) {
      if (isMaskedSecret(body.apiKey) && storedConfig.apiKey) merged.apiKey = storedConfig.apiKey;
      if (isMaskedSecret(body.n8nApiKey) && storedConfig.n8nApiKey) merged.n8nApiKey = storedConfig.n8nApiKey;
      if (isMaskedSecret(body.uazapiToken) && storedConfig.uazapiToken) merged.uazapiToken = storedConfig.uazapiToken;
      if (isMaskedSecret(body.uazapiAdminToken) && storedConfig.uazapiAdminToken) merged.uazapiAdminToken = storedConfig.uazapiAdminToken;
    }

    const config = await resolveWhatsAppConfig(request, merged);

    if (config?.whatsappProvider === "uazapi" && !isUazapiConfigured(config)) {
      return withRateLimitHeaders(
        NextResponse.json(
          {
            error:
              "Integracao UAZAPI nao configurada para sincronizacao de contatos. Configure token e URL base (ou subdominio) em Configuracoes > UAZAPI e salve."
          },
          { status: 400 }
        ),
        guard.rate
      );
    }

    const result = await syncWhatsAppContacts(config);

    await writeAuditLog({
      actorUserId: guard.actorUserId,
      action: "whatsapp_contacts_sync",
      entity: "whatsapp_contact",
      metadata: {
        provider: config?.whatsappProvider ?? null,
        totalReceived: result.totalReceived,
        totalSaved: result.totalSaved
      }
    });

    return withRateLimitHeaders(NextResponse.json({ data: result }), guard.rate);
  } catch (error: any) {
    console.error("Error syncing WhatsApp contacts", error);
    return NextResponse.json({ error: error?.message ?? "Erro ao sincronizar contatos" }, { status: 500 });
  }
}
