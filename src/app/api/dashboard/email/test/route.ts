// FILE: src/app/(admin)/api/dashboard/email/test/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

type StoreEmailSettings = {
  store_id: string;
  from_name: string | null;
  from_email: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_username: string | null;
  smtp_password: string | null;
  use_tls: boolean;
};

type Store = {
  id: string;
  owner_email: string | null;
};

export async function POST(_req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data: settings, error: settingsError } = await supabase
    .from("store_email_settings")
    .select("*")
    .eq("store_id", storeId)
    .maybeSingle<StoreEmailSettings>();

  if (settingsError) {
    console.error("[email-test] settingsError", settingsError);
    return NextResponse.json(
      { error: "EMAIL_SETTINGS_FETCH_ERROR" },
      { status: 500 },
    );
  }

  if (
    !settings ||
    !settings.from_email ||
    !settings.smtp_password
  ) {
    return NextResponse.json(
      { error: "EMAIL_SETTINGS_INCOMPLETE" },
      { status: 400 },
    );
  }

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, owner_email")
    .eq("id", storeId)
    .maybeSingle<Store>();

  if (storeError) {
    console.error("[email-test] storeError", storeError);
  }

  const toEmail = store?.owner_email || settings.from_email;

  // استخدام Resend HTTP API مباشرة
  const apiKey = settings.smtp_password;
  const fromName = settings.from_name || "Price Drop Notifications";
  const fromEmail = settings.from_email;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [toEmail],
        subject: "اختبار إعدادات البريد الإلكتروني - Price Drop",
        text:
          "تم إرسال هذا الإيميل كاختبار لإعدادات SMTP في لوحة تحكم درب.\n\n" +
          "إذا وصلك الإيميل فهذا يعني أن الإعدادات صحيحة ويُمكن استخدام الإيميل في حملات Price Drop.",
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error("[email-test] resendError", body);
      return NextResponse.json(
        { error: "RESEND_SEND_FAILED" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("[email-test] exception", e);
    return NextResponse.json(
      { error: "RESEND_SEND_EXCEPTION" },
      { status: 500 },
    );
  }
}
