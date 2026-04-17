import { NextRequest, NextResponse } from "next/server";
import { listSyncedWhatsAppContacts } from "@/server/services/whatsapp-contacts";
import { enforceAdminRouteSecurity, withRateLimitHeaders } from "@/server/services/sensitive-route-guard";

export async function GET(request: NextRequest) {
  try {
    const guard = await enforceAdminRouteSecurity(request, "settings.contacts.read");
    if (!guard.ok) {
      return guard.response;
    }

    const limit = Number(request.nextUrl.searchParams.get("limit") || "300");
    const data = await listSyncedWhatsAppContacts(limit);
    return withRateLimitHeaders(NextResponse.json({ data }), guard.rate);
  } catch (error) {
    console.error("Error listing synced WhatsApp contacts", error);
    return NextResponse.json({ error: "Erro ao carregar contatos sincronizados" }, { status: 500 });
  }
}
