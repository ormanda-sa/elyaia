// FILE: src/app/(admin)/api/dashboard/price-drop/offer-details/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const { searchParams } = new URL(req.url);

  const storeId = searchParams.get("store_id");
  const targetIdParam = searchParams.get("target_id");

  if (!storeId || !targetIdParam) {
    return NextResponse.json(
      { error: "MISSING_FIELDS" },
      { status: 400 },
    );
  }

  const targetId = Number(targetIdParam);
  if (!Number.isFinite(targetId)) {
    return NextResponse.json(
      { error: "INVALID_TARGET_ID" },
      { status: 400 },
    );
  }

  const nowIso = new Date().toISOString();

  const { data: target, error } = await supabase
    .from("price_drop_targets")
    .select(
      `
      id,
      store_id,
      campaign_id,
      product_id,
      salla_customer_id,
      customer_email,
      status,
      created_at,
      campaign:price_drop_campaigns (
        id,
        product_title,
        product_image_url,
        product_url,
        original_price,
        new_price,
        discount_percent,
        discount_type,
        coupon_code,
        coupon_expires_at,
        ends_at,
        send_onsite,
        status,
        starts_at
      )
    `,
    )
    .eq("store_id", storeId)
    .eq("id", targetId)
    .limit(1)
    .maybeSingle<{
      id: number;
      store_id: string;
      campaign_id: number;
      product_id: string;
      salla_customer_id: string | null;
      customer_email: string | null;
      status: string;
      created_at: string;
      campaign: {
        id: number;
        product_title: string | null;
        product_image_url: string | null;
        product_url: string | null;
        original_price: string | null;
        new_price: string | null;
        discount_percent: string | null;
        discount_type: "price" | "coupon";
        coupon_code: string | null;
        coupon_expires_at: string | null;
        ends_at: string | null;
        send_onsite: boolean;
        status: string;
        starts_at: string;
      };
    }>();

  if (error) {
    console.error("[offer-details] TARGET_QUERY_ERROR", error);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  if (!target || !target.campaign) {
    return NextResponse.json({ found: false }, { status: 200 });
  }

  const c = target.campaign;

  const { data: viewRow } = await supabase
    .from("price_drop_product_views")
    .select("product_image_url, current_price")
    .eq("store_id", storeId)
    .eq("product_id", target.product_id)
    .eq("salla_customer_id", target.salla_customer_id)
    .order("viewed_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ product_image_url: string | null; current_price: string | null }>();

  const productImageUrl =
    (c.product_image_url && c.product_image_url.length > 0
      ? c.product_image_url
      : null) ||
    (viewRow && viewRow.product_image_url ? viewRow.product_image_url : null);

  const currentPrice =
    (viewRow && viewRow.current_price ? viewRow.current_price : null) ||
    (c.new_price ?? c.original_price ?? null);

  const basePayload = {
    found: true,
    target_id: target.id,
    campaign_id: target.campaign_id,
    store_id: target.store_id,
    product_id: target.product_id,
    product_title: c.product_title,
    product_image_url: productImageUrl,
    product_url: c.product_url,
    current_price: currentPrice,
    discount_type: c.discount_type,
    ends_at: c.ends_at,
  };

  if (c.discount_type === "price") {
    return NextResponse.json(
      {
        ...basePayload,
        type: "price",
        original_price: c.original_price,
        new_price: c.new_price,
        discount_percent: c.discount_percent,
      },
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      ...basePayload,
      type: "coupon",
      coupon_code: c.coupon_code,
      discount_percent: c.discount_percent,
      coupon_expires_at: c.coupon_expires_at,
    },
    { status: 200 },
  );
}
