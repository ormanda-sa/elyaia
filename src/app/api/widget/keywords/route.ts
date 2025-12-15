// app/api/widget/keywords/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(req.url);

    const storeId   = searchParams.get("store_id");
    const sectionId = searchParams.get("section_id");
    const modelId   = searchParams.get("model_id");

    if (!storeId || !sectionId || !modelId) {
      return NextResponse.json(
        { error: "store_id, section_id and model_id are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("filter_keywords")
      // id الداخلي + الاسم + slug + الترتيب
      .select("id, name_ar, slug, sort_order")
      .eq("store_id", storeId)
      .eq("section_id", Number(sectionId))
      .eq("model_id", Number(modelId))
      .order("sort_order", { ascending: true })
      .order("name_ar", { ascending: true });

    if (error) {
      console.error("Error fetching keywords:", error);
      return NextResponse.json(
        { error: "Failed to fetch keywords" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { keywords: data ?? [] },
      { status: 200 }
    );
  } catch (err) {
    console.error("Unexpected error in /api/widget/keywords:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
