import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

const TZ_OFFSET_HOURS = 3;

// from/to = YYYY-MM-DD (محلي) → مدى UTC يغطي اليوم كامل في KSA
function buildLocalKsaDateRange(fromStr: string, toStr: string) {
  const [fy, fm, fd] = fromStr.split("-").map(Number);
  const [ty, tm, td] = toStr.split("-").map(Number);

  const fromUtc = new Date(
    Date.UTC(fy, (fm || 1) - 1, fd || 1, 0 - TZ_OFFSET_HOURS, 0, 0, 0),
  );
  const toUtc = new Date(
    Date.UTC(ty, (tm || 1) - 1, td || 1, 23 - TZ_OFFSET_HOURS, 59, 59, 999),
  );

  return {
    fromIso: fromUtc.toISOString(),
    toIso: toUtc.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const storeId = await getCurrentStoreId();

    if (!storeId) {
      return NextResponse.json(
        { error: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        { error: "from & to are required (YYYY-MM-DD)" },
        { status: 400 },
      );
    }

    // صفحة + حجم الصفحة (server-side pagination)
    const page = Math.max(Number(searchParams.get("page") || "1"), 1);
    const pageSizeRaw = Number(searchParams.get("pageSize") || "20");
    const pageSize = Math.min(Math.max(pageSizeRaw, 10), 100); // بين 10 و 100
    const fromIndex = (page - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;

    const { fromIso, toIso } = buildLocalKsaDateRange(from, to);

    // 1) نجيب أحداث الصفحة الحالية + إجمالي العدد
    const { data, error, count } = await supabase
      .from("widget_events")
      .select(
        `
        id,
        event_type,
        brand_id,
        model_id,
        year_id,
        section_id,
        keyword_id,
        meta,
        created_at
      `,
        { count: "exact" },
      )
      .eq("store_id", storeId)
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: false })
      .range(fromIndex, toIndex);

    if (error) {
      console.error("widget_events analytics error", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    const rows = (data || []) as {
      id: string;
      event_type: string;
      brand_id: number | null;
      model_id: number | null;
      year_id: number | null;
      section_id: number | null;
      keyword_id: number | null;
      meta: any;
      created_at: string;
    }[];

    // 2) نجيب الأسماء للـ IDs اللي ظهرت في الصفحة
    const brandIds = new Set<number>();
    const modelIds = new Set<number>();
    const yearIds = new Set<number>();
    const sectionIds = new Set<number>();
    const keywordIds = new Set<number>();

    for (const r of rows) {
      if (r.brand_id != null) brandIds.add(r.brand_id);
      if (r.model_id != null) modelIds.add(r.model_id);
      if (r.year_id != null) yearIds.add(r.year_id);
      if (r.section_id != null) sectionIds.add(r.section_id);
      if (r.keyword_id != null) keywordIds.add(r.keyword_id);
    }

    const [brandsRes, modelsRes, yearsRes, sectionsRes, keywordsRes] =
      await Promise.all([
        brandIds.size
          ? supabase
              .from("filter_brands")
              .select("id, name_ar")
              .in("id", Array.from(brandIds))
          : Promise.resolve({ data: [], error: null }),
        modelIds.size
          ? supabase
              .from("filter_models")
              .select("id, name_ar")
              .in("id", Array.from(modelIds))
          : Promise.resolve({ data: [], error: null }),
        yearIds.size
          ? supabase
              .from("filter_years")
              .select("id, year")
              .in("id", Array.from(yearIds))
          : Promise.resolve({ data: [], error: null }),
        sectionIds.size
          ? supabase
              .from("filter_sections")
              .select("id, name_ar")
              .in("id", Array.from(sectionIds))
          : Promise.resolve({ data: [], error: null }),
        keywordIds.size
          ? supabase
              .from("filter_keywords")
              .select("id, name_ar")
              .in("id", Array.from(keywordIds))
          : Promise.resolve({ data: [], error: null }),
      ]);

    const brandMap = new Map<number, string>();
    const modelMap = new Map<number, string>();
    const yearMap = new Map<number, string>();
    const sectionMap = new Map<number, string>();
    const keywordMap = new Map<number, string>();

    for (const row of (brandsRes.data as any[]) || []) {
      brandMap.set(row.id, row.name_ar);
    }
    for (const row of (modelsRes.data as any[]) || []) {
      modelMap.set(row.id, row.name_ar);
    }
    for (const row of (yearsRes.data as any[]) || []) {
      yearMap.set(row.id, row.year);
    }
    for (const row of (sectionsRes.data as any[]) || []) {
      sectionMap.set(row.id, row.name_ar);
    }
    for (const row of (keywordsRes.data as any[]) || []) {
      keywordMap.set(row.id, row.name_ar);
    }

    const events = rows.map((row) => ({
      id: row.id,
      event_type: row.event_type,
      brand_id: row.brand_id,
      model_id: row.model_id,
      year_id: row.year_id,
      section_id: row.section_id,
      keyword_id: row.keyword_id,
      brand_name:
        row.brand_id != null ? brandMap.get(row.brand_id) ?? null : null,
      model_name:
        row.model_id != null ? modelMap.get(row.model_id) ?? null : null,
      year_label:
        row.year_id != null ? yearMap.get(row.year_id) ?? null : null,
      section_name:
        row.section_id != null
          ? sectionMap.get(row.section_id) ?? null
          : null,
      keyword_name:
        row.keyword_id != null
          ? keywordMap.get(row.keyword_id) ?? null
          : null,
      page_url: row.meta?.page_url ?? row.meta?.referer ?? null,
      target_url: row.meta?.target_url ?? null,
      user_agent: row.meta?.user_agent ?? null,
      created_at: row.created_at,
    }));

    const total = count ?? events.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      store_id: storeId,
      from,
      to,
      page,
      pageSize,
      total,
      totalPages,
      events,
    });
  } catch (err: any) {
    console.error("/api/dashboard/analytics/events error", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err?.message || err) },
      { status: 500 },
    );
  }
}
