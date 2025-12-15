import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ visitor_id: string }> },
) {
  try {
    const supabase = getSupabaseServerClient();
    const storeId = await getCurrentStoreId();
    if (!storeId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const { visitor_id } = await ctx.params;
    const visitorId = String(visitor_id || "").trim();
    if (!visitorId) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    // ✅ خذ آخر 7 أيام من signals مباشرة
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: sig, error: sErr } = await supabase
      .from("visitor_vehicle_signals")
      .select("brand_id,model_id,year_id,occurred_at")
      .eq("store_id", storeId)
      .eq("visitor_id", visitorId)
      .gte("occurred_at", since);

    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
    if (!sig || sig.length === 0) return NextResponse.json({ ok: true, profile: null });

    // pick most frequent brand/model/year
    const countMap = (key: "brand_id" | "model_id" | "year_id") => {
      const m = new Map<number, number>();
      for (const r of sig as any[]) {
        const v = r[key];
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
    };

    const bestBrand = countMap("brand_id");
    const bestModel = countMap("model_id");
    const bestYear = countMap("year_id");

    let brand_id: number | null = bestBrand.best;
    let model_id: number | null = bestModel.best;
    let year_id: number | null = bestYear.best;

    const signals_7d = sig.length;
    const last_signal_at = (sig as any[]).reduce((max, r) => {
      const t = new Date(r.occurred_at).toISOString();
      return t > max ? t : max;
    }, "1970-01-01T00:00:00.000Z");

    // ✅ year -> model
    if (model_id == null && year_id != null) {
      const { data: y, error: yErr } = await supabase
        .from("filter_years")
        .select("model_id")
        .eq("store_id", storeId)
        .eq("id", year_id)
        .maybeSingle();

      if (yErr) return NextResponse.json({ error: yErr.message }, { status: 500 });
      if (y?.model_id != null) model_id = Number(y.model_id);
    }

    // ✅ model -> brand
    if (brand_id == null && model_id != null) {
      const { data: m, error: mErr } = await supabase
        .from("filter_models")
        .select("brand_id")
        .eq("store_id", storeId)
        .eq("id", model_id)
        .maybeSingle();

      if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
      if (m?.brand_id != null) brand_id = Number(m.brand_id);
    }

    // names
    const [b, m, y] = await Promise.all([
      brand_id
        ? supabase
            .from("filter_brands")
            .select("name_ar")
            .eq("store_id", storeId)
            .eq("id", brand_id)
            .maybeSingle()
        : Promise.resolve({ data: null as any, error: null }),
      model_id
        ? supabase
            .from("filter_models")
            .select("name_ar")
            .eq("store_id", storeId)
            .eq("id", model_id)
            .maybeSingle()
        : Promise.resolve({ data: null as any, error: null }),
      year_id
        ? supabase
            .from("filter_years")
            .select("year")
            .eq("store_id", storeId)
            .eq("id", year_id)
            .maybeSingle()
        : Promise.resolve({ data: null as any, error: null }),
    ]);

    if (b.error) return NextResponse.json({ error: b.error.message }, { status: 500 });
    if (m.error) return NextResponse.json({ error: m.error.message }, { status: 500 });
    if (y.error) return NextResponse.json({ error: y.error.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      profile: {
        visitor_id: visitorId,
        brand_id,
        model_id,
        year_id,
        signals_7d,
        last_signal_at,
        brand_name: b.data?.name_ar ?? null,
        model_name: m.data?.name_ar ?? null,
        year_text: y.data?.year ?? null,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "SERVER_ERROR", details: String(e?.message || e) },
      { status: 500 },
    );
  }
}
