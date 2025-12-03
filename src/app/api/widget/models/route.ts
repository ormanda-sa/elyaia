// app/api/widget/models/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(req.url);

    const storeId = searchParams.get("store_id");
    const brandId = searchParams.get("brand_id");

    if (!storeId || !brandId) {
      return NextResponse.json(
        { error: "store_id and brand_id are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("filter_models")
      .select("*")
      .eq("store_id", storeId)
      .eq("brand_id", brandId)
      .order("sort_order", { ascending: true })
      .order("name_ar", { ascending: true });

    if (error) {
      console.error("Error fetching models:", error);
      return NextResponse.json(
        { error: "Failed to fetch models", details: error.message },
        { status: 500 }
      );
    }

    // ✅ نرجّع كمان slug + salla_category_id
    const safeData =
      (data || []).map((row) => ({
        id: row.id,
        name_ar: row.name_ar,
        sort_order: row.sort_order ?? 0,
        salla_model_id: row.salla_model_id ?? null,
        slug: row.slug ?? null,
        salla_category_id: row.salla_category_id ?? null,
      })) || [];

    return NextResponse.json(
      {
        models: safeData,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Unexpected error in /api/widget/models:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err?.message || err) },
      { status: 500 }
    );
  }
}
