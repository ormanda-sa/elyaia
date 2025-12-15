// FILE: src/app/api/dashboard/marketing/vehicle/lookup/brands/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

export async function GET(req: NextRequest) {
  try {
    const storeId = await getCurrentStoreId();
    const supabase = getSupabaseServerClient();
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();

    let query = supabase
      .from("filter_brands")
      .select("id, name_ar")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true })
      .limit(20);

    if (q) query = query.ilike("name_ar", `%${q}%`);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ items: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "lookup failed" }, { status: 500 });
  }
}
