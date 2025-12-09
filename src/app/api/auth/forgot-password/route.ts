// src/app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const emailRaw = (body.email || "").toString().trim().toLowerCase();

    if (!emailRaw) {
      return NextResponse.json(
        { ok: false, error: "البريد الإلكتروني مطلوب" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();

    // 1) نجيب المستخدم من store_users
    const { data: user, error: userError } = await supabase
      .from("store_users")
      .select("id, email, name")
      .eq("email", emailRaw)
      .maybeSingle();

    console.log("FORGOT PASSWORD user =", user, "error =", userError);

    // لو ما فيه مستخدم: نرجّع OK بدون ما نفصح عن وجود الحساب
    if (!user) {
      return NextResponse.json({
        ok: true,
        message:
          "لو كان البريد مسجلاً لدينا، ستصلك رسالة تحتوي على رابط لإعادة تعيين كلمة المرور.",
      });
    }

    // 2) توليد توكن وحفظه في store_password_resets
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // ساعة

    // نحذف أي طلبات قديمة لهذا المستخدم (اختياري)
    const { error: deleteError } = await supabase
      .from("store_password_resets")
      .delete()
      .eq("store_user_id", user.id);

    if (deleteError) {
      console.error("store_password_resets deleteError:", deleteError);
    }

    const { error: insertError } = await supabase
      .from("store_password_resets")
      .insert({
        store_user_id: user.id,
        email: emailRaw,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("store_password_resets insertError:", insertError);
      return NextResponse.json(
        {
          ok: false,
          error: "تعذّر إنشاء طلب الاستعادة، حاول لاحقاً.",
        },
        { status: 500 },
      );
    }

    // 3) نبني رابط إعادة التعيين
    const baseUrlEnv = process.env.NEXT_PUBLIC_BASE_URL;
    const origin = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    const baseUrl = baseUrlEnv || origin;

    const resetUrl = `${baseUrl}/dashboard/reset-password?token=${encodeURIComponent(
      token,
    )}`;

    // 4) إرسال الإيميل عبر Resend باستخدام fetch (نفس نمط الدعوات اللي شغال عندك)
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const RESEND_FROM_EMAIL =
      process.env.RESEND_FROM_EMAIL ||
      "Darb Filters <onboarding@resend.dev>";

    if (!RESEND_API_KEY) {
      console.warn(
        "RESEND_API_KEY is missing, skipping email send. resetUrl =",
        resetUrl,
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

    const subject = "إعادة تعيين كلمة المرور - Darb Filters";
    const html = `
      <div style="direction: rtl; text-align: right; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <h2>إعادة تعيين كلمة المرور</h2>
        <p>مرحباً${user.name ? " " + user.name : ""}،</p>
        <p>وصلك هذا البريد لأنك طلبت إعادة تعيين كلمة المرور لحسابك في <strong>Darb Filters</strong>.</p>
        <p>لإعادة تعيين كلمة المرور، اضغط على الزر التالي:</p>
        <p>
          <a href="${resetUrl}" 
             style="display:inline-block;padding:10px 18px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;">
            إعادة تعيين كلمة المرور
          </a>
        </p>
        <p>أو يمكنك نسخ الرابط التالي ولصقه في المتصفح:</p>
        <p style="direction:ltr; text-align:left; font-size: 13px; color:#555;">${resetUrl}</p>
        <p style="font-size: 12px; color:#888;">
          هذا الرابط صالح لمدة ساعة واحدة فقط. إذا لم تكن أنت من طلب ذلك، فتجاهل هذه الرسالة.
        </p>
      </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [emailRaw],
        subject,
        html,
      }),
    });

    const resendJson = await resendRes.json().catch(() => ({}));
    console.log("FORGOT PASSWORD RESEND RESP:", resendRes.status, resendJson);

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

    // 5) رد موحد للمستخدم (سواء الإيميل موجود أو لا)
    return NextResponse.json({
      ok: true,
      message:
        "لو كان البريد مسجلاً لدينا، ستصلك رسالة تحتوي على رابط لإعادة تعيين كلمة المرور.",
    });
  } catch (err) {
    console.error("forgot-password unexpected error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "حدث خطأ غير متوقع، حاول لاحقاً.",
      },
      { status: 500 },
    );
  }
}
