import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as XLSX from "xlsx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getTicketsOperationalDashboard } from "@/server/services/tickets-operational-dashboard";
import { Prisma } from "@/lib/prisma";

const QuerySchema = z.object({
  format: z.enum(["xlsx", "pdf", "json"]).default("xlsx"),
  preset: z.enum(["today", "7d", "30d", "custom"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  agentId: z.string().optional(),
  clientId: z.string().optional(),
  categoryId: z.string().optional(),
  q: z.string().optional()
});

function fileName(format: string) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return `dashboard_tickets_${stamp}.${format}`;
}

function pdfSafe(text: string) {
  return String(text)
    .replaceAll("→", "->")
    .replaceAll("—", "-")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "?");
}

async function buildPdf(dashboard: any) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([595.28, 841.89]);
  const { width } = page.getSize();
  let y = 800;
  const left = 48;
  const line = (text: string, size = 11, isBold = false, color = rgb(0.15, 0.18, 0.22)) => {
    page.drawText(pdfSafe(text), { x: left, y, size, font: isBold ? bold : font, color });
    y -= size + 6;
  };

  line("Dashboard Operacional de Tickets", 16, true);
  line(`Janela: ${dashboard.data.window.from} -> ${dashboard.data.window.to}`, 10);
  line(`Gerado em: ${dashboard.data.generatedAt}`, 10);
  y -= 6;

  line("KPIs", 13, true);
  const k = dashboard.data.kpis;
  line(`Abertos: ${k.openTotal}  |  Estourados: ${k.overdue}`, 11);
  line(
    `TMR (h): ${k.avgResolutionHours ?? "-"}  |  FCR: ${k.firstContactResolutionRate == null ? "-" : `${Math.round(k.firstContactResolutionRate * 100)}%`}`,
    11
  );
  y -= 10;

  line("Tickets críticos (top 20)", 13, true);
  for (const t of dashboard.data.tables.criticalTickets.slice(0, 20)) {
    const subject = String(t.subject || "");
    const safe = subject.length > 90 ? `${subject.slice(0, 90)}…` : subject;
    line(`#${t.number} · ${t.priority} · ${t.status} · ${t.clientName} · ${safe}`, 9);
    if (y < 60) break;
  }

  page.drawText(" ", { x: width - 1, y: 1, size: 1, font });
  return Buffer.from(await doc.save());
}

export async function GET(request: NextRequest) {
  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = QuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const debug = request.nextUrl.searchParams.get("debug") === "1";
  const requestId = crypto.randomUUID();
  const isDev = process.env.NODE_ENV !== "production";

  const { format, ...filters } = parsed.data;

  try {
    const dashboard = await getTicketsOperationalDashboard(filters);
    if (format === "json") {
      return NextResponse.json(dashboard, { headers: { "Cache-Control": "no-store" } });
    }

    if (format === "xlsx") {
      const rows = dashboard.data.tables.criticalTickets.map((t: any) => ({
        number: t.number,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        client: t.clientName,
        assignee: t.assigneeName,
        responseSlaAt: t.responseSlaAt,
        solutionSlaAt: t.solutionSlaAt,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      }));
      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.json_to_sheet([
        {
          windowFrom: dashboard.data.window.from,
          windowTo: dashboard.data.window.to,
          generatedAt: dashboard.data.generatedAt,
          openTotal: dashboard.data.kpis.openTotal,
          overdue: dashboard.data.kpis.overdue,
          avgResolutionHours: dashboard.data.kpis.avgResolutionHours,
          firstContactResolutionRate: dashboard.data.kpis.firstContactResolutionRate
        }
      ]);
      XLSX.utils.book_append_sheet(wb, ws1, "Resumo");
      const ws2 = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws2, "Criticos");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
      const bytes = new Uint8Array(buf);
      return new NextResponse(bytes, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename=\"${fileName("xlsx")}\"`
        }
      });
    }

    const pdf = await buildPdf(dashboard);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"${fileName("pdf")}\"`
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[dashboard/tickets/export] failed", { requestId }, error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2010") {
      return NextResponse.json(
        {
          error: "Erro ao exportar (consulta)",
          requestId,
          ...(isDev && debug ? { details: { code: error.code, meta: error.meta, stack: error.stack } } : {})
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao exportar", requestId, ...(isDev && debug ? { details: message, stack: error instanceof Error ? error.stack : undefined } : {}) },
      { status: 500 }
    );
  }
}
