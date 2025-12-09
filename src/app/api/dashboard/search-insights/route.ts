// src/app/api/dashboard/search-insights/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const storeId = await getCurrentStoreId();

    if (!storeId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q) {
      return NextResponse.json(
        { error: "QUERY_REQUIRED" },
        { status: 400 },
      );
    }

    // نحاول أولاً نطابق كلمة مفتاحية (filter_keywords)
    const { data: keywordMatches, error: kwError } = await supabase
      .from("filter_keywords")
      .select(
        `
        id,
        name_ar,
        model_id,
        section_id,
        filter_models!filter_keywords_model_id_fkey (
          id,
          name_ar,
          brand_id,
          filter_brands!filter_models_brand_id_fkey (
            id,
            name_ar
          )
        ),
        filter_sections!filter_keywords_section_id_fkey (
          id,
          name_ar
        )
      `,
      )
      .eq("store_id", storeId)
      .ilike("name_ar", `%${q}%`)
      .order("sort_order", { ascending: true })
      .limit(1);

    if (kwError) {
      console.error("search-insights keyword error:", kwError);
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // لو لقينا كلمة، نعطي تحليلها
    if (keywordMatches && keywordMatches.length > 0) {
      const kw = keywordMatches[0] as any; // TS تخفيض

      const brand = kw.filter_models?.filter_brands;
      const model = kw.filter_models;
      const section = kw.filter_sections;

      // إحصائيات من widget_events على keyword_id
      const { data: events, error: evError } = await supabase
        .from("widget_events")
        .select("id, created_at")
        .eq("store_id", storeId)
        .eq("keyword_id", kw.id)
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (evError) {
        console.error("search-insights events keyword error:", evError);
      }

      const totalSearches = events ? events.length : 0;

      // توزيع حسب اليوم (إثنين، ثلاثاء...)
      const dayCounts: Record<string, number> = {};
      if (events) {
        for (const ev of events) {
          const d = new Date(ev.created_at);
          const day = d.toLocaleDateString("ar-EG", { weekday: "long" }); // الجمعة، السبت...
          dayCounts[day] = (dayCounts[day] || 0) + 1;
        }
      }
      let topDay: string | null = null;
      let topDayCount = 0;
      for (const [day, count] of Object.entries(dayCounts)) {
        if (count > topDayCount) {
          topDay = day;
          topDayCount = count;
        }
      }

      // نشوف هل فيه route مضبوط مرتبط بهذه الكلمة
      const { data: routes, error: routeError } = await supabase
        .from("store_filter_routes")
        .select("id, target_url")
        .eq("store_id", storeId)
        .eq("keyword_id", kw.id)
        .limit(1);

      if (routeError) {
        console.error("search-insights route error:", routeError);
      }

      const hasRoute = routes && routes.length > 0;
      const route = hasRoute ? routes[0] : null;

      return NextResponse.json({
        type: "keyword",
        query: q,
        keyword: {
          id: kw.id,
          name_ar: kw.name_ar,
          model_id: model?.id || kw.model_id,
          model_name: model?.name_ar || null,
          brand_id: brand?.id || null,
          brand_name: brand?.name_ar || null,
          section_id: section?.id || kw.section_id,
          section_name: section?.name_ar || null,
        },
        stats: {
          total_searches_30d: totalSearches,
          top_day: topDay,
        },
        route: {
          exists: hasRoute,
          target_url: route?.target_url || null,
        },
      });
    }

    // لو ما لقينا keyword، نحاول نطابق موديل
    const { data: modelMatches, error: modelError } = await supabase
      .from("filter_models")
      .select(
        `
        id,
        name_ar,
        brand_id,
        filter_brands!filter_models_brand_id_fkey (
          id,
          name_ar
        )
      `,
      )
      .eq("store_id", storeId)
      .ilike("name_ar", `%${q}%`)
      .order("sort_order", { ascending: true })
      .limit(1);

    if (modelError) {
      console.error("search-insights model error:", modelError);
    }

    if (modelMatches && modelMatches.length > 0) {
      const m = modelMatches[0] as any;
      const brand = m.filter_brands;

      // إحصائيات على الموديل من widget_events
      const { data: events, error: evError } = await supabase
        .from("widget_events")
        .select("id, created_at")
        .eq("store_id", storeId)
        .eq("model_id", m.id)
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (evError) {
        console.error("search-insights events model error:", evError);
      }

      const totalSearches = events ? events.length : 0;

      const dayCounts: Record<string, number> = {};
      if (events) {
        for (const ev of events) {
          const d = new Date(ev.created_at);
          const day = d.toLocaleDateString("ar-EG", { weekday: "long" });
          dayCounts[day] = (dayCounts[day] || 0) + 1;
        }
      }
      let topDay: string | null = null;
      let topDayCount = 0;
      for (const [day, count] of Object.entries(dayCounts)) {
        if (count > topDayCount) {
          topDay = day;
          topDayCount = count;
        }
      }

      return NextResponse.json({
        type: "model",
        query: q,
        model: {
          id: m.id,
          name_ar: m.name_ar,
          brand_id: brand?.id || m.brand_id,
          brand_name: brand?.name_ar || null,
        },
        stats: {
          total_searches_30d: totalSearches,
          top_day: topDay,
        },
      });
    }

    // لو لا keyword ولا model
    return NextResponse.json({
      type: "none",
      query: q,
      message: "لم يتم العثور على كلمة أو موديل مطابق.",
    });
  } catch (err) {
    console.error("search-insights GET unexpected error:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
