import { NextRequest, NextResponse } from "next/server";
import { listSyncedWhatsAppContacts } from "@/server/services/whatsapp-contacts";

export async function GET(request: NextRequest) {
  try {
    const limit = Number(request.nextUrl.searchParams.get("limit") || "300");
    const data = await listSyncedWhatsAppContacts(limit);
    console.log(data)
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error listing synced WhatsApp contacts", error);
    return NextResponse.json({ error: "Erro ao carregar contatos sincronizados" }, { status: 500 });
  }
}
