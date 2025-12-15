// FILE: src/app/api/widget/price-drop/onsite/eligible/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const widgetSecret = process.env.WIDGET_EVENT_SECRET!;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

type Body = {
  salla_store_id: string;          // 👈 بدل store_id
  product_id: string;
  salla_customer_id: string | null;
};

type CampaignSummary = {
  id: number;
  product_title: string | null;
  product_image_url: string | null;
  product_url: string | null;
  discount_type: "price" | "coupon";
  status: "draft" | "active" | "paused" | "finished" | "cancelled";
  starts_at: string;
  ends_at: string | null;
  send_onsite: boolean;
  send_email: boolean;
  send_whatsapp: boolean;
  original_price: string | null;
  new_price: string | null;
  discount_percent: string | null;
};

type EligibleResponse =
  | { eligible: false }
  | {
      eligible: true;
      target_id: number;
      campaign: CampaignSummary;
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
    if (!Number.isNaN(endsAt.getTime()) && now > endsAt) {
      return false;
    }
  }

  return true;
}

export async function POST(req: NextRequest) {
  try {
    // 🔐 تحقق من السر
    const authHeader = req.headers.get("x-widget-secret");
    if (!authHeader || authHeader !== widgetSecret) {
      return NextResponse.json({ error: "UNAUTHORIZED_WIDGET" }, { status: 401 });
    }

    const json = (await req.json()) as Partial<Body>;

    const sallaStoreId = json.salla_store_id;
    const productId = json.product_id;
    const sallaCustomerId = json.salla_customer_id;

    if (!sallaStoreId || !productId || !sallaCustomerId) {
      return NextResponse.json(
        { error: "MISSING_REQUIRED_FIELDS" },
        { status: 400 },
      );
    }

    // 🧠 أول شيء: نحول salla_store_id → store_id (UUID) من جدول stores
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id")
      .eq("salla_store_id", sallaStoreId)
      .maybeSingle<{ id: string }>();

    if (storeError) {
      console.error("ONSITE_ELIGIBLE_STORE_ERROR", storeError);
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

    // 🧠 نجيب حملة On-site فعالة + target لهذا العميل / المنتج
    const { data, error } = await supabase
      .from("price_drop_campaigns")
      .select(
        `
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
          coupon_code,
          coupon_expires_at,
          send_onsite,
          send_email,
          send_whatsapp,
          duration_hours,
          starts_at,
          ends_at,
          status,
          price_drop_targets:price_drop_targets!inner (
            id,
            salla_customer_id
          )
        `,
      )
      .eq("store_id", storeId)
      .eq("product_id", productId)
      .eq("send_onsite", true)
      .eq("status", "active")
      .eq("price_drop_targets.salla_customer_id", sallaCustomerId)
      .limit(1)
      .maybeSingle<{
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
        coupon_code: string | null;
        coupon_expires_at: string | null;
        send_onsite: boolean;
        send_email: boolean;
        send_whatsapp: boolean;
        duration_hours: number;
        starts_at: string;
        ends_at: string | null;
        status: "draft" | "active" | "paused" | "finished" | "cancelled";
        price_drop_targets: { id: number; salla_customer_id: string | null }[];
      }>();

    if (error) {
      console.error("ONSITE_ELIGIBLE_CAMPAIGN_ERROR", error);
      return NextResponse.json(
        { error: "CAMPAIGN_LOOKUP_FAILED" },
        { status: 500 },
      );
    }

    if (!data) {
      const payload: EligibleResponse = { eligible: false };
      return NextResponse.json(payload);
    }

    if (!isCampaignActiveNow(data)) {
      const payload: EligibleResponse = { eligible: false };
      return NextResponse.json(payload);
    }

    const target = data.price_drop_targets?.[0];
    if (!target) {
      const payload: EligibleResponse = { eligible: false };
      return NextResponse.json(payload);
    }

    const campaign: CampaignSummary = {
      id: data.id,
      product_title: data.product_title,
      product_image_url: data.product_image_url,
      product_url: data.product_url,
      discount_type: data.discount_type,
      status: data.status,
      starts_at: data.starts_at,
      ends_at: data.ends_at,
      send_onsite: data.send_onsite,
      send_email: data.send_email,
      send_whatsapp: data.send_whatsapp,
      original_price: data.original_price,
      new_price: data.new_price,
      discount_percent: data.discount_percent,
    };

    const payload: EligibleResponse = {
      eligible: true,
      target_id: target.id,
      campaign,
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("ONSITE_ELIGIBLE_FATAL", err);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
