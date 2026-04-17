import { NextRequest, NextResponse } from "next/server";
import {
  WHATSAPP_CONFIG_COOKIE,
  decodeWhatsAppConfigCookie,
  encodeWhatsAppConfigCookie,
  getWhatsAppConfigFromDatabase,
  normalizeWhatsAppConfig,
  saveWhatsAppConfigToDatabase,
  sanitizeWhatsAppConfig
} from "@/server/services/whatsapp-settings";
import { writeAuditLog } from "@/server/services/audit-log";
import { enforceAdminRouteSecurity, withRateLimitHeaders } from "@/server/services/sensitive-route-guard";

export async function GET(request: NextRequest) {
  const guard = await enforceAdminRouteSecurity(request, "settings.whatsapp.config.read");
  if (!guard.ok) {
    return guard.response;
  }

  const cookieValue = request.cookies.get(WHATSAPP_CONFIG_COOKIE)?.value;
  const cookieConfig = decodeWhatsAppConfigCookie(cookieValue);
  const config = cookieConfig ?? await getWhatsAppConfigFromDatabase();
  if (!config) {
    return withRateLimitHeaders(NextResponse.json({ data: null }), guard.rate);
  }
  return withRateLimitHeaders(NextResponse.json({ data: sanitizeWhatsAppConfig(config) }), guard.rate);
}

export async function POST(request: NextRequest) {
  const guard = await enforceAdminRouteSecurity(request, "settings.whatsapp.config.write");
  if (!guard.ok) {
    return guard.response;
  }

  try {
    const body = await request.json();
    const config = normalizeWhatsAppConfig(body);

    if (!config) {
      return withRateLimitHeaders(
        NextResponse.json(
          { error: "Informe configuracao Evolution completa, parametros n8n (n8nBaseUrl/n8nWebhookUrl) ou UAZAPI (uazapiToken + uazapiBaseUrl/uazapiSubdomain)" },
          { status: 400 }
        ),
        guard.rate
      );
    }

    const cookieValue = request.cookies.get(WHATSAPP_CONFIG_COOKIE)?.value;
    const cookieConfig = decodeWhatsAppConfigCookie(cookieValue);
    const previous = cookieConfig ?? await getWhatsAppConfigFromDatabase();

    const keepSecret = (nextValue: unknown) => typeof nextValue === "string" && nextValue.includes("••••");

    if (previous) {
      if (keepSecret(body.apiKey) && previous.apiKey) config.apiKey = previous.apiKey;
      if (keepSecret(body.n8nApiKey) && previous.n8nApiKey) config.n8nApiKey = previous.n8nApiKey;
      if (keepSecret(body.uazapiToken) && previous.uazapiToken) config.uazapiToken = previous.uazapiToken;
      if (keepSecret(body.uazapiAdminToken) && previous.uazapiAdminToken) config.uazapiAdminToken = previous.uazapiAdminToken;
    }

    await saveWhatsAppConfigToDatabase(config);
    await writeAuditLog({
      actorUserId: guard.actorUserId,
      action: "whatsapp_config_update",
      entity: "whatsapp_config",
      metadata: {
        provider: config.whatsappProvider,
        evolutionBaseUrl: config.baseUrl,
        n8nBaseUrl: config.n8nBaseUrl,
        uazapiBaseUrl: config.uazapiBaseUrl,
        uazapiSubdomain: config.uazapiSubdomain
      }
    });

    const response = NextResponse.json({ data: sanitizeWhatsAppConfig(config) });
    response.cookies.set({
      name: WHATSAPP_CONFIG_COOKIE,
      value: encodeWhatsAppConfigCookie(config),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });

    return withRateLimitHeaders(response, guard.rate);
  } catch (error) {
    console.error("Error saving WhatsApp config", error);
    return withRateLimitHeaders(NextResponse.json({ error: "Erro ao salvar configuracao" }, { status: 500 }), guard.rate);
  }
}
