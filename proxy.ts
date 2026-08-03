import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { isDevBypassActive } from "@/lib/auth/devBypass";
import { isGuestModeActive } from "@/lib/auth/guestMode";

/**
 * Edge-level route guard. Runs in front of every page and API route. Layers,
 * in order:
 *   1. Optional site-wide HTTP Basic Auth (SITE_PASSWORD) — keeps a beta
 *      deployment off the public internet entirely, regardless of anything
 *      below.
 *   2. Dev bypass (NEXT_PUBLIC_DEV_BYPASS_AUTH) — skips everything else.
 *      Blocked in a production build unless ALLOW_PRODUCTION_DEV_BYPASS is
 *      also set, so it can't be left on by accident in a real deployment.
 *   3. A signed session cookie check for protected routes. This exists
 *      because Firebase auth state lives client-side (in AuthProvider) —
 *      middleware can't read that, so real protection for pages and /api/*
 *      needs a server-verifiable cookie/token instead.
 *
 * Named proxy.ts (not middleware.ts) per the Next.js 16 convention this
 * project uses.
 */
const SITE_USERNAME = process.env.SITE_PASSWORD_USERNAME || "purpose-pen";
const SITE_PASSWORD = process.env.SITE_PASSWORD;

const devBypassActive = isDevBypassActive();
const guestModeActive = isGuestModeActive();

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/reset-password",
  "/terms",
  "/privacy",
  "/setup",
]);

// Routes that perform the login/logout exchange itself can't require a
// session cookie — they're how the cookie gets issued/cleared in the first place.
const OPEN_API_PATHS = new Set(["/api/auth/access", "/api/auth/logout"]);

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/application-management",
  "/essay-studio",
  "/letter-builder",
  "/reapplicant-archive",
  "/admin",
  "/api",
];

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-Robots-Tag": "noindex, nofollow",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://firestore.googleapis.com wss://*.firebaseio.com",
    "frame-ancestors 'none'",
  ].join("; "),
};

function withSecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

function unauthorized() {
  return withSecurityHeaders(
    new NextResponse("Authentication required.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Purpose Pen", charset="UTF-8"' },
    })
  );
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (SITE_PASSWORD) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Basic ")) {
      return unauthorized();
    }

    let user = "";
    let pass = "";
    try {
      const decoded = atob(authHeader.slice("Basic ".length));
      const separatorIndex = decoded.indexOf(":");
      user = decoded.slice(0, separatorIndex);
      pass = decoded.slice(separatorIndex + 1);
    } catch {
      return unauthorized();
    }

    if (user !== SITE_USERNAME || pass !== SITE_PASSWORD) {
      return unauthorized();
    }
  }

  if (devBypassActive) {
    return withSecurityHeaders(NextResponse.next());
  }

  // Guest mode: allow all routes except /admin, which stays blocked.
  if (guestModeActive) {
    if (pathname.startsWith("/admin")) {
      if (pathname.startsWith("/api/")) {
        return withSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
      }
      return withSecurityHeaders(NextResponse.redirect(new URL("/", request.url)));
    }
    return withSecurityHeaders(NextResponse.next());
  }

  if (PUBLIC_PATHS.has(pathname) || OPEN_API_PATHS.has(pathname) || !isProtectedPath(pathname)) {
    return withSecurityHeaders(NextResponse.next());
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionCookie ? await verifySessionToken(sessionCookie) : null;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return withSecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return withSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  if (pathname.startsWith("/admin") && session.role !== "owner") {
    if (pathname.startsWith("/api/")) {
      return withSecurityHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    }
    return withSecurityHeaders(NextResponse.redirect(new URL("/", request.url)));
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico|robots.txt).*)",
};
