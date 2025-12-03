import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT =
  "https://openidconnect.googleapis.com/v1/userinfo";

const SESSION_COOKIE = "darb_session";

type GoogleTokenResponse = {
  access_token: string;
  id_token?: string;
  expires_in: number;
  token_type: string;
  refresh_token?: string;
};

type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
};

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "/dashboard/filter";
  const error = url.searchParams.get("error");

  if (error || !code) {
    console.error("Google auth error:", error);
    return NextResponse.redirect(
      new URL("/dashboard/login?error=google_auth_error", url),
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("Google env vars missing");
    return NextResponse.redirect(
      new URL("/dashboard/login?error=google_env", url),
    );
  }

  const origin = `${url.protocol}//${url.host}`;
  const redirectUri = `${origin}/api/auth/google/callback`;

  try {
    // 1) تبديل code إلى access_token
    const tokenRes = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error("Google token error:", tokenRes.status, body);
      return NextResponse.redirect(
        new URL("/dashboard/login?error=google_token_failed", url),
      );
    }

    const tokenJson = (await tokenRes.json()) as GoogleTokenResponse;

    // 2) جلب بيانات المستخدم من Google
    const userRes = await fetch(GOOGLE_USERINFO_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
      },
    });

    if (!userRes.ok) {
      const body = await userRes.text();
      console.error("Google userinfo error:", userRes.status, body);
      return NextResponse.redirect(
        new URL("/dashboard/login?error=google_userinfo_failed", url),
      );
    }

    const profile = (await userRes.json()) as GoogleUserInfo;

    console.log("Google user:", profile);

    if (!profile.email || !profile.email_verified) {
      return NextResponse.redirect(
        new URL("/dashboard/login?error=google_email_not_verified", url),
      );
    }

    const email = profile.email.toLowerCase();
    const googleSub = profile.sub;

    const supabase = getSupabaseServerClient();

    // 3) ربط المستخدم مع store_users (google_sub أو email)
    const { data: userBySub, error: subErr } = await supabase
      .from("store_users")
      .select("id, store_id, email, name, auth_provider")
      .eq("google_sub", googleSub)
      .maybeSingle();

    let user = userBySub;

    if (subErr) {
      console.error("lookup by google_sub error:", subErr);
    }

    if (!user) {
      const { data: userByEmail, error: emailErr } = await supabase
        .from("store_users")
        .select("id, store_id, email, name, auth_provider")
        .eq("email", email)
        .maybeSingle();

      if (emailErr) {
        console.error("lookup by email error:", emailErr);
      }

      if (!userByEmail) {
        // مافيه حساب متجر بهذا الإيميل → ودّه على صفحة التسجيل للمتجر
        const onboardingUrl = new URL(
          `/merchant/onboarding?email=${encodeURIComponent(email)}`,
          origin,
        );
        return NextResponse.redirect(onboardingUrl);
      }

      const newAuthProvider =
        userByEmail.auth_provider === "password"
          ? "both"
          : userByEmail.auth_provider === "google"
          ? "google"
          : "both";

      const { error: linkErr } = await supabase
        .from("store_users")
        .update({
          google_sub: googleSub,
          auth_provider: newAuthProvider,
        })
        .eq("id", userByEmail.id);

      if (linkErr) {
        console.error("link google_sub error:", linkErr);
      }

      user = userByEmail;
    }

    if (!user) {
      return NextResponse.redirect(
        new URL("/dashboard/login?error=store_not_found", url),
      );
    }

    // 4) إنشاء جلسة في جدول sessions
    const sessionToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const { error: sessionErr } = await supabase.from("sessions").insert({
      user_type: "store",
      admin_user_id: null,
      store_id: user.store_id,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
    });

    if (sessionErr) {
      console.error("create session error:", sessionErr);
      return NextResponse.redirect(
        new URL("/dashboard/login?error=session_failed", url),
      );
    }

    // 5) الكوكيز + إعادة التوجيه للـ state (/dashboard/filter مثلاً)
    const redirectTarget = new URL(state, origin);
    const res = NextResponse.redirect(redirectTarget);

    res.cookies.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    res.cookies.set("logged_in", "1", {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return res;
  } catch (e) {
    console.error("Google callback exception:", e);
    return NextResponse.redirect(
      new URL("/dashboard/login?error=google_token_failed", url),
    );
  }
}
