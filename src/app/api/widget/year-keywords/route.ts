import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("store_id");
  const yearId = req.nextUrl.searchParams.get("year_id");
  if (!storeId || !yearId || !/^\d+$/.test(yearId)) {
    return NextResponse.json({ error: "Valid store_id and year_id are required" }, { status: 400, headers: CORS_HEADERS });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500, headers: CORS_HEADERS });
  }

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await supabase
      .from("filter_year_keywords")
      .select("*")
      .eq("store_id", storeId)
      .eq("year_id", Number(yearId))
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true });

    if (error) {
      console.error("[WIDGET_YEAR_KEYWORDS_ERROR]", error);
      return NextResponse.json({ error: "Failed to load year keywords" }, { status: 500, headers: CORS_HEADERS });
    }
    return NextResponse.json({ keywords: data ?? [] }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[WIDGET_YEAR_KEYWORDS_UNEXPECTED]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: CORS_HEADERS });
  }
}
