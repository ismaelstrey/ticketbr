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

export async function GET(request: NextRequest) {
  const cookieValue = request.cookies.get(WHATSAPP_CONFIG_COOKIE)?.value;
  const cookieConfig = decodeWhatsAppConfigCookie(cookieValue);
  const config = cookieConfig ?? await getWhatsAppConfigFromDatabase();
  if (!config) {
    return NextResponse.json({ data: null });
  }
  return NextResponse.json({ data: sanitizeWhatsAppConfig(config) });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const config = normalizeWhatsAppConfig(body);

    if (!config) {
      return NextResponse.json({ error: "Informe configuração Evolution completa, parâmetros n8n (n8nBaseUrl/n8nWebhookUrl) ou UAZAPI (uazapiToken + uazapiBaseUrl/uazapiSubdomain)" }, { status: 400 });
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

    return response;
  } catch (error) {
    console.error("Error saving WhatsApp config", error);
    return NextResponse.json({ error: "Erro ao salvar configuração" }, { status: 500 });
  }
}
