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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/static") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  if (pathname === "/login" || pathname === "/api/auth/login" || pathname === "/api/health") {
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;
  const payload = token ? await getPayload(token) : null;
  const isAuthenticated = !!payload;

  if (pathname.startsWith("/api/")) {
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isAdminApi(pathname) && payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.next();
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
