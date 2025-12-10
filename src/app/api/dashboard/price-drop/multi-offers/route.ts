// FILE: src/app/(admin)/api/dashboard/price-drop/multi-offers/route.ts
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
  const sallaCustomerId = searchParams.get("salla_customer_id");

  if (!storeId) {
    return withCors(
      req,
      NextResponse.json({ error: "MISSING_STORE_ID" }, { status: 400 }),
    );
  }

  let query = supabase
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
    .limit(10);

  if (sallaCustomerId) {
    query = query.eq("salla_customer_id", sallaCustomerId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[multi-offers] TARGET_QUERY_ERROR", error);
    return withCors(
      req,
      NextResponse.json({ error: "DB_ERROR" }, { status: 500 }),
    );
  }

  if (!data || data.length === 0) {
    return withCors(
      req,
      NextResponse.json({ has_offers: false, offers: [] }, { status: 200 }),
    );
  }

  const offers = data
    .filter((row: any) => row.campaign)
    .map((row: any) => {
      const c = row.campaign;
      return {
        target_id: row.id,
        campaign_id: row.campaign_id,
        store_id: row.store_id,
        product_id: row.product_id,
        product_title: c.product_title,
        product_image_url: c.product_image_url,
        product_url: c.product_url,
        original_price: c.original_price,
        new_price: c.new_price,
        discount_percent: c.discount_percent,
        discount_type: c.discount_type, // "price" | "coupon"
        coupon_code: c.coupon_code,
        coupon_expires_at: c.coupon_expires_at,
        ends_at: c.ends_at,
      };
    });

  return withCors(
    req,
    NextResponse.json(
      {
        has_offers: offers.length > 0,
        offers,
      },
      { status: 200 },
    ),
  );
}
