import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { type RateLimitResult, sensitiveRouteRateLimiter } from "@/lib/rateLimit";

type GuardFailure = {
  ok: false;
  response: NextResponse;
};

export type GuardSuccess = {
  ok: true;
  session: any;
  rate: RateLimitResult;
  actorUserId: string | null;
};

type GuardResult = GuardFailure | GuardSuccess;

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

function getActorUserId(session: any): string | null {
  const raw = String(session?.id ?? session?.sub ?? "").trim();
  return raw || null;
}

function buildRateLimitHeaders(rate: RateLimitResult, includeRetryAfter = false) {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(rate.limit),
    "X-RateLimit-Remaining": String(rate.remaining),
    "X-RateLimit-Reset": String(Math.floor(rate.resetAt / 1000))
  };

  if (includeRetryAfter) {
    headers["Retry-After"] = String(rate.retryAfterSeconds);
  }

  return headers;
}

export function withRateLimitHeaders(response: NextResponse, rate: RateLimitResult, includeRetryAfter = false) {
  const headers = buildRateLimitHeaders(rate, includeRetryAfter);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

export async function enforceAdminRouteSecurity(request: Request, scope: string): Promise<GuardResult> {
  const session = await getSession();
  const actorUserId = getActorUserId(session);
  const clientIp = getClientIp(request);
  const key = `${scope}:${actorUserId ?? clientIp}`;
  const rate = await sensitiveRouteRateLimiter.consume(key);

  if (!rate.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: buildRateLimitHeaders(rate, true) }
      )
    };
  }

  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: buildRateLimitHeaders(rate) }
      )
    };
  }

  if (String((session as any).role ?? "") !== "ADMIN") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden" },
        { status: 403, headers: buildRateLimitHeaders(rate) }
      )
    };
  }

  return {
    ok: true,
    session,
    rate,
    actorUserId
  };
}
