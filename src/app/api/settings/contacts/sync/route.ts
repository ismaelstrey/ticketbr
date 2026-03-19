import { NextRequest, NextResponse } from "next/server";
import { normalizeWhatsAppConfig, resolveWhatsAppConfig } from "@/server/services/whatsapp-settings";
import { syncWhatsAppContacts } from "@/server/services/whatsapp-contacts";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const bodyConfig = normalizeWhatsAppConfig(body);
    const config = await resolveWhatsAppConfig(request, bodyConfig);
    // console.log(config)

    const result = await syncWhatsAppContacts(config);
    return NextResponse.json({ data: result });
  } catch (error: any) {
    console.error("Error syncing WhatsApp contacts", error);
    return NextResponse.json({ error: error?.message ?? "Erro ao sincronizar contatos" }, { status: 500 });
  }
}
