// src/app/(admin)/api/dashboard/price-drop/track-view/route.ts
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
    session_key,
    product_id,
    product_title,
    product_url,
    current_price,
    salla_customer_id,
    customer_name,
    customer_phone,
    customer_email,
  } = body as {
    store_id?: string;
    session_key?: string | null;
    product_id?: number | string;
    product_title?: string;
    product_url?: string;
    current_price?: number;
    salla_customer_id?: string | null;
    customer_name?: string | null;
    customer_phone?: string | null;
    customer_email?: string | null;
  };

  if (!store_id || !product_id) {
    return withCors(
      req,
      NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 }),
    );
  }

  const forwardedFor = req.headers.get("x-forwarded-for");
  const clientIp = forwardedFor?.split(",")[0]?.trim() ?? null;

  await supabase.from("price_drop_product_views").insert({
    store_id,
    product_id,
    product_title,
    product_url,
    current_price,
    salla_customer_id: salla_customer_id || null,
    customer_name: customer_name || null,
    customer_phone: customer_phone || null,
    customer_email: customer_email || null,
    client_ip: clientIp,
    user_agent: req.headers.get("user-agent"),
  });

  return withCors(req, NextResponse.json({ ok: true }));
}
