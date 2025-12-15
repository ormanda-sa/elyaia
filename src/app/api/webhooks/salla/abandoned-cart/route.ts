// FILE: src/app/api/webhooks/salla/abandoned-cart/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const SALLA_WEBHOOK_SECRET = process.env.SALLA_WEBHOOK_SECRET;

// ===== أنواع الـ payload من سلة =====

type AbandonedCartItem = {
  id: number;
  product_id: number;
  quantity: number;
};

type AbandonedCartCustomer = {
  id: number;
  name?: string;
  mobile?: string;
  email?: string;
};

type AbandonedCartData = {
  id: number; // cart id
  total: { amount: number; currency: string };
  subtotal: { amount: number; currency: string };
  total_discount: { amount: number; currency: string };
  checkout_url: string;
  age_in_minutes: number;
  created_at: {
    date: string;
    timezone_type: number;
    timezone: string;
  };
  updated_at: {
    date: string;
    timezone_type: number;
    timezone: string;
  };
  customer: AbandonedCartCustomer;
  coupon: any;
  items: AbandonedCartItem[];
};

type AbandonedCartWebhookBody = {
  event: "abandoned.cart" | "abandoned.cart.update";
  merchant: number;
  created_at: string;
  data: AbandonedCartData;
};

// ===== تحقق بسيط من الـ secret =====

async function verifySallaWebhook(req: NextRequest) {
  if (!SALLA_WEBHOOK_SECRET) return true; // لو ما حطيت secret، نسمح مؤقتاً
  const secret = req.headers.get("x-salla-secret");
  return secret === SALLA_WEBHOOK_SECRET;
}

// (اختياري) عشان لو فتحت الرابط من المتصفح ما يطلع 405
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "abandoned-cart webhook is alive",
  });
}

// ===== الـ Webhook الفعلي (POST) =====

export async function POST(req: NextRequest) {
  try {
    const ok = await verifySallaWebhook(req);
    if (!ok) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = (await req.json()) as AbandonedCartWebhookBody;

    // نطبع في اللوق عشان تقدر تتأكد في Vercel
    console.log("ABANDONED_CART_WEBHOOK:", JSON.stringify(body));

    const sallaStoreId = String(body.merchant);
    const customerId = body.data.customer?.id
      ? String(body.data.customer.id)
      : null;

    if (!customerId) {
      return NextResponse.json(
        { ok: true, skipped: "NO_CUSTOMER_ID" },
        { status: 200 },
      );
    }

    const items = body.data.items ?? [];
    if (items.length === 0) {
      return NextResponse.json(
        { ok: true, skipped: "NO_ITEMS" },
        { status: 200 },
      );
    }

    const supabase = getSupabaseServerClient();

    // 1) نحول merchant -> stores.id
    const { data: storeRow, error: storeError } = await supabase
      .from("stores")
      .select("id")
      .eq("salla_store_id", sallaStoreId)
      .maybeSingle();

    if (storeError) {
      console.error("AB_CART storeError", storeError);
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

    // 2) نطلع product_ids من العناصر
    const productIds = [
      ...new Set(items.map((i) => String(i.product_id))),
    ];

    if (productIds.length === 0) {
      return NextResponse.json(
        { ok: true, skipped: "NO_PRODUCT_IDS" },
        { status: 200 },
      );
    }

    // وقت الحدث: نفضل updated_at.date لو موجود، غير كذا created_at.date
    const eventTime =
      body.data.updated_at?.date ??
      body.data.created_at?.date ??
      new Date().toISOString();

    const eventDate = new Date(eventTime);

    // 3) نجيب الحملات على هذي المنتجات
    const { data: campaigns, error: campaignsError } = await supabase
      .from("price_drop_campaigns")
      .select("id, product_id, store_id, status, starts_at, ends_at")
      .eq("store_id", internalStoreId)
      .in("product_id", productIds)
      .in("status", ["active", "paused"]);

    if (campaignsError) {
      console.error("AB_CART campaignsError", campaignsError);
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

    let updatedTargetsCount = 0;
    let funnelEventsCount = 0;

    for (const camp of campaigns) {
      const campaignId = camp.id as number;
      const productId = camp.product_id as string;

      // نتأكد إن الحدث داخل فترة الحملة
      const startsAt = new Date(camp.starts_at);
      const endsAt = camp.ends_at ? new Date(camp.ends_at) : null;
      if (eventDate < startsAt) continue;
      if (endsAt && eventDate > endsAt) continue;

      // 4) نجيب target (نفس الحملة + نفس المنتج + نفس العميل)
      const { data: target, error: targetError } = await supabase
        .from("price_drop_targets")
        .select("id, added_to_cart_at")
        .eq("store_id", internalStoreId)
        .eq("campaign_id", campaignId)
        .eq("product_id", productId)
        .eq("salla_customer_id", customerId)
        .maybeSingle();

      if (targetError) {
        console.error("AB_CART targetError", targetError);
        continue;
      }

      if (!target) {
        // مو ضمن targets الحملة → نطنّش
        continue;
      }

      // 5) أول مرة يضيف للسلة
      if (!target.added_to_cart_at) {
        const { error: updateError } = await supabase
          .from("price_drop_targets")
          .update({
            added_to_cart_at: eventTime,
          })
          .eq("id", target.id);

        if (updateError) {
          console.error("AB_CART updateError", updateError);
        } else {
          updatedTargetsCount += 1;
        }
      }

      // 6) نسجّل الحدث في الـ funnel events
      const { error: funnelError } = await supabase
        .from("price_drop_funnel_events")
        .insert({
          store_id: internalStoreId,
          campaign_id: campaignId,
          product_id: productId,
          salla_customer_id: customerId,
          event_type: "add_to_cart",
          occurred_at: eventTime,
          cart_id: body.data.id, // لو ضفت العمود في الجدول
        });

      if (funnelError) {
        console.error("AB_CART funnelError", funnelError);
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
    console.error("AB_CART_EXCEPTION", err);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
