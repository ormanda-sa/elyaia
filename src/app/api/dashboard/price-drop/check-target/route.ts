// FILE: src/app/(admin)/api/dashboard/price-drop/check-target/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { withCors, handleOptions } from "../cors";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const { searchParams } = new URL(req.url);

  const storeId = searchParams.get("store_id");

  if (!storeId) {
    return withCors(
      req,
      NextResponse.json({ error: "MISSING_STORE_ID" }, { status: 400 }),
    );
  }

  const { data: target, error } = await supabase
    .from("price_drop_targets")
    .select(
      `
      id,
      store_id,
      campaign_id,
      product_id,
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
        ends_at
      )
    `,
    )
    .eq("store_id", storeId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: number;
      store_id: string;
      campaign_id: number;
      product_id: string;
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
      } | null;
    }>();

  if (error) {
    console.error("CHECK_TARGET_ERROR", error);
    return withCors(
      req,
      NextResponse.json(
        { error: "TARGET_LOOKUP_FAILED" },
        { status: 500 },
      ),
    );
  }

  if (!target) {
    return withCors(
      req,
      NextResponse.json({ has_target: false }, { status: 200 }),
    );
  }

  const c = target.campaign;

  if (!c) {
    return withCors(
      req,
      NextResponse.json({ has_target: true, message: "نعم" }, { status: 200 }),
    );
  }

  const { data: viewRow } = await supabase
    .from("price_drop_product_views")
    .select("product_image_url, current_price")
    .eq("store_id", storeId)
    .eq("product_id", target.product_id)
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

  const campaignPayload = {
    target_id: target.id,
    campaign_id: target.campaign_id,
    product_id: target.product_id,
    product_title: c.product_title,
    product_image_url: productImageUrl,
    product_url: c.product_url,
    original_price: c.original_price,
    new_price: c.new_price,
    current_price: currentPrice,
    discount_percent: c.discount_percent,
    discount_type: c.discount_type,
    coupon_code: c.coupon_code,
    coupon_expires_at: c.coupon_expires_at,
    ends_at: c.ends_at,
  };

  return withCors(
    req,
    NextResponse.json(
      {
        has_target: true,
        message: "نعم",
        campaign: campaignPayload,
      },
      { status: 200 },
    ),
  );
}
