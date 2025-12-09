// FILE: src/app/(admin)/api/dashboard/widget-insights-queries/coverage/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

// GET /api/dashboard/widget-insights-queries/coverage?brand=تويوتا&keyword=شمعة
export async function GET(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const { searchParams } = new URL(req.url);

  const storeId = await getCurrentStoreId();
  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const brand = (searchParams.get("brand") || "").trim();
  const keyword = (searchParams.get("keyword") || "").trim();

  // لو ما فيه ماركة أو كلمة → رجّع فاضي
  if (!brand || !keyword) {
    return NextResponse.json({ data: [] });
  }

  // ننادي الـ function اللي سويناها في SQL
  const { data, error } = await supabase.rpc(
    "widget_insights_missing_models_for_keyword",
    {
      p_store_id: storeId,
      p_brand_name: brand,
      p_keyword: keyword,
    },
  );

  if (error) {
    console.error("[coverage] rpc error", error);
    return NextResponse.json({ data: [], error: "FAILED_TO_FETCH" }, {
      status: 200,
    });
  }

  // data هنا هي [{ brand_name, model_name }, ...] نفس الـ function
  return NextResponse.json({ data: data || [] });
}
