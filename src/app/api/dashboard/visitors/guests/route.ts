import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

type GuestBaseRow = {
  store_id: string;
  visitor_id: string;
  last_seen_at: string;
  page_views_count: number;
};

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const storeId = await getCurrentStoreId();
    if (!storeId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const url = new URL(req.url);

    const limit = Math.min(Number(url.searchParams.get("limit") || 50) || 50, 200);
    const cursorLastSeen = url.searchParams.get("cursor_last_seen");
    const cursorVisitorId = url.searchParams.get("cursor_visitor_id");

    const from = url.searchParams.get("from"); // YYYY-MM-DD
    const to = url.searchParams.get("to"); // YYYY-MM-DD
    const fromTs = from ? `${from}T00:00:00.000Z` : null;
    const toTs = to ? `${to}T23:59:59.999Z` : null;

    // 1) صفحة الضيوف (RPC)
    const { data, error } = await supabase.rpc("visitors_guests_page", {
      p_store_id: storeId,
      p_limit: limit + 1,
      p_cursor_last_seen: cursorLastSeen,
      p_cursor_visitor_id: cursorVisitorId,
      p_from: fromTs,
      p_to: toTs,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data || []) as any[];
    const hasMore = rows.length > limit;
    const base: GuestBaseRow[] = (hasMore ? rows.slice(0, limit) : rows).map((r: any) => ({
      store_id: String(r.store_id),
      visitor_id: String(r.visitor_id),
      last_seen_at: r.last_seen_at,
      page_views_count: Number(r.page_views_count || 0),
    }));

    const nextCursor =
      hasMore && base.length
        ? {
            cursor_last_seen: base[base.length - 1].last_seen_at,
            cursor_visitor_id: base[base.length - 1].visitor_id,
          }
        : null;

    if (base.length === 0) {
      return NextResponse.json({ ok: true, items: [], nextCursor });
    }

    // 2) اجلب إشارات آخر 7 أيام لكل visitor_id في الصفحة (دفعة واحدة)
    const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const visitorIds = base.map((x) => x.visitor_id);

    const { data: sigRows, error: sErr } = await supabase
      .from("visitor_vehicle_signals")
      .select("visitor_id, brand_id, model_id, year_id, occurred_at")
      .eq("store_id", storeId)
      .in("visitor_id", visitorIds)
      .gte("occurred_at", since7);

    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

    // helper: most frequent
    function pickBest(vals: (number | null)[]) {
      const m = new Map<number, number>();
      for (const v of vals) {
        if (v == null) continue;
        const n = Number(v);
        m.set(n, (m.get(n) || 0) + 1);
      }
      let best: number | null = null;
      let bestC = 0;
      for (const [k, c] of m.entries()) {
        if (c > bestC) {
          bestC = c;
          best = k;
        }
      }
      return { best, bestC };
    }

    // group signals by visitor
    const byVisitor = new Map<string, any[]>();
    for (const r of sigRows || []) {
      const vid = String((r as any).visitor_id);
      if (!byVisitor.has(vid)) byVisitor.set(vid, []);
      byVisitor.get(vid)!.push(r);
    }

    // 3) احسب best brand/model/year لكل زائر + اجمع year_ids/model_ids للـ fill
    const bestMap = new Map<
      string,
      {
        brand_id: number | null;
        model_id: number | null;
        year_id: number | null;
        signals_7d: number;
        last_signal_at: string | null;
      }
    >();

    const needYearIds = new Set<number>();
    const needModelIds = new Set<number>();

    for (const vid of visitorIds) {
      const list = byVisitor.get(vid) || [];
      if (list.length === 0) {
        bestMap.set(vid, {
          brand_id: null,
          model_id: null,
          year_id: null,
          signals_7d: 0,
          last_signal_at: null,
        });
        continue;
      }

      const brands = list.map((x: any) => (x.brand_id != null ? Number(x.brand_id) : null));
      const models = list.map((x: any) => (x.model_id != null ? Number(x.model_id) : null));
      const years = list.map((x: any) => (x.year_id != null ? Number(x.year_id) : null));

      const b = pickBest(brands);
      const m = pickBest(models);
      const y = pickBest(years);

      const last = list.reduce((max: string, r: any) => {
        const t = new Date(r.occurred_at).toISOString();
        return t > max ? t : max;
      }, "1970-01-01T00:00:00.000Z");

      const brand_id = b.best;
      const model_id = m.best;
      const year_id = y.best;

      if (year_id != null) needYearIds.add(year_id);
      if (model_id != null) needModelIds.add(model_id);

      bestMap.set(vid, {
        brand_id,
        model_id,
        year_id,
        signals_7d: list.length,
        last_signal_at: last === "1970-01-01T00:00:00.000Z" ? null : last,
      });
    }

    // 4) year -> model (دفعة واحدة)
    const yearToModel = new Map<number, number>();
    if (needYearIds.size > 0) {
      const { data: yRows, error: yErr } = await supabase
        .from("filter_years")
        .select("id, model_id")
        .eq("store_id", storeId)
        .in("id", Array.from(needYearIds));

      if (yErr) return NextResponse.json({ error: yErr.message }, { status: 500 });

      (yRows || []).forEach((r: any) => {
        if (r?.id != null && r?.model_id != null) {
          yearToModel.set(Number(r.id), Number(r.model_id));
          needModelIds.add(Number(r.model_id));
        }
      });
    }

    // 5) model -> brand (دفعة واحدة)
    const modelToBrand = new Map<number, number>();
    if (needModelIds.size > 0) {
      const { data: mRows, error: mErr } = await supabase
        .from("filter_models")
        .select("id, brand_id, name_ar")
        .eq("store_id", storeId)
        .in("id", Array.from(needModelIds));

      if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

      (mRows || []).forEach((r: any) => {
        if (r?.id != null && r?.brand_id != null) modelToBrand.set(Number(r.id), Number(r.brand_id));
      });

      // keep model names map
      var modelName = new Map<number, string>();
      (mRows || []).forEach((r: any) => {
        if (r?.id != null && r?.name_ar) modelName.set(Number(r.id), String(r.name_ar));
      });

      // 6) brand names (دفعة واحدة)
      const brandIds = new Set<number>();
      for (const mid of needModelIds) {
        const bid = modelToBrand.get(mid);
        if (bid != null) brandIds.add(bid);
      }
      for (const v of bestMap.values()) {
        if (v.brand_id != null) brandIds.add(v.brand_id);
      }

      const brandName = new Map<number, string>();
      if (brandIds.size > 0) {
        const { data: bRows, error: bErr } = await supabase
          .from("filter_brands")
          .select("id, name_ar")
          .eq("store_id", storeId)
          .in("id", Array.from(brandIds));

        if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });

        (bRows || []).forEach((r: any) => {
          if (r?.id != null && r?.name_ar) brandName.set(Number(r.id), String(r.name_ar));
        });
      }

      // 7) year text (دفعة واحدة)
      const yearText = new Map<number, string>();
      if (needYearIds.size > 0) {
        const { data: yyRows, error: yyErr } = await supabase
          .from("filter_years")
          .select("id, year")
          .eq("store_id", storeId)
          .in("id", Array.from(needYearIds));

        if (yyErr) return NextResponse.json({ error: yyErr.message }, { status: 500 });

        (yyRows || []).forEach((r: any) => {
          if (r?.id != null && r?.year != null) yearText.set(Number(r.id), String(r.year));
        });
      }

      // 8) fill year->model->brand ثم ادمج للـ items
      const items = base.map((g) => {
        const best = bestMap.get(g.visitor_id)!;

        let brand_id = best.brand_id ?? null;
        let model_id = best.model_id ?? null;
        let year_id = best.year_id ?? null;

        // year -> model
        if (model_id == null && year_id != null) {
          model_id = yearToModel.get(year_id) ?? null;
        }

        // model -> brand
        if (brand_id == null && model_id != null) {
          brand_id = modelToBrand.get(model_id) ?? null;
        }

        return {
          ...g,
          vehicle_brand_id: brand_id,
          vehicle_model_id: model_id,
          vehicle_year_id: year_id,
          vehicle_brand_name: brand_id != null ? brandName.get(brand_id) || null : null,
          vehicle_model_name: model_id != null ? modelName.get(model_id) || null : null,
          vehicle_year_text: year_id != null ? yearText.get(year_id) || null : null,
          vehicle_signals_7d: best.signals_7d,
          vehicle_last_signal_at: best.last_signal_at,
        };
      });

      return NextResponse.json({ ok: true, items, nextCursor });
    }

    // لو ما عندنا موديلات أصلًا
    const items = base.map((g) => ({
      ...g,
      vehicle_brand_name: null,
      vehicle_model_name: null,
      vehicle_year_text: null,
      vehicle_signals_7d: 0,
    }));

    return NextResponse.json({ ok: true, items, nextCursor });
  } catch (e: any) {
    return NextResponse.json(
      { error: "SERVER_ERROR", details: String(e?.message || e) },
      { status: 500 },
    );
  }
}
