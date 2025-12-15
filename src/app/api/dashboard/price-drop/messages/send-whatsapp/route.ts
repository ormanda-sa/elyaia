// FILE: src/app/(admin)/api/dashboard/price-drop/messages/send-whatsapp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

type StoreWhatsappSettings = {
  store_id: string;
  provider: string;
  from_number: string | null;
  api_url: string | null;
  api_key: string | null;
  updated_at: string;
};

export async function POST(_req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // 1) إعدادات الواتساب
  const { data: settings, error: settingsError } = await supabase
    .from("store_whatsapp_settings")
    .select("*")
    .eq("store_id", storeId)
    .maybeSingle<StoreWhatsappSettings>();

  if (settingsError) {
    console.error("[send-whatsapp] settingsError", settingsError);
    return NextResponse.json(
      { error: "WHATSAPP_SETTINGS_FETCH_ERROR" },
      { status: 500 },
    );
  }

  if (
    !settings ||
    !settings.from_number ||
    !settings.api_url ||
    !settings.api_key
  ) {
    return NextResponse.json(
      { error: "WHATSAPP_SETTINGS_INCOMPLETE" },
      { status: 400 },
    );
  }

  // 2) نجيب الرسائل pending للقناة whatsapp
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
        whatsapp_number,
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
    .eq("channel", "whatsapp")
    .eq("status", "pending")
    .limit(50);

  if (msgsError) {
    console.error("[send-whatsapp] msgsError", msgsError);
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
    const toNumber = target?.whatsapp_number as string | null;

    if (!toNumber || !campaignWrapper) {
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

    const text = buildWhatsappText(c);

    try {
      // TODO: ربط حقيقي مع مزود الواتساب (settings.api_url / api_key / from_number)
      console.log("[send-whatsapp] SIMULATED SEND →", {
        to: toNumber,
        text,
      });

      const { error: updErr } = await supabase
        .from("price_drop_messages")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", m.id);

      if (updErr) {
        console.error("[send-whatsapp] updateError", updErr);
        failed += 1;
      } else {
        sent += 1;
      }
    } catch (e: any) {
      console.error("[send-whatsapp] sendError", e);
      const { error: updErr2 } = await supabase
        .from("price_drop_messages")
        .update({
          status: "failed",
          error_message: String(e?.message || "SEND_FAILED"),
        })
        .eq("id", m.id);

      if (updErr2) {
        console.error("[send-whatsapp] updateError2", updErr2);
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

function buildWhatsappText(c: {
  product_title: string | null;
  product_url: string | null;
  discount_type: "price" | "coupon";
  discount_percent: string | null;
  original_price: string | null;
  new_price: string | null;
  coupon_code: string | null;
  ends_at: string | null;
}): string {
  const title = c.product_title || "المنتج اللي شفته قبل";
  const url = c.product_url || "#";

  let text = `👋 عندك عرض خاص على ${title}\n\n`;

  if (c.discount_type === "price") {
    if (c.original_price && c.new_price) {
      text += `نزلنا السعر من ${c.original_price} إلى ${c.new_price} ريال`;
    } else {
      text += `عليه خصم خاص الآن`;
    }
    if (c.discount_percent) {
      text += ` (خصم ${c.discount_percent}٪)`;
    }
    text += `.\n\n`;
  } else if (c.discount_type === "coupon" && c.coupon_code) {
    text += `كوبون الخصم: ${c.coupon_code}\n`;
    if (c.discount_percent) {
      text += `يعطيك خصم ${c.discount_percent}٪ على السعر.\n`;
    }
    text += `\n`;
  }

  if (c.ends_at) {
    text += `📅 العرض ينتهي بتاريخ: ${c.ends_at}\n\n`;
  }

  text += `رابط المنتج:\n${url}\n`;

  return text;
}
