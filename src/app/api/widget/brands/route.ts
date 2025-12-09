// app/api/widget/brands/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("store_id");

    if (!storeId) {
      return NextResponse.json(
        { error: "store_id is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("filter_brands")
      // نرجّع: id الداخلي + الاسم + slug + رقم الشركة في سلة + ترتيب
      .select("id, name_ar, slug, salla_company_id, sort_order")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true })
      .order("name_ar", { ascending: true });

    if (error) {
      console.error("Error fetching brands:", error);
      return NextResponse.json(
        { error: "Failed to fetch brands" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        brands: data ?? [],
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Unexpected error in /api/widget/brands:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
