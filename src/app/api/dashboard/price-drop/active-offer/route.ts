import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { withCors, handleOptions } from "../cors";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const body = await req.json().catch(() => null);

  if (!body) {
    return withCors(
      req,
      NextResponse.json({ error: "INVALID_BODY" }, { status: 400 }),
    );
  }

  const {
    store_id,
    product_id,
    salla_customer_id,
    customer_email,
  } = body as {
    store_id?: string;
    product_id?: string;
    salla_customer_id?: string | null;
    customer_email?: string | null;
  };

  if (!store_id || !product_id) {
    return withCors(
      req,
      NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 }),
    );
  }

  if (!salla_customer_id && !customer_email) {
    return withCors(req, NextResponse.json({ has_offer: false }));
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
    .eq("store_id", store_id)
    .eq("product_id", product_id)
    .eq("status", "pending")
    .is("onsite_seen_at", null)
    .eq("campaign.send_onsite", true)
    .eq("campaign.status", "active")
    .lte("campaign.starts_at", nowIso)
    .or(`campaign.ends_at.is.null,campaign.ends_at.gte.${nowIso}`);

  if (salla_customer_id) {
    query = query.eq("salla_customer_id", salla_customer_id);
  } else if (customer_email) {
    query = query.eq("customer_email", customer_email);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error(error);
    return withCors(
      req,
      NextResponse.json({ error: "DB_ERROR" }, { status: 500 }),
    );
  }

  if (!data || !(data as any).campaign) {
    return withCors(req, NextResponse.json({ has_offer: false }));
  }

  const targetId = (data as any).id as number;
  const campaign = (data as any).campaign as any;

  await supabase
    .from("price_drop_targets")
    .update({ onsite_seen_at: new Date().toISOString(), status: "notified" })
    .eq("id", targetId);

  return withCors(
    req,
    NextResponse.json({
      has_offer: true,
      product_id: (data as any).product_id,
      product_title: campaign.product_title,
      product_url: campaign.product_url,
      discount_type: campaign.discount_type,
      discount_percent: campaign.discount_percent,
      original_price: campaign.original_price,
      new_price: campaign.new_price,
      coupon_code: campaign.coupon_code,
      ends_at: campaign.ends_at,
    }),
  );
}
