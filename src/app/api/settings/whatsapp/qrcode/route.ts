import { NextRequest, NextResponse } from "next/server";
import { getEvolutionConnectionState, getEvolutionQrCode } from "@/server/services/evolution-service";
import { getUazapiConnectionState, getUazapiQrCode } from "@/server/services/uazapi-service";
import { assertProviderConfigured, resolveWhatsAppProvider } from "@/server/services/chat-provider";
import { normalizeWhatsAppConfig, resolveWhatsAppConfig } from "@/server/services/whatsapp-settings";

export async function POST(request: NextRequest) {
  let bodyConfig = null;
  try {
    const body = await request.json();
    bodyConfig = normalizeWhatsAppConfig(body);
    (request as any).__ticketbrBodyConfig = bodyConfig;
  } catch {
    // optional body
  }

  const config = await resolveWhatsAppConfig(request, bodyConfig);
  const provider = resolveWhatsAppProvider(config, ["uazapi", "evolution"]);

  try {
    if (provider === "uazapi") {
      if (!assertProviderConfigured("uazapi", config)) {
        return NextResponse.json({ error: "UAZAPI não configurada no servidor/sessão." }, { status: 400 });
      }

      const [status, qrData] = await Promise.all([
        getUazapiConnectionState(config).catch(() => null),
        getUazapiQrCode(undefined, config)
      ]);

      return NextResponse.json({
        data: {
          provider,
          status,
          qrCode: qrData.qrCode,
          pairingCode: qrData.pairingCode,
          raw: qrData.raw
        }
      });
    }

    if (!assertProviderConfigured("evolution", config)) {
      return NextResponse.json(
        { error: "Evolution API não configurada no servidor/sessão." },
        { status: 400 }
      );
    }

    const [status, qrData] = await Promise.all([
      getEvolutionConnectionState(config),
      getEvolutionQrCode(config)
    ]);

    return NextResponse.json({
      data: {
        provider: "evolution",
        status,
        qrCode: qrData.qrCode,
        pairingCode: qrData.pairingCode,
        raw: qrData.raw
      }
    });
  } catch (error: any) {
    console.error("Error loading WhatsApp QR code", error);
    return NextResponse.json({ error: error?.message ?? "Erro ao gerar QR Code" }, { status: 500 });
  }
}
