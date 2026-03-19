import type { WhatsAppRuntimeConfig } from "@/server/services/whatsapp-settings";
import { isUazapiConfigured, requestUazapi, uazapiSendMedia, uazapiSendText } from "@/server/services/uazapi-adapter";

function onlyDigits(value?: string) {
  return (value ?? "").replace(/\D/g, "");
}

export function uazapiIsConfigured(config?: WhatsAppRuntimeConfig | null) {
  return isUazapiConfigured(config);
}

export async function sendTextToUazapi(input: { number: string; text: string }, config?: WhatsAppRuntimeConfig | null) {
  const number = onlyDigits(input.number);
  if (!number) throw new Error("Número de telefone inválido para UAZAPI.");
  return uazapiSendText({ number, text: input.text }, config);
}

export async function sendMediaToUazapi(input: { number: string; mediatype: string; caption?: string; media: string; mimeType?: string; fileName?: string }, config?: WhatsAppRuntimeConfig | null) {
  const number = onlyDigits(input.number);
  if (!number) throw new Error("Número de telefone inválido para UAZAPI.");
  return uazapiSendMedia(
    {
      number,
      mediatype: input.mediatype,
      media: input.media,
      caption: input.caption,
      mimetype: input.mimeType,
      fileName: input.fileName
    },
    config
  );
}


export async function getUazapiConnectionState(config?: WhatsAppRuntimeConfig | null) {
  return requestUazapi({ pathOrUrl: "/instance/status", method: "GET" }, config);
}

export async function getUazapiQrCode(input?: { phone?: string }, config?: WhatsAppRuntimeConfig | null) {
  const body = input?.phone ? { phone: onlyDigits(input.phone) } : {};
  const payload = await requestUazapi({ pathOrUrl: "/instance/connect", method: "POST", body }, config);
  const instance = (payload as any)?.instance || {};
  return {
    qrCode: typeof instance.qrcode === "string" ? instance.qrcode : null,
    pairingCode: typeof instance.paircode === "string" ? instance.paircode : null,
    raw: payload
  };
}
