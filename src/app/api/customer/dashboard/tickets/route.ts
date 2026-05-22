import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCustomerContext } from "@/server/services/customer-context";
import { getCustomerTicketsDashboard } from "@/server/services/customer-dashboard";

const QuerySchema = z.object({
  preset: z.enum(["today", "7d", "30d", "custom"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  categoryId: z.string().optional(),
  q: z.string().optional()
});

export async function GET(request: NextRequest) {
  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = QuerySchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json({ error: "Parametros invalidos" }, { status: 400 });
  }

  try {
    const ctx = await requireCustomerContext();
    const data = await getCustomerTicketsDashboard(ctx.solicitante.id, parsed.data);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=15"
      }
    });
  } catch (error: any) {
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : code === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json(
      { error: status === 500 ? "Erro ao carregar dashboard" : status === 403 ? "Forbidden" : "Unauthorized" },
      { status }
    );
  }
}
