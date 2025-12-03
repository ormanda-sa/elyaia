// src/app/api/general-manager/auth/verify-otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
const ADMIN_SESSION_COOKIE = "gm_admin_session";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const emailRaw = body?.email;
  const codeRaw = body?.code;

  if (!emailRaw || typeof emailRaw !== "string") {
    return NextResponse.json(
      { error: "البريد الإلكتروني مطلوب." },
      { status: 400 },
    );
  }

  if (!codeRaw || typeof codeRaw !== "string" || codeRaw.length !== 6) {
    return NextResponse.json(
      { error: "كود التحقق غير صالح." },
      { status: 400 },
    );
  }

  const email = emailRaw.trim().toLowerCase();
  const code = codeRaw.trim();

  const supabase = getSupabaseServerClient();

  const { data: adminUser, error: adminErr } = await supabase
    .from("admin_users")
    .select("id, email")
    .eq("email", email)
    .maybeSingle();

  if (adminErr || !adminUser) {
    return NextResponse.json(
      { error: "الحساب غير موجود." },
      { status: 400 },
    );
  }

  const nowIso = new Date().toISOString();

  const { data: otpRow, error: otpErr } = await supabase
    .from("admin_otp_codes")
    .select("id, code, expires_at, consumed_at, created_at")
    .eq("admin_user_id", adminUser.id)
    .eq("code", code)
    .is("consumed_at", null)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (otpErr || !otpRow) {
    return NextResponse.json(
      { error: "كود التحقق غير صحيح أو منتهي الصلاحية." },
      { status: 400 },
    );
  }

  await supabase
    .from("admin_otp_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", otpRow.id);

  const sessionToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const { error: sessionErr } = await supabase.from("sessions").insert({
    user_type: "admin",
    admin_user_id: adminUser.id,
    store_id: null,
    session_token: sessionToken,
    expires_at: expiresAt.toISOString(),
  });

  if (sessionErr) {
    console.error("create admin session error:", sessionErr);
    return NextResponse.json(
      { error: "تعذر إنشاء جلسة الدخول." },
      { status: 500 },
    );
  }

  const res = NextResponse.json({ ok: true });

  res.cookies.set(ADMIN_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  return res;
}
