// src/app/api/general-manager/stores/invitations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL || "no-reply@elyaia.com";
const defaultInviteUrl =
  process.env.RESEND_INVITE_URL || "https://elyaia.vercel.app/general-manager/onboarding";

const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { email?: string }
      | null;

    const email = body?.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "البريد الإلكتروني مطلوب." },
        { status: 400 }
      );
    }

    if (!resend) {
      console.error("[GM INVITATION] RESEND_API_KEY is missing");
      return NextResponse.json(
        {
          success: false,
          error: "إعدادات البريد غير مفعلة حالياً (RESEND_API_KEY مفقود).",
        },
        { status: 500 }
      );
    }

    // رابط إكمال التسجيل (تقدر تغيّره من ENV)
    const inviteUrl = `${defaultInviteUrl}?email=${encodeURIComponent(email)}`;

    console.log("[GM INVITATION] sending invite via Resend to:", email);

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "دعوة لإنشاء متجر في Darb Filters",
      html: `
        <div style="direction: rtl; text-align: right; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          <p>السلام عليكم،</p>
          <p>
            تمت دعوتك لإنشاء وربط متجرك في لوحة
            <strong>Darb Filters</strong>.
          </p>
          <p>اضغط على الزر التالي لإكمال التسجيل:</p>
          <p style="margin: 16px 0;">
            <a
              href="${inviteUrl}"
              style="
                display: inline-block;
                padding: 10px 18px;
                background-color: #16a34a;
                color: #ffffff;
                border-radius: 6px;
                text-decoration: none;
                font-size: 14px;
              "
            >
              إكمال التسجيل
            </a>
          </p>
          <p style="font-size: 12px; color: #555555;">
            إذا لم يعمل الزر يمكنك نسخ الرابط التالي ولصقه في المتصفح:
            <br />
            <a href="${inviteUrl}" style="color: #2563eb;">${inviteUrl}</a>
          </p>
          <p style="font-size: 12px; color: #999999;">
            إذا لم تكن تتوقع هذه الرسالة، يمكنك تجاهلها بأمان.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("[GM INVITATION] Resend error", error);
      return NextResponse.json(
        { success: false, error: "تعذّر إرسال الدعوة عبر البريد." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم إرسال رابط التسجيل إلى البريد الإلكتروني.",
    });
  } catch (err) {
    console.error("[GM INVITATION] unexpected error", err);
    return NextResponse.json(
      { success: false, error: "حدث خطأ غير متوقع." },
      { status: 500 }
    );
  }
}
