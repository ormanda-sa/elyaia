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
        { error: "البريد الإلكتروني مطلوب." },
        { status: 400 },
      );
    }

    const email = emailRaw.trim().toLowerCase();
    const supabase = getSupabaseServerClient();

    // نتأكد أن الإيميل موجود في admin_users
    const { data: adminUser, error: adminErr } = await supabase
      .from("admin_users")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (adminErr || !adminUser) {
      return NextResponse.json(
        { error: "هذا البريد غير مسجّل كمدير عام." },
        { status: 400 },
      );
    }

    // نقدر نحذف الأكواد القديمة غير المستخدمة لهذا المستخدم (اختياري)
    await supabase
      .from("admin_otp_codes")
      .delete()
      .eq("admin_user_id", adminUser.id)
      .is("consumed_at", null);

    // كود 6 أرقام
    const code = String(randomInt(100000, 1000000)); // 100000 → 999999

    const expiresAt = new Date(
      Date.now() + OTP_TTL_MINUTES * 60 * 1000,
    ).toISOString();

    // نحفظه مباشر في admin_otp_codes (بدون هاش لأن عندك العمود code جاهز)
    const { error: otpErr } = await supabase.from("admin_otp_codes").insert({
      admin_user_id: adminUser.id,
      code,
      expires_at: expiresAt,
      consumed_at: null,
    });

    if (otpErr) {
      console.error("admin_otp_codes insert error:", otpErr);
      return NextResponse.json(
        { error: "تعذر إنشاء كود التحقق." },
        { status: 500 },
      );
    }

    // نرسل الإيميل عبر Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const RESEND_FROM = process.env.RESEND_FROM_EMAIL || "noreply@example.com";

    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set – OTP email will not be sent.");
    } else {
      const subject = "كود التحقق لتسجيل دخول لوحة الإدارة العامة";
      const html = `
        <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; direction: rtl; text-align: right;">
          <p>مرحباً،</p>
          <p>كود التحقق الخاص بتسجيل دخول لوحة الإدارة العامة هو:</p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
          <p>هذا الكود صالح لمدة ${OTP_TTL_MINUTES} دقائق.</p>
        </div>
      `;

      await fetch("https://api.resend.com/emails", {
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
      }).catch((err) => {
        console.error("Resend error:", err);
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("request-otp error:", err);
    return NextResponse.json(
      { error: "حدث خطأ غير متوقع." },
      { status: 500 },
    );
  }
}
