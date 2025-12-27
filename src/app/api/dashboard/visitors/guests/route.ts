import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

type GuestBaseRow = {
  store_id: string;
  visitor_id: string;
  last_seen_at: string;
  page_views_count: number;
};

<<<<<<< HEAD
=======
function extractCategorySlug(path?: string | null) {
  if (!path) return null;
  const m = path.match(/\/category\/([^/?#]+)/i);
  if (!m?.[1]) return null;
  try {
    return decodeURIComponent(m[1]).trim();
  } catch {
    return String(m[1]).trim();
  }
}

function iso(dt: string) {
  try {
    return new Date(dt).toISOString();
  } catch {
    return dt;
  }
}

type Cand =
  | {
      kind: "year";
      brand_id: number;
      model_id: number;
      year_id: number;
      brand_name: string;
      model_name: string;
      year_text: string;
      occurred_at: string;
    }
  | {
      kind: "model";
      brand_id: number;
      model_id: number;
      brand_name: string;
      model_name: string;
      occurred_at: string;
    }
  | {
      kind: "brand";
      brand_id: number;
      brand_name: string;
      occurred_at: string;
    };

>>>>>>> b8e0e03 (init)
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
<<<<<<< HEAD
=======

>>>>>>> b8e0e03 (init)
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

<<<<<<< HEAD
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
=======
    // ====== ✅ استنتاج السيارة من page views (آخر 7 أيام) ======
    const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const visitorIds = base.map((x) => x.visitor_id);

    // حد ديناميكي
    const pvLimit = Math.min(visitorIds.length * 60, 20000);

    const { data: pvRows, error: pvErr } = await supabase
      .from("visitors_page_views")
      .select("visitor_id, occurred_at, path")
      .eq("store_id", storeId)
      .in("visitor_id", visitorIds)
      .gte("occurred_at", since7)
      .order("occurred_at", { ascending: false })
      .limit(pvLimit);

    if (pvErr) return NextResponse.json({ error: pvErr.message }, { status: 500 });

    // 3) Group by visitor + استخراج slugs
    const pvByVisitor = new Map<string, { occurred_at: string; slug: string }[]>();
    for (const r of pvRows || []) {
      const vid = String((r as any).visitor_id || "");
      const occurred_at = iso(String((r as any).occurred_at || ""));
      const slug = extractCategorySlug((r as any).path);
      if (!vid || !slug) continue;

      if (!pvByVisitor.has(vid)) pvByVisitor.set(vid, []);
      pvByVisitor.get(vid)!.push({ occurred_at, slug });
    }

    // 4) Dedup نفس slug خلال 5 دقائق + تجميع slugs للـ lookup
    const allSlugs = new Set<string>();
    const dedupByVisitor = new Map<string, { occurred_at: string; slug: string }[]>();

    for (const vid of visitorIds) {
      const list = pvByVisitor.get(vid) || [];
      if (list.length === 0) {
        dedupByVisitor.set(vid, []);
        continue;
      }

      const lastSeen = new Map<string, number>();
      const dedup: { occurred_at: string; slug: string }[] = [];

      for (const x of list) {
        const t = Date.parse(x.occurred_at);
        const prev = lastSeen.get(x.slug);
        if (prev != null && prev - t < 5 * 60 * 1000) continue;
        lastSeen.set(x.slug, t);
        dedup.push(x);
        allSlugs.add(x.slug);
      }

      dedupByVisitor.set(vid, dedup);
    }

    if (allSlugs.size === 0) {
      const items = base.map((g) => ({
        ...g,
        vehicle_brand_name: null,
        vehicle_model_name: null,
        vehicle_year_text: null,
        vehicle_signals_7d: 0,
      }));
      return NextResponse.json({ ok: true, items, nextCursor });
    }

    const slugs = Array.from(allSlugs);

    // 5) Lookup Batch: years + models + brands by slug
    const [yearsRes, modelsSlugRes, brandsSlugRes] = await Promise.all([
      supabase
        .from("filter_years")
        .select("id, year, model_id, slug")
        .eq("store_id", storeId)
        .in("slug", slugs),
      supabase
        .from("filter_models")
        .select("id, name_ar, brand_id, slug")
        .eq("store_id", storeId)
        .in("slug", slugs),
      supabase
        .from("filter_brands")
        .select("id, name_ar, slug")
        .eq("store_id", storeId)
        .in("slug", slugs),
    ]);

    if (yearsRes.error) return NextResponse.json({ error: yearsRes.error.message }, { status: 500 });
    if (modelsSlugRes.error) return NextResponse.json({ error: modelsSlugRes.error.message }, { status: 500 });
    if (brandsSlugRes.error) return NextResponse.json({ error: brandsSlugRes.error.message }, { status: 500 });

    const years = yearsRes.data || [];
    const modelsBySlug = modelsSlugRes.data || [];
    const brandsBySlug = brandsSlugRes.data || [];

    const yearBySlug = new Map<string, any>();
    for (const y of years) yearBySlug.set(y.slug, y);

    const modelBySlug = new Map<string, any>();
    for (const m of modelsBySlug) modelBySlug.set(m.slug, m);

    const brandBySlug = new Map<string, any>();
    for (const b of brandsBySlug) brandBySlug.set(b.slug, b);

    // 6) year -> model (by id) + brand names
    const yearModelIds = Array.from(new Set(years.map((y) => y.model_id).filter(Boolean))) as number[];
    const { data: modelsById, error: mIdErr } = yearModelIds.length
      ? await supabase
          .from("filter_models")
          .select("id, name_ar, brand_id")
          .eq("store_id", storeId)
          .in("id", yearModelIds)
      : { data: [], error: null as any };

    if (mIdErr) return NextResponse.json({ error: mIdErr.message }, { status: 500 });

    const modelIdMap = new Map<number, any>();
    for (const m of modelsById || []) modelIdMap.set(Number(m.id), m);

    const brandIds = new Set<number>();
    for (const m of modelsBySlug) if (m.brand_id != null) brandIds.add(Number(m.brand_id));
    for (const m of modelsById || []) if ((m as any).brand_id != null) brandIds.add(Number((m as any).brand_id));
    for (const b of brandsBySlug) if (b.id != null) brandIds.add(Number(b.id));

    const { data: brandsById, error: bErr } = brandIds.size
      ? await supabase
          .from("filter_brands")
          .select("id, name_ar")
          .eq("store_id", storeId)
          .in("id", Array.from(brandIds))
      : { data: [], error: null as any };

    if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });

    const brandNameById = new Map<number, string>();
    for (const b of brandsById || []) brandNameById.set(Number(b.id), String(b.name_ar));

    // 7) scoring per visitor (tiers: اعرض حتى لو مرة)
    const resultByVisitor = new Map<
      string,
      { brand_name: string | null; model_name: string | null; year_text: string | null; signals_7d: number }
    >();

    const bump = (map: Map<any, number>, key: any, n: number) =>
      map.set(key, (map.get(key) || 0) + n);

    const pickTop = (map: Map<any, number>) => {
      let bestKey: any = null;
      let best = -1;
      let second = -1;
      for (const [k, v] of map.entries()) {
        if (v > best) {
          second = best;
          best = v;
          bestKey = k;
        } else if (v > second) {
          second = v;
        }
      }
      return { bestKey, best, second };
    };

    for (const vid of visitorIds) {
      const list = dedupByVisitor.get(vid) || [];
      if (list.length === 0) {
        resultByVisitor.set(vid, { brand_name: null, model_name: null, year_text: null, signals_7d: 0 });
        continue;
      }

      const candidates: Cand[] = [];

      for (const x of list) {
        const slug = x.slug;

        // year
        const y = yearBySlug.get(slug);
        if (y?.id && y?.model_id) {
          const m = modelIdMap.get(Number(y.model_id));
          if (m?.id && m?.brand_id) {
            const bn = brandNameById.get(Number(m.brand_id));
            if (bn) {
              candidates.push({
                kind: "year",
                brand_id: Number(m.brand_id),
                model_id: Number(m.id),
                year_id: Number(y.id),
                brand_name: bn,
                model_name: String(m.name_ar),
                year_text: String(y.year),
                occurred_at: x.occurred_at,
              });
              continue;
            }
          }
        }

        // model
        const m2 = modelBySlug.get(slug);
        if (m2?.id && m2?.brand_id) {
          const bn = brandNameById.get(Number(m2.brand_id));
          if (bn) {
            candidates.push({
              kind: "model",
              brand_id: Number(m2.brand_id),
              model_id: Number(m2.id),
              brand_name: bn,
              model_name: String(m2.name_ar),
              occurred_at: x.occurred_at,
            });
            continue;
          }
        }

        // brand
        const b2 = brandBySlug.get(slug);
        if (b2?.id) {
          candidates.push({
            kind: "brand",
            brand_id: Number(b2.id),
            brand_name: String(b2.name_ar),
            occurred_at: x.occurred_at,
          });
        }
      }

      if (candidates.length === 0) {
        resultByVisitor.set(vid, { brand_name: null, model_name: null, year_text: null, signals_7d: 0 });
        continue;
      }

      const scoreYear = new Map<string, number>();
      const scoreModel = new Map<string, number>();
      const scoreBrand = new Map<number, number>();

      for (const c of candidates) {
        if (c.kind === "year") {
          bump(scoreYear, `${c.brand_id}:${c.model_id}:${c.year_id}`, 10);
          bump(scoreModel, `${c.brand_id}:${c.model_id}`, 9);
          bump(scoreBrand, c.brand_id, 3);
        } else if (c.kind === "model") {
          bump(scoreModel, `${c.brand_id}:${c.model_id}`, 6);
          bump(scoreBrand, c.brand_id, 2);
        } else {
          bump(scoreBrand, c.brand_id, 2);
        }
      }

      const topY = pickTop(scoreYear);
      const topM = pickTop(scoreModel);
      const topB = pickTop(scoreBrand);

      const signals_7d = candidates.length;

      // ✅ tiers
      if (topY.bestKey && topY.best >= 10) {
        const [bid, mid, yid] = String(topY.bestKey).split(":").map(Number);
        const any = candidates.find(
          (c) => c.kind === "year" && c.brand_id === bid && c.model_id === mid && c.year_id === yid,
        ) as any;

        resultByVisitor.set(vid, {
          brand_name: any?.brand_name ?? null,
          model_name: any?.model_name ?? null,
          year_text: any?.year_text ?? null,
          signals_7d,
>>>>>>> b8e0e03 (init)
        });
        continue;
      }

<<<<<<< HEAD
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
=======
      if (topM.bestKey && topM.best >= 6) {
        const [bid, mid] = String(topM.bestKey).split(":").map(Number);
        const any = candidates.find(
          (c) => (c.kind === "model" || c.kind === "year") && c.brand_id === bid && c.model_id === mid,
        ) as any;

        resultByVisitor.set(vid, {
          brand_name: any?.brand_name ?? null,
          model_name: any?.model_name ?? null,
          year_text: null,
          signals_7d,
        });
        continue;
      }

      if (topB.bestKey && topB.best >= 2) {
        const bid = Number(topB.bestKey);
        resultByVisitor.set(vid, {
          brand_name: brandNameById.get(bid) ?? null,
          model_name: null,
          year_text: null,
          signals_7d,
        });
        continue;
      }

      resultByVisitor.set(vid, { brand_name: null, model_name: null, year_text: null, signals_7d: 0 });
    }

    const items = base.map((g) => {
      const v = resultByVisitor.get(g.visitor_id) || {
        brand_name: null,
        model_name: null,
        year_text: null,
        signals_7d: 0,
      };

      return {
        ...g,
        vehicle_brand_name: v.brand_name,
        vehicle_model_name: v.model_name,
        vehicle_year_text: v.year_text,
        vehicle_signals_7d: v.signals_7d,
      };
    });
>>>>>>> b8e0e03 (init)

    return NextResponse.json({ ok: true, items, nextCursor });
  } catch (e: any) {
    return NextResponse.json(
      { error: "SERVER_ERROR", details: String(e?.message || e) },
      { status: 500 },
    );
  }
}
