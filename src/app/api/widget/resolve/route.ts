// app/api/widget/resolve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(req.url);

    const storeId = searchParams.get("store_id");
    const brandId = searchParams.get("brand_id");
    const modelId = searchParams.get("model_id");
    const yearId = searchParams.get("year_id");
    const sectionId = searchParams.get("section_id");
    const keywordId = searchParams.get("keyword_id");

    if (
      !storeId ||
      !brandId ||
      !modelId ||
      !yearId ||
      !sectionId ||
      !keywordId
    ) {
      return NextResponse.json(
        {
          error:
            "store_id, brand_id, model_id, year_id, section_id, keyword_id are required",
        },
        { status: 400 }
      );
    }

    const [brandRes, modelRes, yearRes, sectionRes, keywordRes] =
      await Promise.all([
        supabase
          .from("filter_brands")
          .select("id, name_ar, slug")
          .eq("store_id", storeId)
          .eq("id", Number(brandId))
          .maybeSingle(),
        supabase
          .from("filter_models")
          .select("id, name_ar, slug")
          .eq("store_id", storeId)
          .eq("id", Number(modelId))
          .maybeSingle(),
        supabase
          .from("filter_years")
          .select("id, year, slug")
          .eq("store_id", storeId)
          .eq("id", Number(yearId))
          .maybeSingle(),
        supabase
          .from("filter_sections")
          .select("id, name_ar, slug")
          .eq("store_id", storeId)
          .eq("id", Number(sectionId))
          .maybeSingle(),
        supabase
          .from("filter_keywords")
          .select("id, name_ar, slug")
          .eq("store_id", storeId)
          .eq("id", Number(keywordId))
          .maybeSingle(),
      ]);

    const anyError =
      brandRes.error ||
      modelRes.error ||
      yearRes.error ||
      sectionRes.error ||
      keywordRes.error;

    if (anyError) {
      console.error("Error in resolve pieces:", anyError);
      return NextResponse.json(
        { error: "Failed to resolve pieces" },
        { status: 500 }
      );
    }

    if (
      !brandRes.data ||
      !modelRes.data ||
      !yearRes.data ||
      !sectionRes.data ||
      !keywordRes.data
    ) {
      return NextResponse.json({ found: false }, { status: 200 });
    }

    return NextResponse.json(
      {
        found: true,
        brand: brandRes.data,
        model: modelRes.data,
        year: yearRes.data,
        section: sectionRes.data,
        keyword: keywordRes.data,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Unexpected error in /api/widget/resolve:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
