// FILE: src/app/(admin)/api/dashboard/widget-insights-queries/brands/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

// GET /api/dashboard/widget-insights-queries/brands
export async function GET(_req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("filter_brands")
    .select("name_ar")
    .eq("store_id", storeId)
    .order("name_ar", { ascending: true });

  if (error) {
    console.error("[widget-insights-queries/brands] error", error);
    return NextResponse.json(
      { error: "FAILED_TO_FETCH_BRANDS" },
      { status: 500 },
    );
  }

  const brands = (data || []).map((b) => b.name_ar);
  return NextResponse.json({ data: brands });
}
