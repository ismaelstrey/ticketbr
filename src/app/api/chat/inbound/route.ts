import { NextRequest, NextResponse } from "next/server";
import { createRequestContext, jsonWithRequestId, logRouteEvent } from "@/lib/observability";
import { normalizeInboundPayload } from "@/server/services/chat-inbound-normalizer";
import { processNormalizedInboundEvent } from "@/server/services/chat-inbound-processing";
import { recordCriticalFlowEvent } from "@/server/services/critical-flow-observability";
import { logWebhookRequest } from "@/server/services/webhook-request-logs";

export async function POST(req: NextRequest) {
  const context = createRequestContext();
  let body: unknown = null;
  try {
    body = await req.json();
    const normalized = normalizeInboundPayload(body);
    const latencyMs = Date.now() - context.startedAt;

    if (normalized.kind === "ignored") {
      logWebhookRequest({ request: req, payload: body, route: "chat.inbound", source: normalized.source, status: 400 });
      await recordCriticalFlowEvent({
        stage: "chat_inbound",
        outcome: "failure",
        action: "ignored",
        latencyMs,
        statusCode: 400,
        metadata: { source: normalized.source, reason: normalized.reason }
      });
      logRouteEvent("[chat.inbound] ignored", "warn", context, {
        source: normalized.source,
        reason: normalized.reason
      });
      return jsonWithRequestId({ error: normalized.reason }, context, { status: 400 });
    }

    const response = await processNormalizedInboundEvent(normalized);
    logWebhookRequest({ request: req, payload: body, route: "chat.inbound", source: normalized.source, status: 200 });
    await recordCriticalFlowEvent({
      stage: "chat_inbound",
      outcome: "success",
      action: normalized.kind,
      latencyMs,
      statusCode: 200,
      metadata: { source: normalized.source }
    });
    logRouteEvent("[chat.inbound] processed", "info", context, {
      source: normalized.source,
      kind: normalized.kind
    });
    return jsonWithRequestId(response, context, { status: 200 });
  } catch (error: any) {
    const latencyMs = Date.now() - context.startedAt;
    console.error("Error processing inbound message:", error);
    logWebhookRequest({ request: req, payload: body, route: "chat.inbound", source: "webhook", status: 500 });
    await recordCriticalFlowEvent({
      stage: "chat_inbound",
      outcome: "failure",
      action: "exception",
      latencyMs,
      statusCode: 500,
      metadata: { source: "webhook", error: error?.message }
    });
    logRouteEvent("[chat.inbound] failed", "error", context, { error: error?.message });
    return jsonWithRequestId({ error: "Internal Server Error", details: error.message }, context, { status: 500 });
  }
}
