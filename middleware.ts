import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  const isDashboard = pathname.startsWith("/dashboard");
  const isAdmin = pathname.startsWith("/admin");

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
