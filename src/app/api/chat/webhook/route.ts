import { NextRequest, NextResponse } from "next/server";
import { appendMessage } from "@/server/services/chat-memory";

function asRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" ? (input as Record<string, unknown>) : {};
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const root = asRecord(payload);
    const data = asRecord(root.data);
    const key = asRecord(data.key);
    const message = asRecord(data.message);

    const remoteJid = String(key.remoteJid ?? "");
    const contactId = remoteJid.split("@")[0] ?? "unknown";

    const text =
      String(message.conversation ?? "") ||
      String(asRecord(message.extendedTextMessage).text ?? "") ||
      "Mensagem recebida";

    appendMessage({
      id: crypto.randomUUID(),
      contactId,
      channel: "whatsapp",
      direction: "in",
      text,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error on chat webhook", error);
    return NextResponse.json({ error: "Webhook inválido" }, { status: 400 });
  }
}
