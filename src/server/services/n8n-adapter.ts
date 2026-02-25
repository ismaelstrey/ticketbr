import { WhatsAppRuntimeConfig } from "@/server/services/whatsapp-settings";

export interface ChatEventPayload {
  type: string;
  source: "ticketbr-chat";
  occurredAt: string;
  data: Record<string, unknown>;
}

function resolveWebhook(config?: WhatsAppRuntimeConfig | null) {
  return config?.n8nWebhookUrl || process.env.N8N_CHAT_WEBHOOK_URL || "";
}

export async function emitChatEventToN8n(event: ChatEventPayload, config?: WhatsAppRuntimeConfig | null) {
  const webhook = resolveWebhook(config);
  if (!webhook) return;

  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event)
    });
  } catch (error) {
    console.warn("Failed to dispatch chat event to n8n", error);
  }
}
