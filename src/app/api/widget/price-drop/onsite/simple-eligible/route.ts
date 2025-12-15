// FILE: src/app/api/widget/price-drop/onsite/simple-eligible/route.ts

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
  product_id: string;
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

type SimpleEligibleResponse =
  | { eligible: false }
  | {
      eligible: true;
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
    if (!Number.isNaN(endsAt.getTime()) && now > endsAt) return false;
  }

  return true;
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("x-widget-secret");
    if (!authHeader || authHeader !== widgetSecret) {
      return NextResponse.json(
        { error: "UNAUTHORIZED_WIDGET" },
        { status: 401 },
      );
    }

    const json = (await req.json()) as Partial<Body>;

    const sallaStoreId = json.salla_store_id;
    const productId = json.product_id;

    if (!sallaStoreId || !productId) {
      return NextResponse.json(
        { error: "MISSING_REQUIRED_FIELDS" },
        { status: 400 },
      );
    }

    // 1) نحول salla_store_id -> store_id
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id")
      .eq("salla_store_id", sallaStoreId)
      .maybeSingle<{ id: string }>();

    if (storeError) {
      console.error("SIMPLE_ELIGIBLE_STORE_ERROR", storeError);
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

    // 2) نجيب حملة On-site نشطة لهذا المنتج
    const { data: campaign, error: campaignError } = await supabase
      .from("price_drop_campaigns")
      .select("*")
      .eq("store_id", storeId)
      .eq("product_id", productId)
      .eq("send_onsite", true)
      .eq("status", "active")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle<any>();

    if (campaignError) {
      console.error("SIMPLE_ELIGIBLE_CAMPAIGN_ERROR", campaignError);
      return NextResponse.json(
        { error: "CAMPAIGN_LOOKUP_FAILED" },
        { status: 500 },
      );
    }

    if (!campaign || !isCampaignActiveNow(campaign)) {
      const payload: SimpleEligibleResponse = { eligible: false };
      return NextResponse.json(payload);
    }

    // 3) نتأكد فيه targets للحملة (أي واحد، ما يهم مين)
    const { data: anyTarget, error: targetError } = await supabase
      .from("price_drop_targets")
      .select("id")
      .eq("campaign_id", campaign.id)
      .eq("store_id", storeId)
      .eq("product_id", productId)
      .limit(1)
      .maybeSingle<{ id: number }>();

    if (targetError) {
      console.error("SIMPLE_ELIGIBLE_TARGET_ERROR", targetError);
      return NextResponse.json(
        { error: "TARGET_LOOKUP_FAILED" },
        { status: 500 },
      );
    }

    if (!anyTarget) {
      const payload: SimpleEligibleResponse = { eligible: false };
      return NextResponse.json(payload);
    }

    const summary: CampaignSummary = {
      id: campaign.id,
      product_title: campaign.product_title,
      product_image_url: campaign.product_image_url,
      product_url: campaign.product_url,
      discount_type: campaign.discount_type,
      status: campaign.status,
      starts_at: campaign.starts_at,
      ends_at: campaign.ends_at,
      send_onsite: campaign.send_onsite,
      send_email: campaign.send_email,
      send_whatsapp: campaign.send_whatsapp,
      original_price: campaign.original_price,
      new_price: campaign.new_price,
      discount_percent: campaign.discount_percent,
    };

    const payload: SimpleEligibleResponse = {
      eligible: true,
      campaign: summary,
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("SIMPLE_ELIGIBLE_FATAL", err);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
