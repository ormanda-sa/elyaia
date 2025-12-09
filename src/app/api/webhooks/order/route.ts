// FILE: src/app/api/webhooks/salla/order/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const SALLA_WEBHOOK_SECRET = process.env.SALLA_WEBHOOK_SECRET;

// ===== أنواع مبسّطة (عدّلها حسب سلة) =====

type OrderItem = {
  product_id: number | string;
  quantity: number;
};

type OrderCustomer = {
  id: number | string;
  name?: string;
  mobile?: string;
  email?: string;
};

type OrderData = {
  id: number | string;          // رقم الطلب
  status?: string;
  created_at?: string;          // أو كائن { date: "...", ... } حسب سلة
  paid_at?: string;
  currency?: string;
  total?: number;
  subtotal?: number;
  items: OrderItem[];
  customer: OrderCustomer;
};

type OrderWebhookBody = {
  event: string;       // مثلاً "order.created" أو "order.paid"
  merchant: number;    // نفس merchant اللي شفناه في abandoned cart
  created_at: string;
  data: OrderData;
};

// تحقق بسيط
async function verifySallaWebhook(req: NextRequest) {
  if (!SALLA_WEBHOOK_SECRET) return true;
  const secret = req.headers.get("x-salla-secret");
  return secret === SALLA_WEBHOOK_SECRET;
}

// ====== Handler ======

export async function POST(req: NextRequest) {
  try {
    const ok = await verifySallaWebhook(req);
    if (!ok) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = (await req.json()) as OrderWebhookBody;

    // نحول merchant -> salla_store_id
    const sallaStoreId = String(body.merchant);

    // العميل
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

    // 1) نجيب stores.id من salla_store_id
    const { data: storeRow, error: storeError } = await supabase
      .from("stores")
      .select("id")
      .eq("salla_store_id", sallaStoreId)
      .maybeSingle();

    if (storeError) {
      console.error("ORDER_WEBHOOK storeError", storeError);
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

    // 2) نطلع product_ids من الطلب
    const productIds = [
      ...new Set(items.map((i) => String(i.product_id))),
    ];

    if (productIds.length === 0) {
      return NextResponse.json(
        { ok: true, skipped: "NO_PRODUCT_IDS" },
        { status: 200 },
      );
    }

    // وقت الطلب: حاول نستخدم paid_at أو created_at أو data.created_at.date
    const rawOrderTime =
      body.data.paid_at ??
      body.data.created_at ??
      body.created_at ??
      new Date().toISOString();
    const orderTime = new Date(rawOrderTime).toISOString();

    const orderId = String(body.data.id);

    // 3) نجيب الحملات على هذه المنتجات
    const { data: campaigns, error: campaignsError } = await supabase
      .from("price_drop_campaigns")
      .select("id, product_id, store_id, status, starts_at, ends_at")
      .eq("store_id", internalStoreId)
      .in("product_id", productIds)
      .in("status", ["active", "finished", "paused"]); // غطّي الحالات المنطقية

    if (campaignsError) {
      console.error("ORDER_WEBHOOK campaignsError", campaignsError);
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

    const orderDate = new Date(orderTime);

    for (const camp of campaigns) {
      const campaignId = camp.id as number;
      const productId = camp.product_id as string;

      // نتأكد إن الطلب داخل نطاق الحملة
      const startsAt = new Date(camp.starts_at);
      const endsAt = camp.ends_at ? new Date(camp.ends_at) : null;
      if (orderDate < startsAt) continue;
      if (endsAt && orderDate > endsAt) continue;

      // 4) نجيب target (نفس الحملة + نفس المنتج + نفس العميل)
      const { data: target, error: targetError } = await supabase
        .from("price_drop_targets")
        .select("id, converted_at")
        .eq("store_id", internalStoreId)
        .eq("campaign_id", campaignId)
        .eq("product_id", productId)
        .eq("salla_customer_id", customerId)
        .maybeSingle();

      if (targetError) {
        console.error("ORDER_WEBHOOK targetError", targetError);
        continue;
      }

      if (!target) {
        // مو ضمن targets الحملة
        continue;
      }

      // نسجل أول تحويل فقط
      if (!target.converted_at) {
        const { error: updateError } = await supabase
          .from("price_drop_targets")
          .update({
            converted_at: orderTime,
            conversion_order_id: orderId,
            conversion_source: "onsite", // كبداية
            status: "converted",
          })
          .eq("id", target.id);

        if (updateError) {
          console.error("ORDER_WEBHOOK updateError", updateError);
        } else {
          updatedTargetsCount += 1;
        }
      }

      // 5) نسجل حدث في الـ funnel events
      const { error: funnelError } = await supabase
        .from("price_drop_funnel_events")
        .insert({
          store_id: internalStoreId,
          campaign_id: campaignId,
          product_id: productId,
          salla_customer_id: customerId,
          event_type: "order",
          occurred_at: orderTime,
        });

      if (funnelError) {
        console.error("ORDER_WEBHOOK funnelError", funnelError);
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
    console.error("ORDER_WEBHOOK_EXCEPTION", err);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
