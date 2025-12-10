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

  const productIds = Array.from(
    new Set(
      data
        .map((row: any) => row.product_id)
        .filter((p: any) => typeof p === "string" && p.length > 0),
    ),
  );

  let viewMap: Record<string, { product_image_url: string | null; current_price: string | null }> =
    {};

  if (productIds.length > 0) {
    const { data: views } = await supabase
      .from("price_drop_product_views")
      .select("product_id, product_image_url, current_price, viewed_at")
      .eq("store_id", storeId)
      .in("product_id", productIds)
      .order("viewed_at", { ascending: false });

    if (views && views.length) {
      for (const v of views as any[]) {
        if (!viewMap[v.product_id]) {
          viewMap[v.product_id] = {
            product_image_url: v.product_image_url || null,
            current_price: v.current_price || null,
          };
        }
      }
    }
  }

  const offers = (data as any[])
    .filter((row) => row.campaign)
    .map((row) => {
      const c = row.campaign;
      const view = viewMap[row.product_id] || null;

      const productImageUrl =
        (c.product_image_url && c.product_image_url.length > 0
          ? c.product_image_url
          : null) ||
        (view && view.product_image_url ? view.product_image_url : null);

      const currentPrice =
        (view && view.current_price ? view.current_price : null) ||
        (c.new_price ?? c.original_price ?? null);

      return {
        target_id: row.id,
        campaign_id: row.campaign_id,
        store_id: row.store_id,
        product_id: row.product_id,
        product_title: c.product_title,
        product_image_url: productImageUrl,
        product_url: c.product_url,
        original_price: c.original_price,
        new_price: c.new_price,
        current_price: currentPrice,
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
