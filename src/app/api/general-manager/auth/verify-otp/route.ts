// src/app/api/general-manager/auth/verify-otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const ADMIN_SESSION_COOKIE = "gm_admin_session";
const ADMIN_SESSION_TTL_DAYS = 7; // مدة الجلسة بالأيام

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const body = (await req.json().catch(() => null)) as
      | { email?: string; code?: string }
      | null;

    if (
      !body?.email ||
      typeof body.email !== "string" ||
      !body.code ||
      typeof body.code !== "string"
    ) {
      return NextResponse.json(
        { error: "البريد الإلكتروني والكود مطلوبان." },
        { status: 400 }
      );
    }

    const email = body.email.trim().toLowerCase();
    const code = body.code.trim();

    // 1) جلب المستخدم الإداري
    const { data: adminUser, error: adminUserError } = await supabase
      .from("admin_users")
      .select("*")
      .eq("email", email)
      .limit(1)
      .single();

    if (adminUserError || !adminUser) {
      return NextResponse.json(
        { error: "بيانات الدخول غير صحيحة." },
        { status: 403 }
      );
    }

    // 2) جلب آخر كود OTP (ما نركز كثير على expires حالياً للتجربة)
    const { data: otpRow, error: otpError } = await supabase
      .from("admin_otp_codes")
      .select("*")
      .eq("admin_user_id", adminUser.id)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpRow) {
      console.log("[ADMIN OTP VERIFY] no otp row", { otpError });
      return NextResponse.json(
        { error: "الكود غير صالح أو منتهي الصلاحية." },
        { status: 400 }
      );
    }

    const dbCode = (otpRow.code ?? "").toString().trim();

    console.log("[ADMIN OTP VERIFY] compare codes:", {
      sent: code,
      dbCode,
    });

    if (dbCode !== code) {
      return NextResponse.json(
        { error: "الكود غير صحيح." },
        { status: 400 }
      );
    }

    // 3) تعليم الكود كمستخدم (consumed)
    const { error: consumeError } = await supabase
      .from("admin_otp_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", otpRow.id);

    if (consumeError) {
      console.error("[ADMIN OTP] consume error", consumeError);
    }

    // 4) إنشاء session جديدة في جدول sessions
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ADMIN_SESSION_TTL_DAYS);

    const { error: sessionInsertError } = await supabase.from("sessions").insert({
      user_type: "admin",
      admin_user_id: adminUser.id,
      store_id: null,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
    });

    if (sessionInsertError) {
      console.error("[ADMIN OTP] could not create session", sessionInsertError);
      return NextResponse.json(
        { error: "تعذّر إنشاء جلسة الدخول." },
        { status: 500 }
      );
    }

    // 5) نجهّز الـ Response ونضبط الكوكي عليه
    const res = NextResponse.json({
      success: true,
      redirectTo: "/general-manager",
      admin: {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      },
    });

    res.cookies.set(ADMIN_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return res;
  } catch (err) {
    console.error("[ADMIN OTP VERIFY] unexpected error", err);
    return NextResponse.json(
      { error: "حدث خطأ غير متوقع." },
      { status: 500 }
    );
  }
}
