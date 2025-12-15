// FILE: src/app/api/dashboard/marketing/vehicle/lookup/years/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

export async function GET(req: NextRequest) {
  try {
    const storeId = await getCurrentStoreId();
    const supabase = getSupabaseServerClient();
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const modelId = Number(url.searchParams.get("model_id") || 0);
    if (!modelId) return NextResponse.json({ items: [] });

    let query = supabase
      .from("filter_years")
      .select("id, year")
      .eq("store_id", storeId)
      .eq("model_id", modelId)
      .order("sort_order", { ascending: true })
      .limit(50);

    if (q) query = query.ilike("year", `%${q}%`);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ items: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "lookup failed" }, { status: 500 });
  }
}
