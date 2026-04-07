import { NextResponse } from "next/server";
import { requireCustomerContext } from "@/server/services/customer-context";

export async function GET() {
  try {
    const ctx = await requireCustomerContext();
    return NextResponse.json({
      user: ctx.user,
      company: {
        id: ctx.solicitante.id,
        name: ctx.solicitante.nome_fantasia || ctx.solicitante.razao_social,
        email: ctx.solicitante.email
      },
      member: { id: ctx.member.id, isAdmin: ctx.member.isAdmin }
    });
  } catch (error: any) {
    const code = String(error?.message || "");
    const status = code === "FORBIDDEN" ? 403 : 401;
    return NextResponse.json({ error: status === 403 ? "Forbidden" : "Unauthorized" }, { status });
  }
}

