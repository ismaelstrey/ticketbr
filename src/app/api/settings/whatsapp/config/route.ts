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
      return NextResponse.json({ error: "Informe configuração Evolution completa ou parâmetros n8n (n8nBaseUrl/n8nWebhookUrl)" }, { status: 400 });
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
