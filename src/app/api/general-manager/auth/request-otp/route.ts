// src/app/api/general-manager/auth/request-otp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

function generateSixDigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// TODO: اربطها بمزود الإيميل الخاص فيك (Resend, SMTP, الخ)
async function sendAdminOtpEmail(params: {
  email: string;
  code: string;
}) {
  const { email, code } = params;

  // هنا حاليًا بس console.log عشان التطوير
  console.log("[ADMIN OTP] إرسال كود إلى:", email, "code:", code);

  // مثال مستقبلي:
  // await resend.emails.send({ to: email, subject: "...", text: `كودك: ${code}` });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const body = await req.json().catch(() => null) as { email?: string } | null;

    if (!body?.email || typeof body.email !== "string") {
      return NextResponse.json(
        { error: "البريد الإلكتروني مطلوب." },
        { status: 400 }
      );
    }

    const email = body.email.trim().toLowerCase();

    // 1) تأكد إن الإيميل موجود في admin_users
    const { data: adminUser, error: adminUserError } = await supabase
      .from("admin_users")
      .select("*")
      .eq("email", email)
      .limit(1)
      .single();

    if (adminUserError || !adminUser) {
      // لا نوضح كثير عشان الأمان
      return NextResponse.json(
        { error: "هذا البريد غير مخوّل للوصول." },
        { status: 403 }
      );
    }

    // 2) إنشاء كود 6 أرقام
    const code = generateSixDigitCode();

    // نخلي الكود صالح مثلاً 10 دقائق
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // 3) حفظ الكود في جدول admin_otp_codes
    const { error: insertError } = await supabase.from("admin_otp_codes").insert({
      admin_user_id: adminUser.id,
      code,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error("[ADMIN OTP] insert error", insertError);
      return NextResponse.json(
        { error: "حدث خطأ أثناء إنشاء كود التحقق." },
        { status: 500 }
      );
    }

    // 4) إرسال الكود على الإيميل
    await sendAdminOtpEmail({ email, code });

    return NextResponse.json({
      success: true,
      message: "تم إرسال كود التحقق إلى البريد الإلكتروني (إن وجد).",
    });
  } catch (err) {
    console.error("[ADMIN OTP] unexpected error", err);
    return NextResponse.json(
      { error: "حدث خطأ غير متوقع." },
      { status: 500 }
    );
  }
}
