// FILE: src/app/(admin)/api/dashboard/price-drop/track-view/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { withCors, handleOptions } from "../cors";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

type Body = {
  store_id: string;
  session_key?: string | null;

  product_id: string;
  product_title?: string | null;
  product_url?: string | null;
  current_price?: number | null;
  product_image_url?: string | null;

  salla_customer_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
};

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServerClient();

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return withCors(
      req,
      NextResponse.json({ error: "INVALID_JSON" }, { status: 400 }),
    );
  }

  const {
    store_id,
    session_key,
    product_id,
    product_title,
    product_url,
    current_price,
    product_image_url,
    salla_customer_id,
    customer_name,
    customer_phone,
    customer_email,
  } = body;

  if (!store_id || !product_id) {
    return withCors(
      req,
      NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 }),
    );
  }

  const client_ip =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    null;
  const user_agent = req.headers.get("user-agent") || null;

  const { error } = await supabase.from("price_drop_product_views").insert({
    store_id,
    product_id,
    product_title,
    product_url,
    current_price,
    product_image_url,
    salla_customer_id,
    customer_name,
    customer_phone,
    customer_email,
    client_ip,
    user_agent,
    session_id: session_key || null,
  });

  if (error) {
    console.error("[price-drop track-view] INSERT_FAILED", error);
    return withCors(
      req,
      NextResponse.json({ error: "DB_ERROR" }, { status: 500 }),
    );
  }

  return withCors(
    req,
    NextResponse.json({ ok: true }, { status: 200 }),
  );
}
