// src/app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
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

    // نبحث عن المستخدم في store_users
    const { data: user, error: userError } = await supabase
      .from("store_users")
      .select("id, email, name")
      .eq("email", emailRaw)
      .maybeSingle();

    console.log("FORGOT PASSWORD user =", user, "error =", userError);

    // لو ما فيه مستخدم: نرجّع نفس الرد، بدون إرسال إيميل، وبدون 404
    if (!user) {
      return NextResponse.json({
        ok: true,
        message:
          "لو كان البريد مسجلاً لدينا، ستصلك رسالة تحتوي على رابط لإعادة تعيين كلمة المرور.",
      });
    }

    // نولّد توكن عشوائي
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // بعد ساعة

    // نحذف أي توكنات قديمة لهذا المستخدم (اختياري)
    const { error: deleteError } = await supabase
      .from("store_password_resets")
      .delete()
      .eq("store_user_id", user.id);

    if (deleteError) {
      console.error("store_password_resets deleteError:", deleteError);
    }

    // نحفظ التوكن
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

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "https://elyaia.vercel.app";

    const resetUrl = `${baseUrl}/dashboard/reset-password?token=${encodeURIComponent(
      token,
    )}`;

    // إعدادات Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    const from =
      process.env.RESEND_FROM_EMAIL ||
      "Darb Filters <onboarding@resend.dev>";

    // لو مافي RESEND_API_KEY ما نطيح 500، بس نطبع ونرجّع ok
    if (!resendApiKey) {
      console.warn(
        "RESEND_API_KEY is missing, skipping email send. resetUrl =",
        resetUrl,
      );
      return NextResponse.json({
        ok: false,
        error:
          "تعذّر إرسال البريد حالياً، تأكد من إعدادات البريد أو جرّب لاحقاً.",
      });
    }

    const resend = new Resend(resendApiKey);

    const { data: emailData, error: emailError } = await resend.emails.send({
      from,
      to: emailRaw,
      subject: "إعادة تعيين كلمة المرور - Darb Filters",
      html: `
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
      `,
    });

    console.log("RESEND EMAIL DATA:", emailData);
    console.error("RESEND EMAIL ERROR:", emailError);

    if (emailError) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "تعذّر إرسال البريد حالياً، تأكد من إعدادات البريد أو جرّب لاحقاً.",
        },
        { status: 500 },
      );
    }

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
