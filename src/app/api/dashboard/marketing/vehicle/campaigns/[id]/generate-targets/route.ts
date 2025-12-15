import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const storeId = await getCurrentStoreId();
    const supabase = getSupabaseServerClient();

    // load campaign
    const { data: c, error: e1 } = await supabase
      .from("marketing_campaigns_vehicle")
      .select("id, audience_mode, scope_level, brand_id, model_id, year_id, lookback_days, min_signals, only_customers")
      .eq("store_id", storeId)
      .eq("id", Number(id))
      .single();

    if (e1) throw e1;

    if (c.audience_mode !== "targeted") {
      return NextResponse.json({ error: "campaign is public; no targets" }, { status: 400 });
    }

    const since = new Date(Date.now() - Number(c.lookback_days) * 24 * 60 * 60 * 1000).toISOString();

    // pull signals for scope
    // brand: match by brand_id OR by models of brand (safer)
    let modelIdsForBrand: number[] = [];
    if (c.scope_level === "brand") {
      const { data: ms, error: em } = await supabase
        .from("filter_models")
        .select("id")
        .eq("store_id", storeId)
        .eq("brand_id", c.brand_id);

      if (em) throw em;
      modelIdsForBrand = (ms ?? []).map((x: any) => x.id);
    }

    const { data: signals, error: e2 } = await supabase
      .from("visitor_vehicle_signals")
      .select("visitor_id, occurred_at, salla_customer_id, brand_id, model_id, year_id")
      .eq("store_id", storeId)
      .gte("occurred_at", since);

    if (e2) throw e2;

    // filter in app to keep this simple & predictable
    const filtered = (signals ?? []).filter((s: any) => {
      if (c.scope_level === "year") return s.year_id === c.year_id;
      if (c.scope_level === "model") return s.model_id === c.model_id;
      // brand
      if (s.brand_id === c.brand_id) return true;
      if (s.model_id && modelIdsForBrand.includes(s.model_id)) return true;
      return false;
    });

    // group per visitor_id
    const byVisitor = new Map<string, { count: number; first: string; last: string }>();
    for (const s of filtered) {
      if (!s.visitor_id) continue;
      const k = String(s.visitor_id);
      const t = String(s.occurred_at);
      const cur = byVisitor.get(k);
      if (!cur) byVisitor.set(k, { count: 1, first: t, last: t });
      else {
        cur.count += 1;
        if (t < cur.first) cur.first = t;
        if (t > cur.last) cur.last = t;
      }
    }

    // apply min_signals
    const entries = [...byVisitor.entries()].filter(([, v]) => v.count >= Number(c.min_signals));

    // if customers only, join visitors_customers
    let customersByVisitor = new Map<string, any>();
    if (c.only_customers) {
      const visitorIds = entries.map(([vid]) => vid);
      // chunking defensive
      const chunk = (arr: string[], size: number) =>
        Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

      for (const part of chunk(visitorIds, 500)) {
        const { data: links, error: el } = await supabase
          .from("visitors_customers")
          .select("visitor_id, salla_customer_id, customer_name, customer_email, customer_phone")
          .eq("store_id", storeId)
          .in("visitor_id", part);

        if (el) throw el;
        for (const row of links ?? []) customersByVisitor.set(String(row.visitor_id), row);
      }
    }

    // insert targets (upsert via unique indexes)
    let inserted = 0;

    for (const [visitorId, v] of entries) {
      const link = customersByVisitor.get(visitorId);

      if (c.only_customers && !link) continue; // skip if not identified

      const payload: any = {
        store_id: storeId,
        campaign_id: Number(id),
        visitor_id: visitorId,
        salla_customer_id: link?.salla_customer_id ?? null,
        customer_name: link?.customer_name ?? null,
        customer_email: link?.customer_email ?? null,
        customer_phone: link?.customer_phone ?? null,
        signals_count: v.count,
        first_signal_at: v.first,
        last_signal_at: v.last,
      };

      const { error: ei } = await supabase
        .from("marketing_campaigns_targets")
        .insert(payload);

      if (!ei) inserted += 1;
      // إذا فشل بسبب unique (موجود مسبقاً) نتجاهله بدون دراما
    }

    return NextResponse.json({ inserted });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to generate targets" },
      { status: 500 }
    );
  }
}
