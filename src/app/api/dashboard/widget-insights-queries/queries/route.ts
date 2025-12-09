// FILE: src/app/(admin)/api/dashboard/widget-insights-queries/queries/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

// GET /api/dashboard/widget-insights-queries/queries?days=30&page=1&pageSize=50
export async function GET(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const { searchParams } = new URL(req.url);

  const storeId = await getCurrentStoreId();
  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // الأيام: 1 / 10 / 30 / 60 / 90 / 180
  const daysParam = searchParams.get("days");
  const days = parseInt(daysParam || "30", 10) || 30;

  // Pagination
  const pageParam = searchParams.get("page");
  const pageSizeParam = searchParams.get("pageSize");

  const page = Math.max(parseInt(pageParam || "1", 10) || 1, 1);
  const pageSizeRaw = parseInt(pageSizeParam || "50", 10) || 50;
  const pageSize = Math.min(Math.max(pageSizeRaw, 10), 200); // بين 10 و 200

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const since = new Date();
  since.setDate(since.getDate() - days);

  // نجيب البيانات + العدد الكلي
  const { data, count, error } = await supabase
    .from("widget_insights_queries_with_gaps")
    .select(
      `
      store_id,
      query,
      normalized_query,
      keyword_id,
      model_id,
      year_id,
      keyword_name,
      model_name,
      year_value,
      brand_name,
      count,
      first_seen_at,
      last_seen_at,
      missing_models
    `,
      { count: "exact" },
    )
    .eq("store_id", storeId)
    .gte("last_seen_at", since.toISOString())
    .order("count", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[widget-insights-queries/queries] error", error);
    return NextResponse.json(
      { error: "FAILED_TO_FETCH_QUERIES" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: data || [],
    meta: {
      total: count || 0,
      page,
      pageSize,
      days,
    },
  });
}
