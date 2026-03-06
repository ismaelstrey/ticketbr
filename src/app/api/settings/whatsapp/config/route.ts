import { NextRequest, NextResponse } from "next/server";
import {
  WHATSAPP_CONFIG_COOKIE,
  encodeWhatsAppConfigCookie,
  getWhatsAppConfigFromDatabase,
  normalizeWhatsAppConfig,
  resolveWhatsAppConfig,
  saveWhatsAppConfigToDatabase,
  sanitizeWhatsAppConfig
} from "@/server/services/whatsapp-settings";

export async function GET(request: NextRequest) {
  // Use resolveWhatsAppConfig which now prioritizes DB
  const config = await resolveWhatsAppConfig(request);
  
  if (!config) {
    return NextResponse.json({ data: null });
  }
  return NextResponse.json({ data: sanitizeWhatsAppConfig(config) });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const existingConfig = await getWhatsAppConfigFromDatabase();
    
    // Merge strategy:
    // 1. Start with existing config
    // 2. Override with new body values, but prevent overwriting with masked keys
    const mergedRaw = {
      ...(existingConfig || {}),
      ...body
    };

    // Protect sensitive keys if they are masked or missing in the update
    if (body.apiKey && body.apiKey.includes("••••")) {
      mergedRaw.apiKey = existingConfig?.apiKey;
      mergedRaw.evolutionApiKey = existingConfig?.apiKey;
    }
    if (body.n8nApiKey && body.n8nApiKey.includes("••••")) {
      mergedRaw.n8nApiKey = existingConfig?.n8nApiKey;
    }

    const config = normalizeWhatsAppConfig(mergedRaw);

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
