// FILE: src/app/(admin)/api/dashboard/price-drop/popup-event/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { withCors, handleOptions } from "../cors";

type PopupEventType = "impression" | "click" | "close";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServerClient();

  let body: {
    store_id?: string;
    salla_customer_id?: string;
    event_type?: PopupEventType;
    product_id?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return withCors(
      req,
      NextResponse.json({ error: "INVALID_JSON" }, { status: 400 }),
    );
  }

  const storeId = body.store_id;
  const sallaCustomerId = body.salla_customer_id;
  const eventType = body.event_type;
  const productIdOverride = body.product_id || null;

  if (!storeId || !sallaCustomerId || !eventType) {
    return withCors(
      req,
      NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 }),
    );
  }

  if (!["impression", "click", "close"].includes(eventType)) {
    return withCors(
      req,
      NextResponse.json({ error: "INVALID_EVENT_TYPE" }, { status: 400 }),
    );
  }

  // نجيب آخر Target لهذا العميل في هذا المتجر
  const { data: target, error: targetError } = await supabase
    .from("price_drop_targets")
    .select("id, campaign_id, product_id, store_id, status, onsite_seen_at, created_at")
    .eq("store_id", storeId)
    .eq("salla_customer_id", sallaCustomerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: number;
      campaign_id: number;
      product_id: string;
      store_id: string;
      status: string;
      onsite_seen_at: string | null;
      created_at: string;
    }>();

  if (targetError) {
    console.error("[popup-event] TARGET_LOOKUP_FAILED", targetError);
    return withCors(
      req,
      NextResponse.json({ error: "TARGET_LOOKUP_FAILED" }, { status: 500 }),
    );
  }

  if (!target) {
    return withCors(
      req,
      NextResponse.json({ ok: true, skipped: "NO_TARGET_FOUND" }),
    );
  }

  const productId = productIdOverride || target.product_id;

  // 1) نسجل الحدث في funnel
  const { error: insertError } = await supabase
    .from("price_drop_funnel_events")
    .insert({
      store_id: target.store_id,
      campaign_id: target.campaign_id,
      product_id: productId,
      salla_customer_id: sallaCustomerId,
      event_type: eventType,
      cart_id: null,
    });

  if (insertError) {
    console.error("[popup-event] INSERT_FAILED", insertError);
    return withCors(
      req,
      NextResponse.json({ error: "INSERT_FAILED" }, { status: 500 }),
    );
  }

  // 2) أول ظهور للبوب أب → نحدّث الـ target
  if (eventType === "impression" && target.status === "pending") {
    const nowIso = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("price_drop_targets")
      .update({
        onsite_seen_at: nowIso,
        status: "notified", // 👈 أهم سطر
      })
      .eq("id", target.id)
      .eq("store_id", storeId);

    if (updateError) {
      console.error("[popup-event] UPDATE_TARGET_FAILED", updateError);
      // ما نطلع Error للمستخدم، بس نطبع في اللوق
    }
  }

  return withCors(
    req,
    NextResponse.json({ ok: true }),
  );
}
