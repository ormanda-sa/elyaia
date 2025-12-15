import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const emailRaw = body?.email;

    if (!emailRaw || typeof emailRaw !== "string") {
      return NextResponse.json(
        { ok: false, error: "EMAIL_REQUIRED" },
        { status: 200 },
      );
    }

    const email = emailRaw.trim().toLowerCase();
    const supabase = getSupabaseServerClient();

    // 1) هل الإيميل مسجل كمستخدم متجر؟
    const { data: existingUser, error: userErr } = await supabase
      .from("store_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (userErr) {
      console.error("store-invitations check error:", userErr);
      return NextResponse.json(
        { ok: false, error: "CHECK_FAILED" },
        { status: 200 },
      );
    }

    if (existingUser) {
      return NextResponse.json(
        { ok: false, error: "EMAIL_EXISTS" },
        { status: 200 },
      );
    }

    // 2) إرسال إيميل الدعوة
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const RESEND_FROM =
      process.env.RESEND_FROM_EMAIL || "noreply@example.com";
    const SALES_EMAIL =
      process.env.SALES_EMAIL || process.env.SUPPORT_EMAIL || null;

    const BASE_URL =
      process.env.NEXT_PUBLIC_SITE_URL || "https://elyaia.vercel.app";

    const inviteLink = `${BASE_URL}/onboarding?email=${encodeURIComponent(
      email,
    )}`;

    if (!RESEND_API_KEY) {
      console.warn(
        "RESEND_API_KEY missing – invitation email will not be sent.",
      );
    } else {
      const subject = "دعوة لفتح حساب لوحة تحكم DARB FILTERS لمتجرك";
      const html = `
        <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; direction: rtl; text-align: right;">
          <p>مرحباً،</p>
          <p>تشكرًا لاهتمامك بربط متجرك مع فلتر DARB FILTERS.</p>
          <p>يمكنك إكمال التسجيل وفتح حساب للمتجر من خلال الرابط التالي:</p>
          <p style="margin: 12px 0;">
            <a href="${inviteLink}" style="color:#2563eb; text-decoration:none; font-weight:bold;">
              تسجيل متجر جديد
            </a>
          </p>
          <p style="font-size:12px; color:#6b7280;">
            في حال لم يعمل الزر، يمكنك نسخ الرابط التالي ولصقه في المتصفح:<br/>
            <span style="direction:ltr; display:inline-block; margin-top:4px;">${inviteLink}</span>
          </p>
          <hr style="margin:16px 0; border:none; border-top:1px solid #e5e7eb;" />
          <p style="font-size:12px; color:#6b7280;">
            البريد الذي تم إدخاله في الطلب: <strong>${email}</strong>
          </p>
        </div>
      `;

      const payload: any = {
        from: RESEND_FROM,
        to: [email],        // 👈 يرسل لصاحب المتجر نفسه
        subject,
        html,
      };

      if (SALES_EMAIL) {
        payload.bcc = [SALES_EMAIL]; // اختيارية
      }

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }).catch((err) => {
        console.error("store-invitations resend error:", err);
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("store-invitations error:", err);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR" },
      { status: 200 },
    );
  }
}
