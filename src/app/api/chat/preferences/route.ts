import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getChatInteractionPreferences, saveChatInteractionPreferences } from "@/server/services/chat-preferences";

export async function GET() {
  const session = await getSession();
  const userId = String(session?.sub || session?.id || "").trim();

  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const data = await getChatInteractionPreferences(userId);
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  const userId = String(session?.sub || session?.id || "").trim();

  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const data = await saveChatInteractionPreferences(userId, body);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error saving chat interaction preferences", error);
    return NextResponse.json({ error: "Erro ao salvar preferências" }, { status: 500 });
  }
}
