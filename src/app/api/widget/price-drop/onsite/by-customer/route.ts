// FILE: src/app/api/widget/price-drop/onsite/by-customer/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const widgetSecret = process.env.WIDGET_EVENT_SECRET!;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

type Body = {
  salla_store_id: string;
  salla_customer_id: string;
};

type CampaignSummary = {
  id: number;
  product_id: string;
  product_title: string | null;
  product_image_url: string | null;
  product_url: string | null;
  discount_type: "price" | "coupon";
  status: "draft" | "active" | "paused" | "finished" | "cancelled";
  starts_at: string;
  ends_at: string | null;
  send_onsite: boolean;
  original_price: string | null;
  new_price: string | null;
  discount_percent: string | null;
};

type ByCustomerResponse =
  | { eligible: false }
  | {
      eligible: true;
      campaign: CampaignSummary;
      target_id: number;
    };

function isCampaignActiveNow(campaign: {
  starts_at: string;
  ends_at: string | null;
  status: string;
}) {
  if (campaign.status !== "active") return false;

  const now = new Date();
  const startsAt = new Date(campaign.starts_at);
  if (Number.isNaN(startsAt.getTime())) return false;
  if (now < startsAt) return false;

  if (campaign.ends_at) {
    const endsAt = new Date(campaign.ends_at);
    if (!Number.isNaN(endsAt.getTime()) && now > endsAt) return false;
  }

  return true;
}

async function handleByCustomer(req: NextRequest) {
  const authHeader = req.headers.get("x-widget-secret");
  if (!authHeader || authHeader !== widgetSecret) {
    return NextResponse.json(
      { error: "UNAUTHORIZED_WIDGET" },
      { status: 401 },
    );
  }

  let sallaStoreId: string | null = null;
  let sallaCustomerId: string | null = null;

  if (req.method === "GET") {
    const { searchParams } = new URL(req.url);
    sallaStoreId = searchParams.get("salla_store_id");
    sallaCustomerId = searchParams.get("salla_customer_id");
  } else {
    const json = (await req.json()) as Partial<Body>;
    sallaStoreId = json.salla_store_id ?? null;
    sallaCustomerId = json.salla_customer_id ?? null;
  }

  if (!sallaStoreId || !sallaCustomerId) {
    return NextResponse.json(
      { error: "MISSING_REQUIRED_FIELDS" },
      { status: 400 },
    );
  }

  // 1) salla_store_id -> store_id
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id")
    .eq("salla_store_id", sallaStoreId)
    .maybeSingle<{ id: string }>();

  if (storeError) {
    console.error("BY_CUSTOMER_STORE_ERROR", storeError);
    return NextResponse.json(
      { error: "STORE_LOOKUP_FAILED" },
      { status: 500 },
    );
  }

  if (!store) {
    return NextResponse.json(
      { error: "STORE_NOT_FOUND" },
      { status: 404 },
    );
  }

  const storeId = store.id;

  // 2) نجيب آخر target له حملة On-site نشطة
  const { data, error } = await supabase
    .from("price_drop_targets")
    .select(
      `
        id,
        campaign_id,
        store_id,
        product_id,
        price_drop_campaigns!inner (
          id,
          store_id,
          product_id,
          product_title,
          product_image_url,
          product_url,
          original_price,
          new_price,
          discount_percent,
          discount_type,
          send_onsite,
          status,
          starts_at,
          ends_at
        )
      `,
    )
    .eq("store_id", storeId)
    .eq("salla_customer_id", sallaCustomerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: number;
      campaign_id: number;
      store_id: string;
      product_id: string;
      price_drop_campaigns: {
        id: number;
        store_id: string;
        product_id: string;
        product_title: string | null;
        product_image_url: string | null;
        product_url: string | null;
        original_price: string | null;
        new_price: string | null;
        discount_percent: string | null;
        discount_type: "price" | "coupon";
        send_onsite: boolean;
        status: string;
        starts_at: string;
        ends_at: string | null;
      };
    }>();

  if (error) {
    console.error("BY_CUSTOMER_TARGET_ERROR", error);
    return NextResponse.json(
      { error: "TARGET_LOOKUP_FAILED" },
      { status: 500 },
    );
  }

  if (!data) {
    const payload: ByCustomerResponse = { eligible: false };
    return NextResponse.json(payload);
  }

  const camp = data.price_drop_campaigns;

  if (!camp.send_onsite || !isCampaignActiveNow(camp)) {
    const payload: ByCustomerResponse = { eligible: false };
    return NextResponse.json(payload);
  }

  const campaign: CampaignSummary = {
    id: camp.id,
    product_id: camp.product_id,
    product_title: camp.product_title,
    product_image_url: camp.product_image_url,
    product_url: camp.product_url,
    discount_type: camp.discount_type,
    status: camp.status as any,
    starts_at: camp.starts_at,
    ends_at: camp.ends_at,
    send_onsite: camp.send_onsite,
    original_price: camp.original_price,
    new_price: camp.new_price,
    discount_percent: camp.discount_percent,
  };

  const payload: ByCustomerResponse = {
    eligible: true,
    campaign,
    target_id: data.id,
  };

  return NextResponse.json(payload);
}

export async function POST(req: NextRequest) {
  return handleByCustomer(req);
}

export async function GET(req: NextRequest) {
  return handleByCustomer(req);
}
