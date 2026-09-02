import { getToken } from "next-auth/jwt";
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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isDashboard = pathname.startsWith("/dashboard");
  const isAdmin = pathname.startsWith("/admin");

  if (isDashboard || isAdmin) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    // Not logged in — let NextAuth's default redirect handle it
    if (!token) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/auth/login";
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Admin routes require admin role
    if (isAdmin && token.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Dashboard requires verified email
    if (isDashboard && token.emailVerified === false) {
      const checkEmailUrl = req.nextUrl.clone();
      checkEmailUrl.pathname = "/auth/check-email";
      if (token.email) {
        checkEmailUrl.searchParams.set("email", String(token.email));
      }
      return NextResponse.redirect(checkEmailUrl);
    }
  }

  const host = req.headers.get("host") ?? "";
  if (host === OLYMP_SUBDOMAIN_HOST && (pathname === "/" || isDashboard)) {
    const url = req.nextUrl.clone();
    url.pathname = pathname === "/" ? "/olymp-site" : `/olymp-site${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/admin/:path*"],
};
