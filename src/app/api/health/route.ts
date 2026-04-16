import { prisma } from "@/lib/prisma";
import { getJwtSecret } from "@/lib/constants";
import { createRequestContext, logRouteEvent, timedCheck } from "@/lib/observability";
import { NextResponse } from "next/server";

const bootTime = Date.now();

async function checkDatabase() {
  const result = await timedCheck(() => prisma.$queryRaw`SELECT 1`);

  if (result.ok) {
    return { status: "up" as const, latencyMs: result.latencyMs };
  }

  return { status: "down" as const, latencyMs: result.latencyMs };
}

export async function GET() {
  const context = createRequestContext();
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
    env: {
      missing: missingEnv,
    },
    dependencies: {
      database: {
        ...db,
        checkedAt: new Date(context.startedAt).toISOString(),
      },
    },
  };

  logRouteEvent("[health] check", db.status === "up" ? "info" : "warn", context, {
    status: responseStatus,
    dbStatus: db.status,
    dbLatencyMs: db.latencyMs,
    missingEnvCount: missingEnv.length,
  });

  return NextResponse.json(
    { ...payload, requestId: context.requestId },
    {
      status: statusCode,
      headers: {
        "x-request-id": context.requestId,
      },
    }
  );
}
