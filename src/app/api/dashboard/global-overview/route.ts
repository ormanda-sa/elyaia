// src/app/api/dashboard/global-overview/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();

    const now = new Date();
    const thirtyDaysAgoDate = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000,
    );
    const thirtyDaysAgo = thirtyDaysAgoDate.toISOString();

    const { data: events, error } = await supabase
      .from("widget_events")
      .select(
        "id, created_at, event_type, brand_id, model_id, year_id, section_id, keyword_id",
      )
      .gte("created_at", thirtyDaysAgo);

    if (error) {
      console.error("global-overview events error:", error);
      return NextResponse.json(
        { error: "FAILED_EVENTS" },
        { status: 500 },
      );
    }

    const allEvents = events || [];
    const totalEvents = allEvents.length;

    const searchEvents = allEvents.filter(
      (e: any) => e.event_type === "search_submit",
    );
    const totalSearchSubmits = searchEvents.length;

    const selectEvents = allEvents.filter((e: any) =>
      [
        "brand_select",
        "model_select",
        "year_select",
        "section_select",
        "keyword_select",
      ].includes(e.event_type),
    );

    const searchRate =
      totalEvents > 0 ? (totalSearchSubmits / totalEvents) * 100 : 0;

    // ================ توزيع حسب اليوم بالعربي (أيام الأسبوع) ================
    const dayCounts: Record<string, number> = {};
    for (const e of searchEvents) {
      const d = new Date((e as any).created_at);
      const day = d.toLocaleDateString("ar-EG", { weekday: "long" });
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    }

    let topDay: string | null = null;
    let topDayCount = 0;
    for (const [day, count] of Object.entries(dayCounts)) {
      if (count > topDayCount) {
        topDay = day;
        topDayCount = count;
      }
    }

    const WEEK_ORDER = [
      "الإثنين",
      "الثلاثاء",
      "الأربعاء",
      "الخميس",
      "الجمعة",
      "السبت",
      "الأحد",
    ];

    const weekdaySeries = WEEK_ORDER.map((dayAr) => ({
      day_ar: dayAr,
      count: dayCounts[dayAr] || 0,
    }));

    // ================ توزيع شهري لآخر 30 يوم (daily_series كامل) ================
    type DailyPoint = {
      date: string; // YYYY-MM-DD
      label: string; // "03"
      count: number;
    };

    // أولاً: نحسب الأيام اللي فيها بيانات
    const dailyMap = new Map<string, number>();

    for (const e of searchEvents) {
      const d = new Date((e as any).created_at);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
    }

    // ثانياً: نبني مصفوفة كل يوم من بداية الفترة إلى الآن حتى لو 0
    const daily_series: DailyPoint[] = [];
    const cursor = new Date(thirtyDaysAgoDate.getTime());

    // نصفر الوقت عشان ما يتلخبط التاريخ
    cursor.setHours(0, 0, 0, 0);
    const end = new Date(now.getTime());
    end.setHours(0, 0, 0, 0);

    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10);
      const count = dailyMap.get(key) || 0;

      const label = new Intl.DateTimeFormat("ar-EG", {
        day: "2-digit",
      }).format(cursor);

      daily_series.push({ date: key, label, count });

      // اليوم اللي بعده
      cursor.setDate(cursor.getDate() + 1);
    }

    // ================ Top Routes مثل ما عطيناك قبل ================
    type RouteKey = string;
    type RouteAgg = {
      key: RouteKey;
      brand_id: number | null;
      model_id: number | null;
      year_id: number | null;
      section_id: number | null;
      keyword_id: number | null;
      count: number;
    };

    const routeMap = new Map<RouteKey, RouteAgg>();

    for (const e of searchEvents) {
      const ev = e as any;
      const keyParts = [
        ev.brand_id || "null",
        ev.model_id || "null",
        ev.year_id || "null",
        ev.section_id || "null",
        ev.keyword_id || "null",
      ];
      const key = keyParts.join("|");

      if (!routeMap.has(key)) {
        routeMap.set(key, {
          key,
          brand_id: ev.brand_id ?? null,
          model_id: ev.model_id ?? null,
          year_id: ev.year_id ?? null,
          section_id: ev.section_id ?? null,
          keyword_id: ev.keyword_id ?? null,
          count: 0,
        });
      }
      routeMap.get(key)!.count += 1;
    }

    const routesAgg = Array.from(routeMap.values()).sort(
      (a, b) => b.count - a.count,
    );
    const topRoutesAgg = routesAgg.slice(0, 3);

    const brandIds = Array.from(
      new Set(
        topRoutesAgg
          .map((r) => r.brand_id)
          .filter((id): id is number => id !== null),
      ),
    );
    const modelIds = Array.from(
      new Set(
        topRoutesAgg
          .map((r) => r.model_id)
          .filter((id): id is number => id !== null),
      ),
    );
    const yearIds = Array.from(
      new Set(
        topRoutesAgg
          .map((r) => r.year_id)
          .filter((id): id is number => id !== null),
      ),
    );
    const sectionIds = Array.from(
      new Set(
        topRoutesAgg
          .map((r) => r.section_id)
          .filter((id): id is number => id !== null),
      ),
    );
    const keywordIds = Array.from(
      new Set(
        topRoutesAgg
          .map((r) => r.keyword_id)
          .filter((id): id is number => id !== null),
      ),
    );

    const [brandsRes, modelsRes, yearsRes, sectionsRes, keywordsRes] =
      await Promise.all([
        brandIds.length
          ? supabase
              .from("filter_brands")
              .select("id, name_ar")
              .in("id", brandIds)
          : Promise.resolve({ data: [], error: null }),
        modelIds.length
          ? supabase
              .from("filter_models")
              .select("id, name_ar")
              .in("id", modelIds)
          : Promise.resolve({ data: [], error: null }),
        yearIds.length
          ? supabase
              .from("filter_years")
              .select("id, year")
              .in("id", yearIds)
          : Promise.resolve({ data: [], error: null }),
        sectionIds.length
          ? supabase
              .from("filter_sections")
              .select("id, name_ar")
              .in("id", sectionIds)
          : Promise.resolve({ data: [], error: null }),
        keywordIds.length
          ? supabase
              .from("filter_keywords")
              .select("id, name_ar")
              .in("id", keywordIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

    const brandsMap = new Map(
      (brandsRes.data || []).map((b: any) => [b.id, b.name_ar]),
    );
    const modelsMap = new Map(
      (modelsRes.data || []).map((m: any) => [m.id, m.name_ar]),
    );
    const yearsMap = new Map(
      (yearsRes.data || []).map((y: any) => [y.id, y.year]),
    );
    const sectionsMap = new Map(
      (sectionsRes.data || []).map((s: any) => [s.id, s.name_ar]),
    );
    const keywordsMap = new Map(
      (keywordsRes.data || []).map((k: any) => [k.id, k.name_ar]),
    );

    const topRoutes = topRoutesAgg.map((r) => ({
      brand_name: r.brand_id ? brandsMap.get(r.brand_id) || "—" : "—",
      model_name: r.model_id ? modelsMap.get(r.model_id) || "—" : "—",
      year_label: r.year_id ? yearsMap.get(r.year_id) || "—" : "—",
      section_name: r.section_id
        ? sectionsMap.get(r.section_id) || "—"
        : "—",
      keyword_name: r.keyword_id
        ? keywordsMap.get(r.keyword_id) || "—"
        : "—",
      count: r.count,
    }));

    // ================== الـ Response النهائي ==================
    return NextResponse.json({
      range: {
        from: thirtyDaysAgo,
        to: now.toISOString(),
      },
      totals: {
        total_events: totalEvents,
        total_search_submits: totalSearchSubmits,
        select_events_count: selectEvents.length,
        search_rate: searchRate,
        top_day: topDay,
        top_day_count: topDayCount,
      },
      weekday_series: weekdaySeries,
      daily_series,
      top_routes: topRoutes,
    });
  } catch (err) {
    console.error("global-overview unexpected error:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
