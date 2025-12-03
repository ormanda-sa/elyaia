import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const BASE_URL =
    process.env.NEXT_PUBLIC_SITE_URL || "https://elyaia.vercel.app";

  if (!GOOGLE_CLIENT_ID) {
    console.error("GOOGLE_CLIENT_ID is missing");
    return NextResponse.redirect(new URL("/dashboard/login", BASE_URL));
  }

  const { searchParams } = new URL(req.url);
  const redirectTo = searchParams.get("redirectTo") || "/dashboard/filter";

  const redirectUri = `${BASE_URL}/api/auth/google/callback`;

  // نخزن redirectTo في state (بشكل بسيط)
  const state = encodeURIComponent(redirectTo);

  const googleAuthUrl = new URL(
    "https://accounts.google.com/o/oauth2/v2/auth",
  );
  googleAuthUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("access_type", "offline");
  googleAuthUrl.searchParams.set("prompt", "consent");
  googleAuthUrl.searchParams.set("state", state);

  return NextResponse.redirect(googleAuthUrl.toString());
}
