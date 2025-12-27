import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

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

function bump(map: Map<any, number>, key: any, n: number) {
  map.set(key, (map.get(key) || 0) + n);
}

function pickTop(map: Map<any, number>) {
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
}

type CustomerRow = Record<string, any> & {
  store_id: string;
  salla_customer_id: string;
  last_seen_at: string;
  visitor_id?: string | null;

  vehicle_brand_name?: string | null;
  vehicle_model_name?: string | null;
  vehicle_year_text?: string | null;
  vehicle_signals_7d?: number | null;
};

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const storeId = await getCurrentStoreId();
    if (!storeId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const url = new URL(req.url);

    const q = (url.searchParams.get("q") || "").trim();
    const limit = Math.min(Number(url.searchParams.get("limit") || 50) || 50, 200);

    const cursorLastSeen = url.searchParams.get("cursor_last_seen");
    const cursorCustomerId = url.searchParams.get("cursor_customer_id");

    // ✅ نفس فلترة الصفحة (from/to)
    const from = url.searchParams.get("from"); // YYYY-MM-DD
    const to = url.searchParams.get("to"); // YYYY-MM-DD
    const fromTs = from ? `${from}T00:00:00.000Z` : null;
    const toTs = to ? `${to}T23:59:59.999Z` : null;

    const rawLimit = Math.min(limit * 3 + 1, 800);

    let query = supabase
      .from("customer_journey_summary")
      .select("*")
      .eq("store_id", storeId)
      .order("last_seen_at", { ascending: false })
      .order("salla_customer_id", { ascending: false })
      .limit(rawLimit);

    if (fromTs) query = query.gte("last_seen_at", fromTs);
    if (toTs) query = query.lte("last_seen_at", toTs);

    if (q) {
      if (/^\d+$/.test(q)) query = query.eq("salla_customer_id", q);
      else {
        query = query.or(
          `customer_name.ilike.%${q}%,customer_email.ilike.%${q}%,customer_phone.ilike.%${q}%`,
        );
      }
    }

    if (cursorLastSeen && cursorCustomerId) {
      query = query.or(
        `and(last_seen_at.lt.${cursorLastSeen}),and(last_seen_at.eq.${cursorLastSeen},salla_customer_id.lt.${cursorCustomerId})`,
      );
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data || []) as CustomerRow[];

    // ✅ Dedup: عميل واحد = صف واحد
    const seen = new Set<string>();
    const unique: CustomerRow[] = [];
    for (const r of rows) {
      const cid = String((r as any).salla_customer_id || "").trim();
      if (!cid) continue;
      if (seen.has(cid)) continue;
      seen.add(cid);
      unique.push(r);
      if (unique.length >= limit + 1) break;
    }

    const hasMore = unique.length > limit;
    const baseItems = hasMore ? unique.slice(0, limit) : unique;

    const nextCursor =
      hasMore && baseItems.length
        ? {
            cursor_last_seen: baseItems[baseItems.length - 1].last_seen_at,
            cursor_customer_id: baseItems[baseItems.length - 1].salla_customer_id,
          }
        : null;

    if (baseItems.length === 0) {
      return NextResponse.json({ ok: true, items: baseItems, nextCursor });
    }

    const customerIds = baseItems
      .map((c) => String(c.salla_customer_id || "").trim())
      .filter(Boolean);

    // روابط customer -> visitor_id
    const { data: links, error: lErr } = await supabase
      .from("visitors_customers")
      .select("salla_customer_id, visitor_id")
      .eq("store_id", storeId)
      .in("salla_customer_id", customerIds);

    if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 });

    const visitorsByCustomer = new Map<string, string[]>();
    const visitorIdsAllSet = new Set<string>();

    for (const r of links || []) {
      const cid = String((r as any).salla_customer_id || "").trim();
      const vid = String((r as any).visitor_id || "").trim();
      if (!cid || !vid) continue;

      if (!visitorsByCustomer.has(cid)) visitorsByCustomer.set(cid, []);
      visitorsByCustomer.get(cid)!.push(vid);
      visitorIdsAllSet.add(vid);
    }

    // ✅ Fallback: visitor_id من customer_journey_summary نفسه
    for (const c of baseItems) {
      const vid = String((c as any).visitor_id || "").trim();
      if (vid) visitorIdsAllSet.add(vid);
    }

    const visitorIdsAll = Array.from(visitorIdsAllSet);
    if (visitorIdsAll.length === 0) {
      const items = baseItems.map((c) => ({
        ...c,
        vehicle_brand_name: null,
        vehicle_model_name: null,
        vehicle_year_text: null,
        vehicle_signals_7d: 0,
      }));
      return NextResponse.json({ ok: true, items, nextCursor });
    }

    // ✅ نفس نافذة التاريخ بدل 7 أيام ثابتة
    const since = fromTs ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const pvLimit = Math.min(visitorIdsAll.length * 60, 40000);

    let pvQ = supabase
      .from("visitors_page_views")
      .select("visitor_id, occurred_at, path")
      .eq("store_id", storeId)
      .in("visitor_id", visitorIdsAll)
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .limit(pvLimit);

    if (toTs) pvQ = pvQ.lte("occurred_at", toTs);

    const { data: pvRows, error: pvErr } = await pvQ;
    if (pvErr) return NextResponse.json({ error: pvErr.message }, { status: 500 });

    // visitor -> slugs + dedup 5 دقائق
    const pvByVisitor = new Map<string, { occurred_at: string; slug: string }[]>();
    for (const r of pvRows || []) {
      const vid = String((r as any).visitor_id || "").trim();
      const occurred_at = iso(String((r as any).occurred_at || ""));
      const slug = extractCategorySlug((r as any).path);
      if (!vid || !slug) continue;

      if (!pvByVisitor.has(vid)) pvByVisitor.set(vid, []);
      pvByVisitor.get(vid)!.push({ occurred_at, slug });
    }

    const dedupByVisitor = new Map<string, { occurred_at: string; slug: string }[]>();
    const allSlugs = new Set<string>();

    for (const vid of visitorIdsAll) {
      const list = pvByVisitor.get(vid) || [];
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
      const items = baseItems.map((c) => ({
        ...c,
        vehicle_brand_name: null,
        vehicle_model_name: null,
        vehicle_year_text: null,
        vehicle_signals_7d: 0,
      }));
      return NextResponse.json({ ok: true, items, nextCursor });
    }

    const slugs = Array.from(allSlugs);

    const [yearsRes, modelsSlugRes, brandsSlugRes] = await Promise.all([
      supabase.from("filter_years").select("id, year, model_id, slug").eq("store_id", storeId).in("slug", slugs),
      supabase.from("filter_models").select("id, name_ar, brand_id, slug").eq("store_id", storeId).in("slug", slugs),
      supabase.from("filter_brands").select("id, name_ar, slug").eq("store_id", storeId).in("slug", slugs),
    ]);

    if (yearsRes.error) return NextResponse.json({ error: yearsRes.error.message }, { status: 500 });
    if (modelsSlugRes.error) return NextResponse.json({ error: modelsSlugRes.error.message }, { status: 500 });
    if (brandsSlugRes.error) return NextResponse.json({ error: brandsSlugRes.error.message }, { status: 500 });

    const years = yearsRes.data || [];
    const modelsBySlug = modelsSlugRes.data || [];
    const brandsBySlug = brandsSlugRes.data || [];

    const yearBySlug = new Map<string, any>();
    years.forEach((y: any) => yearBySlug.set(y.slug, y));

    const modelBySlug = new Map<string, any>();
    modelsBySlug.forEach((m: any) => modelBySlug.set(m.slug, m));

    const brandBySlug = new Map<string, any>();
    brandsBySlug.forEach((b: any) => brandBySlug.set(b.slug, b));

    const yearTextById = new Map<number, string>();
    years.forEach((y: any) => y?.id != null && yearTextById.set(Number(y.id), String(y.year)));

    const yearModelIds = Array.from(new Set(years.map((y: any) => y.model_id).filter(Boolean))) as number[];
    const { data: modelsById, error: mIdErr } = yearModelIds.length
      ? await supabase.from("filter_models").select("id, name_ar, brand_id").eq("store_id", storeId).in("id", yearModelIds)
      : { data: [], error: null as any };

    if (mIdErr) return NextResponse.json({ error: mIdErr.message }, { status: 500 });

    const modelIdMap = new Map<number, any>();
    (modelsById || []).forEach((m: any) => modelIdMap.set(Number(m.id), m));

    const brandIds = new Set<number>();
    modelsBySlug.forEach((m: any) => m.brand_id != null && brandIds.add(Number(m.brand_id)));
    (modelsById || []).forEach((m: any) => m.brand_id != null && brandIds.add(Number(m.brand_id)));
    brandsBySlug.forEach((b: any) => b.id != null && brandIds.add(Number(b.id)));

    const { data: brandsById, error: bErr } = brandIds.size
      ? await supabase.from("filter_brands").select("id, name_ar").eq("store_id", storeId).in("id", Array.from(brandIds))
      : { data: [], error: null as any };

    if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });

    const brandNameById = new Map<number, string>();
    (brandsById || []).forEach((b: any) => brandNameById.set(Number(b.id), String(b.name_ar)));

    type VisitorVehicle = { brand_name: string | null; model_name: string | null; year_text: string | null; signals: number };
    const vehicleByVisitor = new Map<string, VisitorVehicle>();

    for (const vid of visitorIdsAll) {
      const list = dedupByVisitor.get(vid) || [];
      if (list.length === 0) {
        vehicleByVisitor.set(vid, { brand_name: null, model_name: null, year_text: null, signals: 0 });
        continue;
      }

      const scoreYear = new Map<string, number>();
      const scoreModel = new Map<string, number>();
      const scoreBrand = new Map<number, number>();
      let signals = 0;

      for (const x of list) {
        const slug = x.slug;

        const y = yearBySlug.get(slug);
        if (y?.id && y?.model_id) {
          const m = modelIdMap.get(Number(y.model_id));
          const bn = m?.brand_id != null ? brandNameById.get(Number(m.brand_id)) : null;
          if (m?.id && bn) {
            signals++;
            bump(scoreYear, `${m.brand_id}:${m.id}:${y.id}`, 10);
            bump(scoreModel, `${m.brand_id}:${m.id}`, 9);
            bump(scoreBrand, Number(m.brand_id), 3);
            continue;
          }
        }

        const m2 = modelBySlug.get(slug);
        if (m2?.id && m2?.brand_id) {
          const bn = brandNameById.get(Number(m2.brand_id)) || null;
          if (bn) {
            signals++;
            bump(scoreModel, `${m2.brand_id}:${m2.id}`, 6);
            bump(scoreBrand, Number(m2.brand_id), 2);
            continue;
          }
        }

        const b2 = brandBySlug.get(slug);
        if (b2?.id) {
          signals++;
          bump(scoreBrand, Number(b2.id), 2);
        }
      }

      if (signals === 0) {
        vehicleByVisitor.set(vid, { brand_name: null, model_name: null, year_text: null, signals: 0 });
        continue;
      }

      const topY = pickTop(scoreYear);
      const topM = pickTop(scoreModel);
      const topB = pickTop(scoreBrand);

      // tiers
      if (topY.bestKey && topY.best >= 10) {
        const [bid, mid, yid] = String(topY.bestKey).split(":").map(Number);
        vehicleByVisitor.set(vid, {
          brand_name: brandNameById.get(bid) ?? null,
          model_name: modelIdMap.get(mid)?.name_ar ?? null,
          year_text: yearTextById.get(yid) ?? null,
          signals,
        });
        continue;
      }

      if (topM.bestKey && topM.best >= 6) {
        const [bid, mid] = String(topM.bestKey).split(":").map(Number);
        vehicleByVisitor.set(vid, {
          brand_name: brandNameById.get(bid) ?? null,
          model_name: modelIdMap.get(mid)?.name_ar ?? null,
          year_text: null,
          signals,
        });
        continue;
      }

      if (topB.bestKey && topB.best >= 2) {
        const bid = Number(topB.bestKey);
        vehicleByVisitor.set(vid, { brand_name: brandNameById.get(bid) ?? null, model_name: null, year_text: null, signals });
        continue;
      }

      vehicleByVisitor.set(vid, { brand_name: null, model_name: null, year_text: null, signals: 0 });
    }

    const finalItems = baseItems.map((c) => {
      const cid = String(c.salla_customer_id || "").trim();
      const vids = Array.from(
        new Set(
          [
            ...(visitorsByCustomer.get(cid) || []),
            String((c as any).visitor_id || "").trim(),
          ].filter(Boolean),
        ),
      );

      let best: VisitorVehicle = { brand_name: null, model_name: null, year_text: null, signals: 0 };
      for (const vId of vids) {
        const vv = vehicleByVisitor.get(vId);
        if (!vv) continue;
        if ((vv.signals || 0) > (best.signals || 0)) best = vv;
      }

      return {
        ...c,
        vehicle_brand_name: best.brand_name,
        vehicle_model_name: best.model_name,
        vehicle_year_text: best.year_text,
        vehicle_signals_7d: best.signals || 0,
      };
    });

    return NextResponse.json({ ok: true, items: finalItems, nextCursor });
  } catch (e: any) {
    return NextResponse.json({ error: "SERVER_ERROR", details: String(e?.message || e) }, { status: 500 });
  }
}
