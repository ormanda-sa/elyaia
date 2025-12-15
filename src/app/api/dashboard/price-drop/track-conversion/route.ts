// app/api/price-drop/track-conversion/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServerClient();

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const {
    store_id,
    product_id,
    salla_customer_id,
    customer_email,
    order_id,
  } = body as {
    store_id?: string;
    product_id?: string;
    salla_customer_id?: string | null;
    customer_email?: string | null;
    order_id?: string | null;
  };

  if (!store_id || !product_id || (!salla_customer_id && !customer_email)) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  const nowIso = new Date().toISOString();

  let query = supabase
    .from("price_drop_targets")
    .update({
      converted_at: nowIso,
      conversion_order_id: order_id ?? null,
      status: "converted",
    })
    .eq("store_id", store_id)
    .eq("product_id", product_id)
    .is("converted_at", null)
    .eq("status", "notified");

  if (salla_customer_id) {
    query = query.eq("salla_customer_id", salla_customer_id);
  } else if (customer_email) {
    query = query.eq("customer_email", customer_email);
  }

  const { error } = await query;

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
