import { NextResponse } from "next/server";

interface WebVitalsPayload {
  id?: string;
  name?: string;
  value?: number;
  rating?: "good" | "needs-improvement" | "poor";
  navigationType?: string;
  path?: string;
  ts?: number;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as WebVitalsPayload;
    console.info("[WebVitals]", {
      id: payload.id,
      name: payload.name,
      value: payload.value,
      rating: payload.rating,
      navigationType: payload.navigationType,
      path: payload.path,
      ts: payload.ts,
    });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }
}
