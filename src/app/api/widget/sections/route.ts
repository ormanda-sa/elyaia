// app/api/widget/sections/route.ts
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

    // استعلام بسيط وواضح، مع إرجاع كل شيء للتشخيص
    const { data, error } = await supabase
      .from("filter_sections")
      .select("*")                 // أولاً نجيب كل الأعمدة عشان ما نتعلق على عمود ناقص
      .eq("store_id", storeId)     // فلترة بالـ store_id اللي في سكرينك
      .order("id", { ascending: true });

    if (error) {
      console.error("Error fetching sections:", error);
      // نرجّع الخطأ عشان تشوفه في الـ Response
      return NextResponse.json(
        { error: "Failed to fetch sections", details: error.message },
        { status: 500 }
      );
    }

    // عشان الواجهة: نحولها لصيغة نظيفة (id + name_ar + slug + أرقام سلة)
    const sections = (data || []).map((row: any) => ({
      id: row.id,
      name_ar: row.name_ar,
      slug: row.slug,
      salla_section_id: row.salla_section_id ?? null,
      salla_category_id: row.salla_category_id ?? null,
      sort_order: row.sort_order ?? 0,
    }));

    return NextResponse.json(
      { sections },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Unexpected error in /api/widget/sections:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err?.message || err) },
      { status: 500 }
    );
  }
}
