import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTicketsOperationalDashboard } from "@/server/services/tickets-operational-dashboard";

const QuerySchema = z.object({
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

export async function GET(request: NextRequest) {
  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = QuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  try {
    const result = await getTicketsOperationalDashboard(parsed.data);
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error("Error loading tickets operational dashboard", error);
    return NextResponse.json({ error: "Erro ao carregar dashboard" }, { status: 500 });
  }
}

