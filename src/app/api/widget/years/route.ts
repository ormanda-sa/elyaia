// app/api/widget/years/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(req.url);

    const storeId = searchParams.get("store_id");
    const modelId = searchParams.get("model_id");

    if (!storeId || !modelId) {
      return NextResponse.json(
        { error: "store_id and model_id are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("filter_years")
      // نرجّع: id الداخلي + رقم السنة + رقم السنة في سلة + الترتيب
      .select("id, year, salla_year_id, sort_order")
      .eq("store_id", storeId)
      .eq("model_id", Number(modelId))
      .order("sort_order", { ascending: true })
      .order("year", { ascending: true });

    if (error) {
      console.error("Error fetching years:", error);
      return NextResponse.json(
        { error: "Failed to fetch years" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        years: data ?? [],
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Unexpected error in /api/widget/years:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
