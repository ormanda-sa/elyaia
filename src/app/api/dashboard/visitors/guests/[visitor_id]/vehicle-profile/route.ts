import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

function extractCategorySlug(path?: string | null) {
  if (!path) return null;
  const m = path.match(/\/category\/([^/?#]+)/i);
  if (!m?.[1]) return null;
  try { return decodeURIComponent(m[1]).trim(); } catch { return String(m[1]).trim(); }
}
function iso(dt: string) {
  try { return new Date(dt).toISOString(); } catch { return dt; }
}
function safeMaxIso(a: string, b: string) { return a > b ? a : b; }

type Profile = {
  visitor_id: string;
  brand_id: number | null;
  model_id: number | null;
  year_id: number | null;
  brand_name: string | null;
  model_name: string | null;
  year_text: string | null;
  signals_7d: number;
  last_signal_at: string | null;
  confidence?: "high" | "medium" | "low";
  score?: number;
  reasons?: string[];
};

export async function GET(req: NextRequest, ctx: { params: Promise<{ visitor_id: string }> }) {
  try {
    const supabase = getSupabaseServerClient();
    const storeId = await getCurrentStoreId();
    if (!storeId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const { visitor_id } = await ctx.params;
    const visitorId = String(visitor_id || "").trim();
    if (!visitorId) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const fromTs = from ? `${from}T00:00:00.000Z` : null;
    const toTs = to ? `${to}T23:59:59.999Z` : null;

    const days = Math.min(Number(url.searchParams.get("days") || 30) || 30, 30);
    const fallbackSince = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const since = fromTs ?? fallbackSince;

    const limit = Math.min(Number(url.searchParams.get("limit") || 2000) || 2000, 2000);

    let q = supabase
      .from("visitors_page_views")
      .select("occurred_at,path,page_url")
      .eq("store_id", storeId)
      .eq("visitor_id", visitorId)
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .limit(limit);

    if (toTs) q = q.lte("occurred_at", toTs);

    const { data: views, error: vErr } = await q;
    if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 });

    const raw = (views || [])
      .map((v: any) => ({
        occurred_at: iso(v.occurred_at),
        slug: extractCategorySlug(v.path),
      }))
      .filter((x) => Boolean(x.slug));

    if (raw.length === 0) return NextResponse.json({ ok: true, profile: null });

    // Dedup
    const dedup: { slug: string; occurred_at: string }[] = [];
    const lastSeen = new Map<string, number>();
    for (const x of raw) {
      const t = Date.parse(x.occurred_at);
      const prev = lastSeen.get(x.slug as string);
      if (prev != null && prev - t < 5 * 60 * 1000) continue;
      lastSeen.set(x.slug as string, t);
      dedup.push(x as any);
    }

    const slugs = Array.from(new Set(dedup.map((x) => x.slug)));

    const [yearsRes, modelsRes, brandsRes] = await Promise.all([
      supabase.from("filter_years").select("id,year,model_id,slug").eq("store_id", storeId).in("slug", slugs),
      supabase.from("filter_models").select("id,name_ar,brand_id,slug").eq("store_id", storeId).in("slug", slugs),
      supabase.from("filter_brands").select("id,name_ar,slug").eq("store_id", storeId).in("slug", slugs),
    ]);

    if (yearsRes.error) return NextResponse.json({ error: yearsRes.error.message }, { status: 500 });
    if (modelsRes.error) return NextResponse.json({ error: modelsRes.error.message }, { status: 500 });
    if (brandsRes.error) return NextResponse.json({ error: brandsRes.error.message }, { status: 500 });

    const years = yearsRes.data || [];
    const modelsBySlug = modelsRes.data || [];
    const brandsBySlug = brandsRes.data || [];

    const yearBySlug = new Map<string, any>(); years.forEach((y: any) => yearBySlug.set(y.slug, y));
    const modelBySlug = new Map<string, any>(); modelsBySlug.forEach((m: any) => modelBySlug.set(m.slug, m));
    const brandBySlug = new Map<string, any>(); brandsBySlug.forEach((b: any) => brandBySlug.set(b.slug, b));

    const yearModelIds = Array.from(new Set(years.map((y: any) => y.model_id).filter(Boolean))) as number[];
    const { data: modelsById, error: mIdErr } = yearModelIds.length
      ? await supabase.from("filter_models").select("id,name_ar,brand_id").eq("store_id", storeId).in("id", yearModelIds)
      : { data: [], error: null as any };
    if (mIdErr) return NextResponse.json({ error: mIdErr.message }, { status: 500 });

    const modelIdMap = new Map<number, any>(); (modelsById || []).forEach((m: any) => modelIdMap.set(Number(m.id), m));

    const brandIds = Array.from(new Set([
      ...modelsBySlug.map((m: any) => m.brand_id).filter(Boolean),
      ...(modelsById || []).map((m: any) => m.brand_id).filter(Boolean),
      ...brandsBySlug.map((b: any) => b.id).filter(Boolean),
    ])) as number[];

    const { data: brandsById, error: bErr } = brandIds.length
      ? await supabase.from("filter_brands").select("id,name_ar").eq("store_id", storeId).in("id", brandIds)
      : { data: [], error: null as any };
    if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });

    const brandNameById = new Map<number, string>(); (brandsById || []).forEach((b: any) => brandNameById.set(Number(b.id), String(b.name_ar)));

    type Cand =
      | { kind: "year"; brand_id: number; model_id: number; year_id: number; brand_name: string; model_name: string; year_text: string; occurred_at: string }
      | { kind: "model"; brand_id: number; model_id: number; brand_name: string; model_name: string; occurred_at: string }
      | { kind: "brand"; brand_id: number; brand_name: string; occurred_at: string };

    const candidates: Cand[] = [];

    for (const x of dedup) {
      const slug = x.slug;

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

    if (candidates.length === 0) return NextResponse.json({ ok: true, profile: null });

    const scoreYear = new Map<string, number>();
    const scoreModel = new Map<string, number>();
    const scoreBrand = new Map<number, number>();
    const lastSignalAt = new Map<string, string>();
    const reasons: string[] = [];

    const bump = (map: Map<any, number>, key: any, n: number) => map.set(key, (map.get(key) || 0) + n);

    for (const c of candidates) {
      if (c.kind === "year") {
        const yKey = `${c.brand_id}:${c.model_id}:${c.year_id}`;
        bump(scoreYear, yKey, 10);
        bump(scoreModel, `${c.brand_id}:${c.model_id}`, 9);
        bump(scoreBrand, c.brand_id, 3);
        const prev = lastSignalAt.get(yKey);
        if (!prev || c.occurred_at > prev) lastSignalAt.set(yKey, c.occurred_at);
      } else if (c.kind === "model") {
        bump(scoreModel, `${c.brand_id}:${c.model_id}`, 6);
        bump(scoreBrand, c.brand_id, 2);
      } else {
        bump(scoreBrand, c.brand_id, 2);
      }
    }

    const pickTop = (map: Map<any, number>) => {
      let bestKey: any = null, best = -1, second = -1;
      for (const [k, v] of map.entries()) {
        if (v > best) { second = best; best = v; bestKey = k; }
        else if (v > second) { second = v; }
      }
      return { bestKey, best, second };
    };

    const topY = pickTop(scoreYear);
    const topM = pickTop(scoreModel);

    const signals_7d = candidates.length;
    let last_signal_at = "1970-01-01T00:00:00.000Z";
    for (const r of candidates) last_signal_at = safeMaxIso(last_signal_at, r.occurred_at);
    const lastSignalSafe = last_signal_at === "1970-01-01T00:00:00.000Z" ? null : last_signal_at;

    let profile: Profile | null = null;

    const yearKey = topY.bestKey ? String(topY.bestKey) : null;
    const modelKey = topM.bestKey ? String(topM.bestKey) : null;

    const yearConfidence = yearKey && topY.best >= 18 ? "high" : yearKey && topY.best >= 10 ? "low" : null;
    const modelConfidence = modelKey && topM.best >= 12 ? "medium" : modelKey && topM.best >= 6 ? "low" : null;

    if (yearKey && yearConfidence) {
      const [bid, mid, yid] = yearKey.split(":").map(Number);
      const any = candidates.find((c) => c.kind === "year" && c.brand_id === bid && c.model_id === mid && c.year_id === yid) as any;

      reasons.push("تم الاستنتاج من صفحات الأقسام (category) المطابقة لسنة/موديل/شركة.");
      reasons.push(`Score السنة: ${topY.best}.`);

      profile = {
        visitor_id: visitorId,
        brand_id: bid,
        model_id: mid,
        year_id: yid,
        brand_name: any?.brand_name ?? null,
        model_name: any?.model_name ?? null,
        year_text: any?.year_text ?? null,
        signals_7d,
        last_signal_at: lastSignalAt.get(yearKey) || lastSignalSafe,
        confidence: yearConfidence as any,
        score: topY.best,
        reasons,
      };
    } else if (modelKey && modelConfidence) {
      const [bid, mid] = modelKey.split(":").map(Number);
      const any = candidates.find((c) => (c.kind === "model" || c.kind === "year") && c.brand_id === bid && c.model_id === mid) as any;

      reasons.push("تم الاستنتاج من صفحات الأقسام المطابقة لموديل/شركة.");
      reasons.push(`Score الموديل: ${topM.best}.`);

      profile = {
        visitor_id: visitorId,
        brand_id: bid,
        model_id: mid,
        year_id: null,
        brand_name: any?.brand_name ?? null,
        model_name: any?.model_name ?? null,
        year_text: null,
        signals_7d,
        last_signal_at: any?.occurred_at || lastSignalSafe,
        confidence: modelConfidence as any,
        score: topM.best,
        reasons,
      };
    } else {
      const topB = pickTop(scoreBrand);
      if (topB.bestKey && topB.best >= 2) {
        const bid = Number(topB.bestKey);

        reasons.push("تم الاستنتاج من صفحات الأقسام المطابقة لشركة فقط.");
        reasons.push(`Score الشركة: ${topB.best}.`);

        profile = {
          visitor_id: visitorId,
          brand_id: bid,
          model_id: null,
          year_id: null,
          brand_name: brandNameById.get(bid) ?? null,
          model_name: null,
          year_text: null,
          signals_7d,
          last_signal_at: lastSignalSafe,
          confidence: topB.best >= 6 ? "medium" : "low",
          score: topB.best,
          reasons,
        };
      } else {
        profile = null;
      }
    }

    return NextResponse.json({ ok: true, profile });
  } catch (e: any) {
    return NextResponse.json({ error: "SERVER_ERROR", details: String(e?.message || e) }, { status: 500 });
  }
}
