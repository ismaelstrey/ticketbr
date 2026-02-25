import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const bootTime = Date.now();

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "up" as const, latencyMs: null as number | null };
  } catch {
    return { status: "down" as const, latencyMs: null as number | null };
  }
}

export async function GET() {
  const startedAt = Date.now();
  const db = await checkDatabase();
  const uptimeSeconds = Math.floor((Date.now() - bootTime) / 1000);

  const responseStatus = db.status === "up" ? "ok" : "degraded";
  const statusCode = db.status === "up" ? 200 : 503;

  const payload = {
    status: responseStatus,
    service: "ticketbr-api",
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    version: process.env.APP_VERSION ?? "unknown",
    dependencies: {
      database: {
        ...db,
        checkedAt: new Date(startedAt).toISOString(),
      },
    },
  };

  return NextResponse.json(payload, { status: statusCode });
}
