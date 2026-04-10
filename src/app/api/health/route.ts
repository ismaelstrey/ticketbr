import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getJwtSecret } from "@/lib/constants";

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
  const requestId = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).toString();
  const startedAt = Date.now();
  const db = await checkDatabase();
  const uptimeSeconds = Math.floor((Date.now() - bootTime) / 1000);

  const responseStatus = db.status === "up" ? "ok" : "degraded";
  const statusCode = db.status === "up" ? 200 : 503;

  const missingEnv: string[] = [];
  if (!getJwtSecret()) missingEnv.push("JWT_SECRET");
  if (!process.env.DATABASE_URL) missingEnv.push("DATABASE_URL");

  const payload = {
    status: responseStatus,
    service: "ticketbr-api",
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    version: process.env.APP_VERSION ?? "unknown",
    requestId,
    env: {
      missing: missingEnv,
    },
    dependencies: {
      database: {
        ...db,
        checkedAt: new Date(startedAt).toISOString(),
      },
    },
  };

  return NextResponse.json(payload, { status: statusCode, headers: { "x-request-id": requestId } });
}
