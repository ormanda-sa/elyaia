// FILE: src/app/api/cron/marketing/send-messages/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabaseService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function getFromForStore(sp: ReturnType<typeof supabaseService>, storeId: string) {
  const { data, error } = await sp
    .from("store_email_settings")
    .select("from_name, from_email")
    .eq("store_id", storeId)
    .single();

  if (error) {
    // لو ما فيه إعدادات أو صار خطأ، نرجع افتراضي موثّق عندك
    return { from_name: "Darb", from_email: "no-reply@darb.com.sa" };
  }

  const from_name = String(data?.from_name || "Darb").trim();
  const from_email = String(data?.from_email || "no-reply@darb.com.sa").trim();

  return { from_name, from_email };
}

async function sendEmailResend(opts: {
  from: string;
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Missing RESEND_API_KEY");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: opts.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error("Resend failed: " + t);
  }
}

async function sendWhatsappGeneric(apiUrl: string, apiKey: string, to: string, text: string) {
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey,
    },
    body: JSON.stringify({ to, text }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error("WhatsApp failed: " + t);
  }
}

export async function GET(req: NextRequest) {
  try {
    const secret = new URL(req.url).searchParams.get("secret");
    if (!secret || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const sp = supabaseService();
    const nowIso = new Date().toISOString();

    // ✅ لا ترسل إلا اللي scheduled_at <= الآن
    const { data: msgs, error: e1 } = await sp
      .from("marketing_campaigns_messages")
      .select("id, store_id, campaign_id, target_id, channel, status, scheduled_at")
      .eq("status", "pending")
      .not("scheduled_at", "is", null)
      .lte("scheduled_at", nowIso)
      .order("scheduled_at", { ascending: true })
      .limit(50);

    if (e1) throw e1;
    if (!msgs?.length) return NextResponse.json({ ok: 1, sent: 0, failed: 0, total: 0 });

    let sent = 0;
    let failed = 0;

    for (const m of msgs) {
      try {
        const { data: t, error: e2 } = await sp
          .from("marketing_campaigns_targets")
          .select("id, customer_email, customer_phone, customer_name")
          .eq("id", m.target_id)
          .single();
        if (e2) throw e2;

        if (m.channel === "email") {
          if (!t?.customer_email) throw new Error("missing email");

          const { from_name, from_email } = await getFromForStore(sp, m.store_id);
          const from = `${from_name} <${from_email}>`;

          await sendEmailResend({
            from,
            to: t.customer_email,
            subject: "عرض خاص لك 🔥",
            html: `<div dir="rtl" style="font-family:system-ui">
              <b>هلا ${t.customer_name ?? ""}</b><br/>
              عندنا عرض خاص لك — ادخل المتجر وشوف 👀
            </div>`,
          });
        }

        if (m.channel === "whatsapp") {
          if (!t?.customer_phone) throw new Error("missing phone");

          const { data: ws, error: ew } = await sp
            .from("store_whatsapp_settings")
            .select("api_url, api_key")
            .eq("store_id", m.store_id)
            .single();

          if (ew) throw ew;
          if (!ws?.api_url || !ws?.api_key) throw new Error("missing whatsapp settings");

          await sendWhatsappGeneric(
            ws.api_url,
            ws.api_key,
            t.customer_phone,
            `هلا ${t.customer_name ?? ""} 🔥 عندنا عرض خاص لك في المتجر — ادخل وشوف`
          );
        }

        await sp
          .from("marketing_campaigns_messages")
          .update({
            status: "sent",
            sent_at: nowIso,
          })
          .eq("id", m.id);

        sent += 1;
      } catch (e: any) {
        failed += 1;
        await sp
          .from("marketing_campaigns_messages")
          .update({
            status: "failed",
            failed_at: nowIso,
            error_message: e?.message ?? "failed",
          })
          .eq("id", m.id);
      }
    }

    return NextResponse.json({ ok: 1, sent, failed, total: msgs.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed" }, { status: 500 });
  }
}
