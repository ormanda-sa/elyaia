import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function cleanStr(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s === "undefined" || s === "null") return null;
  return s;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as any;

    const store_id = cleanStr(body.store_id);
    const visitor_id = cleanStr(body.visitor_id);
    const salla_customer_id = cleanStr(body.salla_customer_id);

    // بيانات اختيارية للعميل
    const customer_name = cleanStr(body.customer_name);
    const customer_email = cleanStr(body.customer_email);
    const customer_phone = cleanStr(body.customer_phone);

    if (!store_id || !visitor_id || !salla_customer_id) {
      return NextResponse.json(
        { ok: false, error: "BAD_REQUEST", details: "store_id, visitor_id, salla_customer_id are required" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    // Upsert على (store_id + salla_customer_id + visitor_id)
    const { error } = await supabase
      .from("visitors_customers")
      .upsert(
        {
          store_id,
          salla_customer_id,
          visitor_id,
          customer_name,
          customer_email,
          customer_phone,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "store_id,salla_customer_id,visitor_id" },
      );

    if (error) {
      return NextResponse.json(
        { ok: false, error: "DB_ERROR", details: error.message, code: error.code },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200, headers: CORS_HEADERS });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", details: String(err?.message || err) },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
