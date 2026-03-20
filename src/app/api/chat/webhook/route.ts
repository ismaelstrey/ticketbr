import { NextRequest, NextResponse } from "next/server";
import { normalizeInboundPayload } from "@/server/services/chat-inbound-normalizer";
import { processNormalizedInboundEvent } from "@/server/services/chat-inbound-processing";
import { logWebhookRequest } from "@/server/services/webhook-request-logs";

async function processInboundWebhook(payload: unknown) {
  const basePayload = payload && typeof payload === "object" ? payload as Record<string, unknown> : { raw: payload };
  const normalized = normalizeInboundPayload({ ...basePayload, provider: "uazapi" });

  if (normalized.kind === "ignored") {
    return { ok: true, ignored: true, reason: normalized.reason, source: normalized.source };
  }

  return processNormalizedInboundEvent(normalized);
}

export async function POST(request: NextRequest) {
  let payload: unknown = null;
  try {
    payload = await request.json();
    const response = await processInboundWebhook(payload);
    logWebhookRequest({ request, payload, route: "chat.webhook", source: "uazapi", status: 200 });
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error on chat webhook", error);
    logWebhookRequest({ request, payload, route: "chat.webhook", source: "uazapi", status: 400 });
    return NextResponse.json({ error: "Webhook inválido" }, { status: 400 });
  }
}

export { processInboundWebhook };
