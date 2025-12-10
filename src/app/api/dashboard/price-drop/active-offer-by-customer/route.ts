// FILE: src/app/(admin)/api/dashboard/price-drop/active-offer-by-customer/route.ts
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
  const customerEmail = searchParams.get("customer_email");

  if (!storeId) {
    return withCors(
      req,
      NextResponse.json({ error: "MISSING_STORE_ID" }, { status: 400 }),
    );
  }

  if (!sallaCustomerId && !customerEmail) {
    return withCors(
      req,
      NextResponse.json({ has_offer: false }, { status: 200 }),
    );
  }

  const nowIso = new Date().toISOString();

  let query = supabase
    .from("price_drop_targets")
    .select(
      `
      id,
      campaign_id,
      product_id,
      salla_customer_id,
      customer_email,
      onsite_seen_at,
      status,
      campaign:price_drop_campaigns (
        id,
        product_title,
        product_url,
        discount_type,
        discount_percent,
        original_price,
        new_price,
        coupon_code,
        send_onsite,
        status,
        starts_at,
        ends_at
      )
    `,
    )
    .eq("store_id", storeId)
    .eq("status", "pending")
    .eq("campaign.send_onsite", true)
    .eq("campaign.status", "active")
    .lte("campaign.starts_at", nowIso)
    .or(`campaign.ends_at.is.null,campaign.ends_at.gte.${nowIso}`)
    .order("created_at", { ascending: false });

  if (sallaCustomerId) {
    query = query.eq("salla_customer_id", sallaCustomerId);
  } else if (customerEmail) {
    query = query.eq("customer_email", customerEmail);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("[active-offer-by-customer] DB_ERROR", error);
    return withCors(
      req,
      NextResponse.json({ error: "DB_ERROR" }, { status: 500 }),
    );
  }

  if (!data || !(data as any).campaign) {
    return withCors(
      req,
      NextResponse.json({ has_offer: false }, { status: 200 }),
    );
  }

  const target = data as any;
  const campaign = target.campaign as any;

  return withCors(
    req,
    NextResponse.json(
      {
        has_offer: true,
        target_id: target.id,
        campaign_id: target.campaign_id,
        product_id: target.product_id,
        product_title: campaign.product_title,
        product_url: campaign.product_url,
        discount_type: campaign.discount_type,
        discount_percent: campaign.discount_percent,
        original_price: campaign.original_price,
        new_price: campaign.new_price,
        coupon_code: campaign.coupon_code,
        ends_at: campaign.ends_at,
      },
      { status: 200 },
    ),
  );
}
