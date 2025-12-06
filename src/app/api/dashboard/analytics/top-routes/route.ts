import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStoreId } from "@/lib/currentStore";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

// توقيت السعودية +3 عن UTC
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

type RouteKey = string;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const storeId = await getCurrentStoreId();
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!storeId || !from || !to) {
      return NextResponse.json(
        { error: "UNAUTHORIZED_OR_MISSING_RANGE" },
        { status: 400 },
      );
    }

    const { fromIso, toIso } = buildLocalKsaDateRange(from, to);

    // 1) نجيب كل search_submit في الفترة
    const { data, error } = await supabase
      .from("widget_events")
      .select("brand_id, model_id, year_id, section_id, keyword_id")
      .eq("store_id", storeId)
      .eq("event_type", "search_submit")
      .gte("created_at", fromIso)
      .lte("created_at", toIso);

    if (error) {
      console.error("top-routes select error", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    const events =
      (data as {
        brand_id: number | null;
        model_id: number | null;
        year_id: number | null;
        section_id: number | null;
        keyword_id: number | null;
      }[]) || [];

    // 2) نعدّ المسارات
    const counts = new Map<
      RouteKey,
      {
        brand_id: number | null;
        model_id: number | null;
        year_id: number | null;
        section_id: number | null;
        keyword_id: number | null;
        count: number;
      }
    >();

    for (const ev of events) {
      const key: RouteKey = [
        ev.brand_id ?? "null",
        ev.model_id ?? "null",
        ev.year_id ?? "null",
        ev.section_id ?? "null",
        ev.keyword_id ?? "null",
      ].join("|");

      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, {
          brand_id: ev.brand_id,
          model_id: ev.model_id,
          year_id: ev.year_id,
          section_id: ev.section_id,
          keyword_id: ev.keyword_id,
          count: 1,
        });
      }
    }

    if (counts.size === 0) {
      return NextResponse.json({
        store_id: storeId,
        from,
        to,
        from_iso: fromIso,
        to_iso: toIso,
        routes: [],
      });
    }

    // 3) نجمع كل الـ IDs ونجيب الأسماء من جداول الفلتر
    const brandIds = new Set<number>();
    const modelIds = new Set<number>();
    const yearIds = new Set<number>();
    const sectionIds = new Set<number>();
    const keywordIds = new Set<number>();

    for (const value of counts.values()) {
      if (value.brand_id != null) brandIds.add(value.brand_id);
      if (value.model_id != null) modelIds.add(value.model_id);
      if (value.year_id != null) yearIds.add(value.year_id);
      if (value.section_id != null) sectionIds.add(value.section_id);
      if (value.keyword_id != null) keywordIds.add(value.keyword_id);
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

    // 4) نبني قائمة المسارات + الأسماء ونرتبها (بدون قص على 20)
    const routes = Array.from(counts.values())
      .map((r) => ({
        brand_id: r.brand_id,
        brand_name:
          r.brand_id != null ? brandMap.get(r.brand_id) ?? "" : "",
        model_id: r.model_id,
        model_name:
          r.model_id != null ? modelMap.get(r.model_id) ?? "" : "",
        year_id: r.year_id,
        year_label:
          r.year_id != null ? yearMap.get(r.year_id) ?? "" : "",
        section_id: r.section_id,
        section_name:
          r.section_id != null ? sectionMap.get(r.section_id) ?? "" : "",
        keyword_id: r.keyword_id,
        keyword_name:
          r.keyword_id != null ? keywordMap.get(r.keyword_id) ?? "" : "",
        searches: r.count,
      }))
      .sort((a, b) => b.searches - a.searches); // فقط ترتيب، بدون .slice

    return NextResponse.json({
      store_id: storeId,
      from,
      to,
      from_iso: fromIso,
      to_iso: toIso,
      routes,
    });
  } catch (err) {
    console.error("top-routes unexpected", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
