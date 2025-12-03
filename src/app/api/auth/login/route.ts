// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const PASSWORD_SECRET = process.env.PASSWORD_SECRET || "darb-filter-secret";
const COOKIE_NAME = "darb_session";

function generateSessionToken() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function hashPassword(plain: string): string {
  return crypto
    .createHmac("sha256", PASSWORD_SECRET)
    .update(plain)
    .digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    console.log("LOGIN BODY =", body);

    // ندعم أكثر من اسم للحقل لو الواجهة مرسلة identifier بدال email مثلاً
    const rawEmail =
      (body.email as string | undefined) ||
      (body.identifier as string | undefined) ||
      (body.username as string | undefined);

    const rawPassword = body.password as string | undefined;
    const rememberMe = Boolean(body.rememberMe);

    if (!rawEmail || !rawPassword) {
      return NextResponse.json(
        { error: "EMAIL_PASSWORD_REQUIRED" },
        { status: 400 },
      );
    }

    const normalizedEmail = rawEmail.trim().toLowerCase();
    const passwordHash = hashPassword(rawPassword);

    const supabase = getSupabaseServerClient();

    // 1) محاولة كـ admin
    const { data: adminUser, error: adminErr } = await supabase
      .from("admin_users")
      .select("id, email, password_hash, role")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (adminErr) {
      console.error("LOGIN adminErr =", adminErr);
    }

    if (adminUser && adminUser.password_hash === passwordHash) {
      const sessionToken = generateSessionToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error: insertErr } = await supabase.from("sessions").insert({
        user_type: "admin",
        admin_user_id: adminUser.id,
        store_id: null,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
      });

      if (insertErr) {
        console.error("LOGIN insert admin session error =", insertErr);
        return NextResponse.json(
          { error: "SESSION_CREATE_FAILED" },
          { status: 500 },
        );
      }

      const res = NextResponse.json({
        ok: true,
        user_type: "admin",
        role: adminUser.role,
      });

      res.cookies.set(COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });

      return res;
    }

    // 2) محاولة كـ store_user
    const { data: storeUser, error: storeErr } = await supabase
      .from("store_users")
      .select("id, store_id, email, password_hash, role")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (storeErr) {
      console.error("LOGIN storeErr =", storeErr);
    }

    if (!storeUser || !storeUser.password_hash) {
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS" },
        { status: 401 },
      );
    }

    console.log("LOGIN passwordHash incoming =", passwordHash);
    console.log("LOGIN passwordHash in db =", storeUser.password_hash);

    if (storeUser.password_hash !== passwordHash) {
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS" },
        { status: 401 },
      );
    }

    const sessionToken = generateSessionToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (rememberMe ? 30 : 7));

    const { error: insertStoreErr } = await supabase.from("sessions").insert({
      user_type: "store",
      admin_user_id: null,
      store_id: storeUser.store_id,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
    });

    if (insertStoreErr) {
      console.error("LOGIN insert store session error =", insertStoreErr);
      return NextResponse.json(
        { error: "SESSION_CREATE_FAILED" },
        { status: 500 },
      );
    }

    const res = NextResponse.json({
      ok: true,
      user_type: "store",
      role: storeUser.role,
      store_id: storeUser.store_id,
    });

    res.cookies.set(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: (rememberMe ? 30 : 7) * 24 * 60 * 60,
    });

    return res;
  } catch (err) {
    console.error("LOGIN unexpected error =", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
