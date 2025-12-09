import { NextRequest, NextResponse } from "next/server";

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectToParam =
    req.nextUrl.searchParams.get("redirectTo") ?? "/dashboard/filter";

  // لأننا مرسلين redirectTo بـ encodeURIComponent من الفرونت
  const redirectTo = decodeURIComponent(redirectToParam);

  if (!clientId) {
    console.error("GOOGLE_CLIENT_ID is missing");
    return NextResponse.redirect(
      new URL("/dashboard/login?error=google_env", req.nextUrl),
    );
  }

  const origin = req.nextUrl.origin;
  const redirectUri = new URL(
    "/api/auth/google/callback",
    origin,
  ).toString();

  const url = new URL(GOOGLE_AUTH_ENDPOINT);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  // نخزن المسار كما هو (بدون encode)
  url.searchParams.set("state", redirectTo);

  return NextResponse.redirect(url.toString());
}
