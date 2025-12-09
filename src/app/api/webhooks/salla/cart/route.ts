// FILE: src/app/api/webhooks/salla/cart/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const SALLA_WEBHOOK_SECRET = process.env.SALLA_WEBHOOK_SECRET;

// NOTE: عدّل النوع هذا حسب فورمات Webhook حق سلة عندك
type CartItem = {
  product_id: string | number;
  quantity: number;
};

type CartWebhookBody = {
  event?: string;
  // حسب توثيق سلة:
  store_id?: string;         // salla_store_id
  customer_id?: string | null;
  cart_id?: string;
  items?: CartItem[];
  created_at?: string;
  // أحياناً سلة تحط البيانات داخل data:
  data?: {
    store_id?: string;
    customer_id?: string | null;
    cart_id?: string;
    items?: CartItem[];
    created_at?: string;
  };
};

async function verifySallaWebhook(req: NextRequest) {
  // خله بسيط الآن، بعدين تضيف HMAC لو حاب
  if (!SALLA_WEBHOOK_SECRET) return true;
  const secret = req.headers.get("x-salla-secret");
  return secret === SALLA_WEBHOOK_SECRET;
}

export async function POST(req: NextRequest) {
  try {
    const ok = await verifySallaWebhook(req);
    if (!ok) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = (await req.json()) as CartWebhookBody;

    // نحاول نلقط store_id / customer / items من root أو data
    const sallaStoreId =
      body.store_id ?? body.data?.store_id ?? undefined;
    const sallaCustomerId =
      body.customer_id ?? body.data?.customer_id ?? null;
    const items = body.items ?? body.data?.items ?? [];
    const cartEventAt =
      body.created_at ?? body.data?.created_at ?? new Date().toISOString();

    if (!sallaStoreId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_STORE_ID" },
        { status: 400 },
      );
    }

    if (!sallaCustomerId) {
      // ما نقدر نربط بدون عميل
      return NextResponse.json(
        { ok: true, skipped: "NO_CUSTOMER" },
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { ok: true, skipped: "NO_ITEMS" },
      );
    }

    const supabase = getSupabaseServerClient();

    // 1) نجيب الـ store الداخلي من salla_store_id
    const { data: storeRow, error: storeError } = await supabase
      .from("stores")
      .select("id")
      .eq("salla_store_id", sallaStoreId)
      .maybeSingle();

    if (storeError) {
      console.error("SALLA_CART_WEBHOOK storeError", storeError);
      return NextResponse.json(
        { error: "STORE_LOOKUP_ERROR" },
        { status: 500 },
      );
    }

    if (!storeRow) {
      return NextResponse.json(
        { error: "STORE_NOT_FOUND" },
        { status: 404 },
      );
    }

    const internalStoreId = storeRow.id as string;

    // 2) نطلع product_ids المميزة من العناصر
    const productIds = [
      ...new Set(items.map((i) => String(i.product_id))),
    ];

    if (productIds.length === 0) {
      return NextResponse.json(
        { ok: true, skipped: "NO_PRODUCT_IDS" },
      );
    }

    // 3) نجيب الحملات النشطة على هذي المنتجات
    const nowIso = new Date().toISOString();

    const { data: campaigns, error: campaignsError } = await supabase
      .from("price_drop_campaigns")
      .select(
        "id, product_id, store_id, status, starts_at, ends_at",
      )
      .eq("store_id", internalStoreId)
      .in("product_id", productIds)
      .in("status", ["active", "paused"]); // لو تبي active فقط خله ["active"]

    if (campaignsError) {
      console.error(
        "SALLA_CART_WEBHOOK campaignsError",
        campaignsError,
      );
      return NextResponse.json(
        { error: "CAMPAIGNS_FETCH_ERROR" },
        { status: 500 },
      );
    }

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({
        ok: true,
        skipped: "NO_CAMPAIGNS_FOR_PRODUCTS",
      });
    }

    const eventTime = cartEventAt;

    let updatedTargetsCount = 0;
    let funnelEventsCount = 0;

    // 4) لكل حملة، نحدّث target الخاص بالعميل لو موجود
    for (const camp of campaigns) {
      const campaignId = camp.id as number;
      const productId = camp.product_id as string;

      // نتأكد إن الحدث داخل نطاق الحملة (اختياري بس منطقي)
      const startsAt = new Date(camp.starts_at);
      const endsAt = camp.ends_at ? new Date(camp.ends_at) : null;
      const eventDate = new Date(eventTime);
      if (eventDate < startsAt) continue;
      if (endsAt && eventDate > endsAt) continue;

      // نجيب target (حملة + منتج + عميل)
      const { data: target, error: targetError } = await supabase
        .from("price_drop_targets")
        .select("id, added_to_cart_at")
        .eq("store_id", internalStoreId)
        .eq("campaign_id", campaignId)
        .eq("product_id", productId)
        .eq("salla_customer_id", sallaCustomerId)
        .maybeSingle();

      if (targetError) {
        console.error("SALLA_CART_WEBHOOK targetError", targetError);
        continue;
      }

      if (!target) {
        // العميل مو Target في الحملة → حالياً نتجاهله
        continue;
      }

      // نسجل أول إضافة للسلة فقط
      if (!target.added_to_cart_at) {
        const { error: updateError } = await supabase
          .from("price_drop_targets")
          .update({
            added_to_cart_at: eventTime,
          })
          .eq("id", target.id);

        if (updateError) {
          console.error(
            "SALLA_CART_WEBHOOK updateError",
            updateError,
          );
        } else {
          updatedTargetsCount += 1;
        }
      }

      // (اختياري) نسجل الحدث في price_drop_funnel_events
      const { error: funnelError } = await supabase
        .from("price_drop_funnel_events")
        .insert({
          store_id: internalStoreId,
          campaign_id: campaignId,
          product_id: productId,
          salla_customer_id: sallaCustomerId,
          event_type: "add_to_cart",
          occurred_at: eventTime,
        });

      if (funnelError) {
        console.error(
          "SALLA_CART_WEBHOOK funnelError",
          funnelError,
        );
      } else {
        funnelEventsCount += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      updated_targets: updatedTargetsCount,
      funnel_events: funnelEventsCount,
    });
  } catch (err) {
    console.error("SALLA_CART_WEBHOOK_EXCEPTION", err);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
