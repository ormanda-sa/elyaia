import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

export async function GET(_req: NextRequest) {
  try {
    const storeId = await getCurrentStoreId();
    const supabase = getSupabaseServerClient();

    const { data: brands, error: e1 } = await supabase
      .from("filter_brands")
      .select("id, name_ar, sort_order")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (e1) throw e1;

    const { data: models, error: e2 } = await supabase
      .from("filter_models")
      .select("id, brand_id, name_ar, sort_order")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (e2) throw e2;

    const { data: years, error: e3 } = await supabase
      .from("filter_years")
      .select("id, model_id, year, sort_order")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (e3) throw e3;

    // Build tree
    const modelsByBrand = new Map<number, any[]>();
    for (const m of models ?? []) {
      const arr = modelsByBrand.get(m.brand_id) ?? [];
      arr.push(m);
      modelsByBrand.set(m.brand_id, arr);
    }

    const yearsByModel = new Map<number, any[]>();
    for (const y of years ?? []) {
      const arr = yearsByModel.get(y.model_id) ?? [];
      arr.push(y);
      yearsByModel.set(y.model_id, arr);
    }

    const tree = (brands ?? []).map((b) => ({
      id: b.id,
      name_ar: b.name_ar,
      models: (modelsByBrand.get(b.id) ?? []).map((m) => ({
        id: m.id,
        name_ar: m.name_ar,
        years: (yearsByModel.get(m.id) ?? []).map((y) => ({
          id: y.id,
          year: y.year,
        })),
      })),
    }));

    return NextResponse.json({ items: tree });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to load scopes" },
      { status: 500 }
    );
  }
}
