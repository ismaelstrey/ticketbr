import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { JWT_KEY } from "@/lib/constants";

type SessionPayload = {
  role?: string;
};

const ADMIN_API_PREFIXES = [
  "/api/users",
  "/api/operators",
  "/api/operadores",
  "/api/mesas-trabalho",
  "/api/tipos-ticket",
  "/api/categorias-ticket"
];

const PUBLIC_API_PATHS = [
  "/api/auth/login",
  "/api/health",
  "/api/chat/webhook"
];

const ALLOWED_CORS_ORIGINS = new Set(
  [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://evo.strey.com.br",
    "https://n8n.strey.com.br",
    ...(process.env.CORS_ALLOW_ORIGINS?.split(",") ?? []).map((origin) => origin.trim()).filter(Boolean),
    process.env.CORS_ALLOW_ORIGIN?.trim() ?? ""
  ].filter(Boolean)
);

async function getPayload(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_KEY);
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

function isAdminApi(pathname: string) {
  return ADMIN_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isPublicApi(pathname: string) {
  return PUBLIC_API_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function applyCorsHeaders(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get("origin");
  if (origin && ALLOWED_CORS_ORIGINS.has(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Vary", "Origin");
  }

  response.headers.set("Access-Control-Allow-Methods", "GET,DELETE,PATCH,POST,PUT,OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  return response;
}

function isAdminApi(pathname: string) {
  return ADMIN_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/static") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/") && request.method === "OPTIONS") {
    return applyCorsHeaders(request, new NextResponse(null, { status: 204 }));
  }

  if (pathname === "/login" || isPublicApi(pathname)) {
    if (pathname.startsWith("/api/")) {
      return applyCorsHeaders(request, NextResponse.next());
    }
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;
  const payload = token ? await getPayload(token) : null;
  const isAuthenticated = !!payload;

  if (pathname.startsWith("/api/")) {
    if (!isAuthenticated) {
      return applyCorsHeaders(request, NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    if (isAdminApi(pathname) && payload.role !== "ADMIN") {
      return applyCorsHeaders(request, NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }

    return applyCorsHeaders(request, NextResponse.next());
  }

  if (!isAuthenticated && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthenticated && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
