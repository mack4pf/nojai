import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    forwarded ||
    ""
  );
}

function normalizeCountry(value: string | null) {
  const country = value?.trim().toUpperCase();
  return country && country.length === 2 ? country : "";
}

export async function GET(request: NextRequest) {
  const headerCountry =
    normalizeCountry(request.headers.get("x-vercel-ip-country")) ||
    normalizeCountry(request.headers.get("cf-ipcountry"));

  let countryCode = headerCountry;
  const ip = getClientIp(request);

  if (!countryCode && ip && !["127.0.0.1", "::1", "localhost"].includes(ip)) {
    try {
      const response = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,countryCode`, {
        next: { revalidate: 60 * 60 * 6 },
      });
      const payload = await response.json();
      if (payload?.status === "success") {
        countryCode = normalizeCountry(payload.countryCode);
      }
    } catch {
      countryCode = "";
    }
  }

  const isNigeria = countryCode === "NG";

  return NextResponse.json({
    countryCode: countryCode || null,
    currency: isNigeria ? "NGN" : "USD",
    rewardRange: isNigeria ? "₦9k to ₦20k" : "$6 to $14",
  });
}
