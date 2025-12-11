// FILE: src/app/(admin)/api/dashboard/price-drop/messages/send-email/route.ts
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
  smtp_password: string | null; // هنا نخزن API Key تبع Resend
  use_tls: boolean;
};

export async function POST(_req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // 1) إعدادات الإيميل (Resend)
  const { data: settings, error: settingsError } = await supabase
    .from("store_email_settings")
    .select("*")
    .eq("store_id", storeId)
    .maybeSingle<StoreEmailSettings>();

  if (settingsError) {
    console.error("[send-email] settingsError", settingsError);
    return NextResponse.json(
      { error: "EMAIL_SETTINGS_FETCH_ERROR" },
      { status: 500 },
    );
  }

  if (!settings || !settings.from_email || !settings.smtp_password) {
    return NextResponse.json(
      { error: "EMAIL_SETTINGS_INCOMPLETE" },
      { status: 400 },
    );
  }

  const apiKey = settings.smtp_password;
  const fromName = settings.from_name || "عروض درب لقطع الغيار";
  const fromEmail = settings.from_email;

  // 2) نجيب الرسائل pending للقناة email
  const { data: pendingMsgs, error: msgsError } = await supabase
    .from("price_drop_messages")
    .select(
      `
      id,
      target_id,
      channel,
      status,
      target:price_drop_targets (
        id,
        store_id,
        campaign_id,
        product_id,
        customer_email,
        salla_customer_id
      ),
      campaign:price_drop_targets!price_drop_messages_target_id_fkey!inner(
        price_drop_campaigns (
          id,
          product_title,
          product_url,
          discount_type,
          discount_percent,
          original_price,
          new_price,
          coupon_code,
          ends_at
        )
      )
    `,
    )
    .eq("channel", "email")
    .eq("status", "pending")
    .limit(50); // دفعة وحدة

  if (msgsError) {
    console.error("[send-email] msgsError", msgsError);
    return NextResponse.json(
      { error: "MESSAGES_FETCH_ERROR" },
      { status: 500 },
    );
  }

  const msgs = (pendingMsgs ?? []) as any[];

  if (!msgs.length) {
    return NextResponse.json(
      { sent: 0, failed: 0, skipped: 0 },
      { status: 200 },
    );
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const m of msgs) {
    const target = m.target;
    const campaignWrapper = m.campaign?.price_drop_campaigns;
    const email = target?.customer_email as string | null;

    if (!email || !campaignWrapper) {
      skipped += 1;
      continue;
    }

    const c = campaignWrapper as {
      id: number;
      product_title: string | null;
      product_url: string | null;
      discount_type: "price" | "coupon";
      discount_percent: string | null;
      original_price: string | null;
      new_price: string | null;
      coupon_code: string | null;
      ends_at: string | null;
    };

    const subject = buildEmailSubject(c);
    const bodyText = buildEmailBody(c, fromName);

    try {
      // 3) نرسل عبر Resend HTTP API + metadata للـ Webhooks
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [email],
          subject,
          text: bodyText,
          metadata: {
            price_drop_message_id: m.id,
            campaign_id: c.id,
            store_id: target?.store_id ?? storeId,
          },
        }),
      });

      const body = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        console.error("[send-email] resendError", body);

        const { error: updErrFail } = await supabase
          .from("price_drop_messages")
          .update({
            status: "failed",
            failed_at: new Date().toISOString(),
            error_message: body.error || "RESEND_SEND_FAILED",
          })
          .eq("id", m.id);

        if (updErrFail) {
          console.error("[send-email] updateErrorFail", updErrFail);
        }

        failed += 1;
        continue;
      }

      // 👈 نقرأ id من Resend (email_id) ونخزّنه
      const emailProviderId = body.id as string | undefined;

      // 4) نحدّث الرسالة إلى sent
      const { error: updErr } = await supabase
        .from("price_drop_messages")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          error_message: null,
          email_provider_id: emailProviderId ?? null,
        })
        .eq("id", m.id);

      if (updErr) {
        console.error("[send-email] updateError", updErr);
        failed += 1;
      } else {
        sent += 1;
      }
    } catch (e: any) {
      console.error("[send-email] sendException", e);
      const { error: updErr2 } = await supabase
        .from("price_drop_messages")
        .update({
          status: "failed",
          failed_at: new Date().toISOString(),
          error_message: String(e?.message || "SEND_EXCEPTION"),
        })
        .eq("id", m.id);

      if (updErr2) {
        console.error("[send-email] updateError2", updErr2);
      }
      failed += 1;
    }
  }

  return NextResponse.json(
    {
      sent,
      failed,
      skipped,
    },
    { status: 200 },
  );
}

function buildEmailSubject(c: {
  product_title: string | null;
  discount_type: "price" | "coupon";
  discount_percent: string | null;
}): string {
  const title = c.product_title || "المنتج اللي شفته قبل";
  if (c.discount_type === "price" && c.discount_percent) {
    return `نزل سعر ${title} (خصم ${c.discount_percent}٪)`;
  }
  if (c.discount_type === "coupon" && c.discount_percent) {
    return `كوبون خصم ${c.discount_percent}٪ على ${title}`;
  }
  return `عرض خاص على ${title}`;
}

function buildEmailBody(
  c: {
    product_title: string | null;
    product_url: string | null;
    discount_type: "price" | "coupon";
    discount_percent: string | null;
    original_price: string | null;
    new_price: string | null;
    coupon_code: string | null;
    ends_at: string | null;
  },
  storeName: string,
): string {
  const title = c.product_title || "المنتج اللي شفته قبل";
  const url = c.product_url || "#";

  let body = `مرحبًا 👋\n\n`;
  body += `لاحظنا إنك مهتم بالمنتج: ${title}\n\n`;

  if (c.discount_type === "price") {
    if (c.original_price && c.new_price) {
      body += `نزلنا سعره من ${c.original_price} إلى ${c.new_price} ريال`;
    } else {
      body += `عليه خصم خاص الآن.`;
    }
    if (c.discount_percent) {
      body += ` (خصم ${c.discount_percent}٪)`;
    }
    body += `.\n\n`;
  } else if (c.discount_type === "coupon" && c.coupon_code) {
    body += `فعّل كوبون الخصم: ${c.coupon_code}\n`;
    if (c.discount_percent) {
      body += `يعطيك خصم ${c.discount_percent}٪ على السعر.\n`;
    }
    body += `\n`;
  }

  if (c.ends_at) {
    body += `العرض لفترة محدودة حتى: ${c.ends_at}\n\n`;
  }

  body += `تقدر تروح للمنتج من هنا:\n${url}\n\n`;
  body += `تحياتنا,\n${storeName}\n`;

  return body;
}
