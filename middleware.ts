import { getToken } from "next-auth/jwt";

import { SESSION_COOKIE_NAME } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// The dedicated Olymp Trade landing page + dashboard live at
// src/app/olymp-site/** and are served from this same deployment via the
// rewrite below, rather than a separate app. Scoped to exactly the two
// paths that have an Olymp-specific version (not a broad catch-all) so it
// can never intercept /_next/*, /api/*, /backend/*, or /socket.io/* — a
// broad `has: host` rewrite in next.config.mjs previously caught static
// asset requests too and silently broke CSS/JS on the subdomain.
const OLYMP_SUBDOMAIN_HOST = process.env.OLYMP_SUBDOMAIN_HOST || "olymp.nojai.io";

/**
 * The name the session cookie used before it was renamed. Two copies of it can
 * exist — one host-only, one scoped to the parent domain — because adding a
 * Domain to an existing cookie creates a second cookie rather than replacing
 * the first. Nothing reads them any more, but they are still sent on every
 * request, so they are expired here to keep the header clean and to make sure
 * they can never shadow anything again.
 */
const LEGACY_COOKIE_NAMES = ["__Secure-next-auth.session-token", "next-auth.session-token"];

function clearLegacyCookies(req: NextRequest, res: NextResponse): NextResponse {
  for (const name of LEGACY_COOKIE_NAMES) {
    if (!req.cookies.has(name)) continue;
    // Expired twice: once host-only and once for the parent domain, since a
    // deletion only matches a cookie of the same scope.
    res.cookies.set({ name, value: "", path: "/", maxAge: 0 });
    res.cookies.set({ name, value: "", path: "/", maxAge: 0, domain: ".nojai.io" });
  }
  return res;
}


export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isDashboard = pathname.startsWith("/dashboard");
  const isAdmin = pathname.startsWith("/admin");

  if (isDashboard || isAdmin) {
    // Must name the same cookie authOptions writes, or this reads the stale
    // pre-subdomain cookie and redirects a perfectly valid session to login.
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: SESSION_COOKIE_NAME,
    });

    // Not logged in — let NextAuth's default redirect handle it
    if (!token) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/auth/login";
      loginUrl.searchParams.set("callbackUrl", pathname);
      return clearLegacyCookies(req, NextResponse.redirect(loginUrl));
    }

    // Admin routes require admin role
    if (isAdmin && token.role !== "admin") {
      return clearLegacyCookies(req, NextResponse.redirect(new URL("/dashboard", req.url)));
    }

    // Dashboard requires verified email
    if (isDashboard && token.emailVerified === false) {
      const checkEmailUrl = req.nextUrl.clone();
      checkEmailUrl.pathname = "/auth/check-email";
      if (token.email) {
        checkEmailUrl.searchParams.set("email", String(token.email));
      }
      return clearLegacyCookies(req, NextResponse.redirect(checkEmailUrl));
    }
  }

  const host = req.headers.get("host") ?? "";
  if (host === OLYMP_SUBDOMAIN_HOST && (pathname === "/" || isDashboard)) {
    const url = req.nextUrl.clone();
    url.pathname = pathname === "/" ? "/olymp-site" : `/olymp-site${pathname}`;
    return clearLegacyCookies(req, NextResponse.rewrite(url));
  }

  return clearLegacyCookies(req, NextResponse.next());
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/admin/:path*"],
};
