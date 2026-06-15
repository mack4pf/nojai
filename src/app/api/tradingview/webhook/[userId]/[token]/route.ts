import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    userId: string;
    token: string;
  }>;
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

function resolveBackendOrigin() {
  const raw =
    process.env.BACKEND_URL
    ?? process.env.NEXT_PUBLIC_BACKEND_URL
    ?? process.env.BACKEND_API_URL
    ?? process.env.API_URL
    ?? process.env.NEXT_PUBLIC_API_URL
    ?? "http://localhost:5000";

  const trimmed = trimTrailingSlash(raw);
  return trimmed.endsWith("/api") ? trimmed.slice(0, -4) : trimmed;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { userId, token } = await context.params;
  const body = await req.text();
  const contentType = req.headers.get("content-type") ?? "application/json";

  const backendResponse = await fetch(
    `${resolveBackendOrigin()}/api/tradingview/webhook/${encodeURIComponent(userId)}/${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: {
        "content-type": contentType,
      },
      body,
      cache: "no-store",
    },
  );

  const responseBody = await backendResponse.text();

  return new NextResponse(responseBody, {
    status: backendResponse.status,
    headers: {
      "content-type": backendResponse.headers.get("content-type") ?? "application/json",
    },
  });
}

export function GET() {
  return NextResponse.json({ message: "TradingView webhook is ready. Send signals with POST." }, { status: 405 });
}
