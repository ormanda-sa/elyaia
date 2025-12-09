import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const SALLA_WEBHOOK_SECRET = process.env.SALLA_WEBHOOK_SECRET;

// payload حسب المثال اللي أرسلته ل purchased
type PurchasedData = {
  id: number;          // cart id
  status: "active" | "purchased";
  currency?: string;
  total?: number;
  subtotal?: number;
  total_discount?: number;
};

type PurchasedWebhookBody = {
  event: "abandoned.cart.purchased";
  merchant: number;
  created_at: string;
  data: PurchasedData;
};

async function verifySallaWebhook(req: NextRequest) {
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

    const body = (await req.json()) as PurchasedWebhookBody;

    if (body.data.status !== "purchased") {
      return NextResponse.json(
        { ok: true, skipped: "STATUS_NOT_PURCHASED" },
        { status: 200 },
      );
    }

    const sallaStoreId = String(body.merchant);
    const cartId = body.data.id;

    const supabase = getSupabaseServerClient();

    // 1) نجيب stores.id من merchant
    const { data: storeRow, error: storeError } = await supabase
      .from("stores")
      .select("id")
      .eq("salla_store_id", sallaStoreId)
      .maybeSingle();

    if (storeError) {
      console.error("AB_CART_PURCHASED storeError", storeError);
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

    // وقت الطلب: نستخدم created_at للحدث
    const orderTime =
      body.created_at ? new Date(body.created_at).toISOString() : new Date().toISOString();

    // 2) نجيب كل funnel events اللي لـ cart_id هذا
    const { data: funnelRows, error: funnelError } = await supabase
      .from("price_drop_funnel_events")
      .select(
        "campaign_id, product_id, salla_customer_id",
      )
      .eq("store_id", internalStoreId)
      .eq("cart_id", cartId)
      .eq("event_type", "add_to_cart");

    if (funnelError) {
      console.error("AB_CART_PURCHASED funnelError", funnelError);
      return NextResponse.json(
        { error: "FUNNEL_FETCH_ERROR" },
        { status: 500 },
      );
    }

    if (!funnelRows || funnelRows.length === 0) {
      return NextResponse.json({
        ok: true,
        skipped: "NO_FUNNEL_ROWS_FOR_CART",
      });
    }

    let updatedTargets = 0;
    let orderEvents = 0;

    // 3) لكل حملة + منتج + عميل نحدّث target
    for (const row of funnelRows) {
      const campaignId = row.campaign_id as number;
      const productId = row.product_id as string;
      const sallaCustomerId = row.salla_customer_id as string | null;

      if (!sallaCustomerId) continue;

      const { data: target, error: targetError } = await supabase
        .from("price_drop_targets")
        .select("id, converted_at")
        .eq("store_id", internalStoreId)
        .eq("campaign_id", campaignId)
        .eq("product_id", productId)
        .eq("salla_customer_id", sallaCustomerId)
        .maybeSingle();

      if (targetError) {
        console.error("AB_CART_PURCHASED targetError", targetError);
        continue;
      }

      if (!target) continue;

      if (!target.converted_at) {
        const { error: updateError } = await supabase
          .from("price_drop_targets")
          .update({
            converted_at: orderTime,
            conversion_order_id: String(cartId), // نستخدم cart id كـ order_id بسيط
            conversion_source: "onsite",
            status: "converted",
          })
          .eq("id", target.id);

        if (updateError) {
          console.error("AB_CART_PURCHASED updateError", updateError);
        } else {
          updatedTargets += 1;
        }
      }

      // نسجل event order في funnel
      const { error: insertError } = await supabase
        .from("price_drop_funnel_events")
        .insert({
          store_id: internalStoreId,
          campaign_id: campaignId,
          product_id: productId,
          salla_customer_id: sallaCustomerId,
          event_type: "order",
          occurred_at: orderTime,
          cart_id: cartId,
        });

      if (insertError) {
        console.error("AB_CART_PURCHASED insertError", insertError);
      } else {
        orderEvents += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      updated_targets: updatedTargets,
      order_events: orderEvents,
    });
  } catch (err) {
    console.error("AB_CART_PURCHASED_EXCEPTION", err);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
