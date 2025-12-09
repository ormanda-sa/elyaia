// FILE: src/app/api/widget/price-drop/onsite/event/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const widgetSecret = process.env.WIDGET_EVENT_SECRET!;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

type EventType = "impression" | "click" | "add_to_cart" | "order";

type Body = {
  store_id: string;
  campaign_id: number;
  product_id: string;
  target_id: number;
  salla_customer_id: string | null;
  event_type: EventType;
  cart_id?: number | null;
  order_id?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    // 🔐 تأكيد أن الطلب جاي من الويجت
    const authHeader = req.headers.get("x-widget-secret");
    if (!authHeader || authHeader !== widgetSecret) {
      return NextResponse.json({ error: "UNAUTHORIZED_WIDGET" }, { status: 401 });
    }

    const json = (await req.json()) as Partial<Body>;

    const {
      store_id,
      campaign_id,
      product_id,
      target_id,
      salla_customer_id,
      event_type,
      cart_id,
      order_id,
    } = json;

    if (
      !store_id ||
      !campaign_id ||
      !product_id ||
      !target_id ||
      !event_type
    ) {
      return NextResponse.json(
        { error: "MISSING_REQUIRED_FIELDS" },
        { status: 400 },
      );
    }

    if (!["impression", "click", "add_to_cart", "order"].includes(event_type)) {
      return NextResponse.json(
        { error: "INVALID_EVENT_TYPE" },
        { status: 400 },
      );
    }

    // 1) نسجل الحدث في جدول price_drop_funnel_events
    const { error: insertError } = await supabase.from("price_drop_funnel_events").insert({
      store_id,
      campaign_id,
      product_id,
      salla_customer_id,
      event_type,
      cart_id: cart_id ?? null,
    });

    if (insertError) {
      console.error("FUNNEL_EVENT_INSERT_ERROR", insertError);
      return NextResponse.json(
        { error: "FUNNEL_EVENT_INSERT_FAILED" },
        { status: 500 },
      );
    }

    // 2) نحدّث price_drop_targets حسب نوع الحدث
    if (event_type === "impression") {
      // أول ظهور للبوب أب → نثبت وقت المشاهدة لو فاضي
      const { error: updateError } = await supabase
        .from("price_drop_targets")
        .update({ onsite_seen_at: new Date().toISOString() })
        .eq("id", target_id)
        .is("onsite_seen_at", null);

      if (updateError) {
        console.error("TARGET_UPDATE_IMPRESSION_ERROR", updateError);
      }
    } else if (event_type === "add_to_cart") {
      const { error: updateError } = await supabase
        .from("price_drop_targets")
        .update({ added_to_cart_at: new Date().toISOString() })
        .eq("id", target_id)
        .is("added_to_cart_at", null);

      if (updateError) {
        console.error("TARGET_UPDATE_ADD_TO_CART_ERROR", updateError);
      }
    } else if (event_type === "order") {
      // هنا نربطه بالطلب ونعتبره تحويل On-site
      const { error: updateError } = await supabase
        .from("price_drop_targets")
        .update({
          converted_at: new Date().toISOString(),
          conversion_order_id: order_id ?? null,
          conversion_source: "onsite",
          status: "converted",
        })
        .eq("id", target_id)
        .is("converted_at", null);

      if (updateError) {
        console.error("TARGET_UPDATE_ORDER_ERROR", updateError);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("ONSITE_EVENT_FATAL", err);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
