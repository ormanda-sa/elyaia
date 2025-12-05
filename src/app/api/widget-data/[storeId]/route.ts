// src/app/api/widget-data/[storeId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ storeId: string }> },
) {
  const { storeId: raw } = await context.params; // "STORE_ID" أو "STORE_ID.json"
  const storeId = raw.replace(/\.json$/i, "");

  if (!storeId) {
    return NextResponse.json(
      { error: "store_id is required" },
      { status: 400 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("[WIDGET_DATA_ENV_ERROR] Missing Supabase env vars");
    return NextResponse.json(
      { error: "Supabase env vars are missing" },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  try {
    const { data, error } = await supabase
      .from("widget_snapshots")
      .select("data")
      .eq("store_id", storeId)
      .single();

    if (error || !data) {
      console.error("[WIDGET_DATA_NOT_FOUND]", error);
      return NextResponse.json(
        { error: "Snapshot not found" },
        { status: 404 },
      );
    }

    const payload = data.data;

    return new NextResponse(JSON.stringify(payload), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    console.error("[WIDGET_DATA_UNEXPECTED]", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
