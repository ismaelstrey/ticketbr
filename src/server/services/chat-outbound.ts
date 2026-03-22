import type { ChatAttachment } from "@/types/chat";
import { getAvailableWhatsAppProviders, resolveWhatsAppProvider } from "@/server/services/chat-provider";
import { sendMessageToN8n } from "@/server/services/n8n-adapter";
import { sendMediaToEvolution, sendTextToEvolution } from "@/server/services/evolution-service";
import { sendMediaToUazapi, sendTextToUazapi } from "@/server/services/uazapi-service";
import type { WhatsAppRuntimeConfig } from "@/server/services/whatsapp-settings";

export interface SendOutboundMessageInput {
  contactId: string;
  text?: string;
  attachment?: ChatAttachment & { type?: string };
  contactPhone?: string;
}

export interface SendOutboundMessageResult {
  provider: "n8n" | "evolution" | "uazapi";
  waMessageId: string;
  targetPhone: string;
}

function normalizePhone(input?: string) {
  return (input ?? "").replace(/\D/g, "");
}

function maskPhone(value?: string) {
  const digits = normalizePhone(value);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 2)}••••${digits.slice(-2)}`;
}

function resolveTargetPhone(contactId: string, contactPhone?: string) {
  if (contactPhone) return normalizePhone(contactPhone);
  if (contactId.includes("@")) return normalizePhone(contactId.split("@")[0]);
  return normalizePhone(contactId);
}

function resolveMediaType(attachment?: ChatAttachment & { type?: string }) {
  if (!attachment) return "text";
  if (attachment.type) return attachment.type;
  const mime = String(attachment.mimeType || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}

function resolveAttachmentPayload(attachment: ChatAttachment & { type?: string }) {
  const media = attachment.data || attachment.url;
  if (!media) {
    throw new Error("attachment.data ou attachment.url é obrigatório para envio de mídia");
  }
  return media;
}

export async function sendOutboundMessage(input: SendOutboundMessageInput, config?: WhatsAppRuntimeConfig | null): Promise<SendOutboundMessageResult> {
  const availableProviders = getAvailableWhatsAppProviders(config);
  if (!availableProviders.n8n && !availableProviders.evolution && !availableProviders.uazapi) {
    throw new Error("WhatsApp não está configurado");
  }

  const provider = resolveWhatsAppProvider(config, ["n8n", "evolution", "uazapi"]);
  if (!provider) {
    throw new Error("Provider WhatsApp inválido");
  }

  const waMessageId = `out_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const targetPhone = resolveTargetPhone(input.contactId, input.contactPhone);

  if (process.env.CHAT_ROUTING_DEBUG === "true") {
    console.log("[chat-routing] outbound", {
      waMessageId,
      provider,
      configProvider: config?.whatsappProvider ?? null,
      providersEnabled: availableProviders,
      contactIdHasAt: String(input.contactId).includes("@"),
      targetPhone: maskPhone(targetPhone)
    });
  }

  if (provider === "n8n") {
    if (!availableProviders.n8n) throw new Error("Provider n8n selecionado, mas não está configurado");
    await sendMessageToN8n({
      number: targetPhone,
      type: input.attachment ? "media" : "text",
      text: input.text,
      media: input.attachment,
      idempotency_key: waMessageId
    }, config);
    return { provider, waMessageId, targetPhone };
  }

  if (provider === "evolution") {
    if (!availableProviders.evolution) throw new Error("Provider Evolution selecionado, mas não está configurado");
    const phone = targetPhone || input.contactId;
    if (input.attachment) {
      await sendMediaToEvolution({
        number: phone,
        caption: input.text,
        media: resolveAttachmentPayload(input.attachment),
        mimeType: input.attachment.mimeType,
        fileName: input.attachment.name || "arquivo"
      }, config);
    } else {
      await sendTextToEvolution(phone, input.text || "", config);
    }
    return { provider, waMessageId, targetPhone: phone };
  }

  if (!availableProviders.uazapi) throw new Error("Provider UAZAPI selecionado, mas não está configurado");
  if (!targetPhone) throw new Error("contactPhone é obrigatório para UAZAPI");
  if (input.attachment) {
    await sendMediaToUazapi({
      number: targetPhone,
      mediatype: resolveMediaType(input.attachment),
      caption: input.text,
      media: resolveAttachmentPayload(input.attachment),
      mimeType: input.attachment.mimeType,
      fileName: input.attachment.name || "arquivo"
    }, config);
  } else {
    await sendTextToUazapi({ number: targetPhone, text: input.text || "" }, config);
  }

  return { provider, waMessageId, targetPhone };
}
