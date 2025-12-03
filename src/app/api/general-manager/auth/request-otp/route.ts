// src/app/api/general-manager/auth/request-otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const OTP_TTL_MINUTES = 10;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const emailRaw = body?.email;

    if (!emailRaw || typeof emailRaw !== "string") {
      return NextResponse.json(
        { ok: false, error: "البريد الإلكتروني مطلوب." },
        { status: 400 },
      );
    }

    const email = emailRaw.trim().toLowerCase();
    const supabase = getSupabaseServerClient();

    // 1) نتأكد أن الإيميل موجود في admin_users
    const { data: adminUser, error: adminErr } = await supabase
      .from("admin_users")
      .select("id, email, name")
      .eq("email", email)
      .maybeSingle();

    if (adminErr || !adminUser) {
      console.error("admin_users lookup error:", adminErr);
      return NextResponse.json(
        { ok: false, error: "هذا البريد غير مسجّل كمدير عام." },
        { status: 400 },
      );
    }

    // 2) نحذف الأكواد القديمة غير المستخدمة
    const { error: delErr } = await supabase
      .from("admin_otp_codes")
      .delete()
      .eq("admin_user_id", adminUser.id)
      .is("consumed_at", null);

    if (delErr) {
      console.error("admin_otp_codes delete error:", delErr);
    }

    // 3) توليد كود 6 أرقام وتخزينه
    const code = String(randomInt(100000, 1000000)); // 100000 → 999999
    const expiresAt = new Date(
      Date.now() + OTP_TTL_MINUTES * 60 * 1000,
    ).toISOString();

    const { error: otpErr } = await supabase.from("admin_otp_codes").insert({
      admin_user_id: adminUser.id,
      code,
      expires_at: expiresAt,
      consumed_at: null,
    });

    if (otpErr) {
      console.error("admin_otp_codes insert error:", otpErr);
      return NextResponse.json(
        { ok: false, error: "تعذر إنشاء كود التحقق." },
        { status: 500 },
      );
    }

    // 4) إرسال الإيميل عبر Resend (نفس نمط forgot-password)
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const RESEND_FROM =
      process.env.RESEND_FROM_EMAIL ||
      "Darb Filters <onboarding@resend.dev>";

    if (!RESEND_API_KEY) {
      console.warn(
        "RESEND_API_KEY is missing – OTP email will not be sent.",
      );
      return NextResponse.json(
        {
          ok: false,
          error:
            "تعذّر إرسال البريد حالياً، تأكد من إعدادات البريد أو جرّب لاحقاً.",
        },
        { status: 500 },
      );
    }

    const subject = "كود التحقق لتسجيل دخول لوحة الإدارة العامة";
    const html = `
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; direction: rtl; text-align: right;">
        <p>مرحباً${adminUser.name ? " " + adminUser.name : ""}،</p>
        <p>كود التحقق الخاص بتسجيل دخول لوحة الإدارة العامة هو:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
        <p>هذا الكود صالح لمدة ${OTP_TTL_MINUTES} دقائق.</p>
      </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [email],
        subject,
        html,
      }),
    });

    const resendJson = await resendRes.json().catch(() => ({}));
    console.log("GM OTP RESEND RESP:", resendRes.status, resendJson);

    if (!resendRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "تعذّر إرسال البريد حالياً، تأكد من إعدادات البريد أو جرّب لاحقاً.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("request-otp error:", err);
    return NextResponse.json(
      { ok: false, error: "حدث خطأ غير متوقع." },
      { status: 500 },
    );
  }
}
