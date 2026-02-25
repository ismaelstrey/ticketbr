import { NextRequest, NextResponse } from "next/server";
import { evolutionIsConfigured, getEvolutionConnectionState, getEvolutionQrCode } from "@/server/services/evolution-service";
import { getWhatsAppConfigFromRequest, normalizeWhatsAppConfig } from "@/server/services/whatsapp-settings";

export async function POST(request: NextRequest) {
  let bodyConfig = null;
  try {
    const body = await request.json();
    bodyConfig = normalizeWhatsAppConfig(body);
    (request as any).__ticketbrBodyConfig = bodyConfig;
  } catch {
    // optional body
  }

  const config = bodyConfig ?? getWhatsAppConfigFromRequest(request);

  if (!evolutionIsConfigured(config)) {
    return NextResponse.json(
      { error: "Evolution API não configurada no servidor/sessão." },
      { status: 400 }
    );
  }

  try {
    const [status, qrData] = await Promise.all([
      getEvolutionConnectionState(config),
      getEvolutionQrCode(config)
    ]);

    return NextResponse.json({
      data: {
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
