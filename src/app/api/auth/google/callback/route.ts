// src/app/api/auth/google/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

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
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const BASE_URL =
    process.env.NEXT_PUBLIC_SITE_URL || "https://elyaia.vercel.app";

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") || "";
  const error = url.searchParams.get("error");

  const redirectTo =
    (state && decodeURIComponent(state)) || "/dashboard/filter";

  if (error || !code) {
    console.error("Google OAuth error:", error);
    return NextResponse.redirect(
      `${BASE_URL}/dashboard/login?error=google_oauth_failed`,
    );
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error("Google OAuth env vars missing");
    return NextResponse.redirect(
      `${BASE_URL}/dashboard/login?error=google_env_missing`,
    );
  }

  const redirectUri = `${BASE_URL}/api/auth/google/callback`;

  try {
    // 1) تبديل code بـ access_token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error("Google token error:", tokenRes.status, text);
      return NextResponse.redirect(
        `${BASE_URL}/dashboard/login?error=google_token_failed`,
      );
    }

    const tokenJson = (await tokenRes.json()) as GoogleTokenResponse;

    // 2) جلب معلومات المستخدم من Google
    const userRes = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokenJson.access_token}`,
        },
      },
    );

    if (!userRes.ok) {
      const text = await userRes.text();
      console.error("Google userinfo error:", userRes.status, text);
      return NextResponse.redirect(
        `${BASE_URL}/dashboard/login?error=google_userinfo_failed`,
      );
    }

    const profile = (await userRes.json()) as GoogleUserInfo;

    if (!profile.email || !profile.email_verified) {
      return NextResponse.redirect(
        `${BASE_URL}/dashboard/login?error=google_email_not_verified`,
      );
    }

    const email = profile.email.toLowerCase();
    const googleSub = profile.sub;
    const supabase = getSupabaseServerClient();

    // ================== 3) ربط المستخدم ==================
    // أ) نحاول أولاً عن طريق google_sub (لو سبق ربط)
    const { data: userBySub, error: subErr } = await supabase
      .from("store_users")
      .select("id, store_id, email, name, auth_provider")
      .eq("google_sub", googleSub)
      .maybeSingle();

    let user = userBySub;

    if (subErr) {
      console.error("lookup by google_sub error:", subErr);
    }

    // ب) لو ما لقيناه بالـ sub، نحاول عن طريق الإيميل
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
        // مافيه حساب متجر بهذا الإيميل → رجّعه صفحة الدخول برسالة واضحة
        return NextResponse.redirect(
          `${BASE_URL}/dashboard/login?error=no_store_account`,
        );
      }

      // ج) نربط حساب البريد بـ google_sub لأول مرة
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
      // احتياط، المفروض ما نوصل هنا
      return NextResponse.redirect(
        `${BASE_URL}/dashboard/login?error=store_not_found`,
      );
    }

    // ================== 4) إنشاء جلسة في جدول sessions ==================
    const sessionToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 يوم

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
        `${BASE_URL}/dashboard/login?error=session_failed`,
      );
    }

    // ================== 5) ضبط الكوكيّات ==================
    const res = NextResponse.redirect(`${BASE_URL}${redirectTo}`);

    // كوكي السيشن (نفس اللي يستخدمه نظام المتاجر)
    res.cookies.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    // نفس العلامة اللي تستخدمها في login بالباسورد
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
    const BASE_URL =
      process.env.NEXT_PUBLIC_SITE_URL || "https://elyaia.vercel.app";
    return NextResponse.redirect(
      `${BASE_URL}/dashboard/login?error=google_callback_error`,
    );
  }
}
