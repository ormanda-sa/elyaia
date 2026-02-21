// src/app/api/widget-data-v2/[storeId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ storeId: string }> },
) {
  const { storeId: raw } = await context.params; // "STORE_ID" أو "STORE_ID.json"
  const storeId = raw.replace(/\.json$/i, "");

  if (!storeId) {
    return NextResponse.json(
      { error: "store_id is required" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("[WIDGET_DATA_V2_ENV_ERROR] Missing Supabase env vars");
    return NextResponse.json(
      { error: "Supabase env vars are missing" },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  try {
    // 1) نجيب snapshot القديم من widget_snapshots زي ما هو
    const { data, error } = await supabase
      .from("widget_snapshots")
      .select("data")
      .eq("store_id", storeId)
      .single();

    if (error || !data) {
      console.error("[WIDGET_DATA_V2_NOT_FOUND]", error);
      return NextResponse.json(
        { error: "Snapshot not found" },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    const payload: any = data.data || {};

    // 2) نجيب الكلمات الجديدة من جدول filter_year_keywords (حسب store_id)
    const { data: yearKeywords, error: yearKeywordsError } = await supabase
      .from("filter_year_keywords")
      .select("*")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (yearKeywordsError) {
      console.error("[WIDGET_DATA_V2_YEAR_KEYWORDS_ERROR]", yearKeywordsError);
      return NextResponse.json(
        { error: "Failed to load year keywords" },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    // 3) نفس الـ payload بالضبط، فقط استبدال keywords
    const payloadV2 = {
      ...payload,
      keywords: yearKeywords ?? [],
    };

    return new NextResponse(JSON.stringify(payloadV2), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    console.error("[WIDGET_DATA_V2_UNEXPECTED]", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

// معالجة preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}