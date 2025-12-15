// FILE: src/app/api/dashboard/marketing/vehicle/campaigns/[id]/refresh-targets/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStoreId } from "@/lib/currentStore";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const campaignId = Number(id);

    // ✅ (1) تأكد الـ id صحيح
    if (!Number.isFinite(campaignId) || campaignId <= 0) {
      return NextResponse.json({ error: "invalid campaign id" }, { status: 400 });
    }

    const storeIdMaybe = await getCurrentStoreId();

    // ✅ (2) تأكد storeId موجود
    if (!storeIdMaybe) {
      return NextResponse.json({ error: "store_id not found" }, { status: 401 });
    }
    const storeId: string = storeIdMaybe;

    const supabase = getServiceSupabase();

    // 1) load campaign
    const { data: c, error: e1 } = await supabase
      .from("marketing_campaigns_vehicle")
      .select(
        "id, store_id, audience_mode, scope_level, brand_id, model_id, year_id, lookback_days, min_signals, only_customers"
      )
      .eq("store_id", storeId)
      .eq("id", campaignId)
      .single();

    if (e1) throw e1;
    if (!c) throw new Error("Campaign not found");
    if (c.audience_mode !== "targeted") {
      return NextResponse.json(
        { error: "campaign is public; no targets" },
        { status: 400 }
      );
    }

    const since = new Date(
      Date.now() - Number(c.lookback_days) * 86400000
    ).toISOString();

    // 2) fetch signals in lookback
    const { data: signals, error: e2 } = await supabase
      .from("visitor_vehicle_signals")
      .select("visitor_id, occurred_at, brand_id, model_id, year_id")
      .eq("store_id", storeId)
      .gte("occurred_at", since);

    if (e2) throw e2;

    // 3) filter by scope
    let modelIdsForBrand: number[] = [];
    if (c.scope_level === "brand" && c.brand_id) {
      const { data: ms, error: em } = await supabase
        .from("filter_models")
        .select("id")
        .eq("store_id", storeId)
        .eq("brand_id", c.brand_id);
      if (em) throw em;
      modelIdsForBrand = (ms ?? []).map((x: any) => x.id);
    }

    const filtered = (signals ?? []).filter((s: any) => {
      if (!s.visitor_id) return false;

      if (c.scope_level === "year") return s.year_id === c.year_id;
      if (c.scope_level === "model") return s.model_id === c.model_id;

      // brand
      if (s.brand_id === c.brand_id) return true;
      if (s.model_id && modelIdsForBrand.includes(s.model_id)) return true;
      return false;
    });

    // 4) group per visitor
    const byVisitor = new Map<
      string,
      { count: number; first: string; last: string }
    >();

    for (const s of filtered) {
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

    const entries = [...byVisitor.entries()].filter(
      ([, v]) => v.count >= Number(c.min_signals)
    );

    // 5) join customers if only_customers
    const customersByVisitor = new Map<string, any>();
    if (c.only_customers) {
      const ids = entries.map(([vid]) => vid);
      const chunk = (arr: string[], size: number) =>
        Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
          arr.slice(i * size, i * size + size)
        );

      for (const part of chunk(ids, 500)) {
        const { data: links, error: el } = await supabase
          .from("visitors_customers")
          .select(
            "visitor_id, salla_customer_id, customer_name, customer_email, customer_phone"
          )
          .eq("store_id", storeId)
          .in("visitor_id", part);
        if (el) throw el;
        for (const row of links ?? [])
          customersByVisitor.set(String(row.visitor_id), row);
      }
    }

    // 6) build rows
    const rows: any[] = [];
    for (const [visitorId, v] of entries) {
      const link = customersByVisitor.get(visitorId);
      if (c.only_customers && !link) continue;

      rows.push({
        store_id: storeId,
        campaign_id: campaignId,
        visitor_id: visitorId,
        salla_customer_id: link?.salla_customer_id ?? null,
        customer_name: link?.customer_name ?? null,
        customer_email: link?.customer_email ?? null,
        customer_phone: link?.customer_phone ?? null,
        signals_count: v.count,
        first_signal_at: v.first,
        last_signal_at: v.last,
        status: "pending",
      });
    }

    // ✅ 6.5) SYNC DELETE:
    const eligibleVisitorIds = rows.map((r) => r.visitor_id).filter(Boolean);

    if (eligibleVisitorIds.length === 0) {
      const { error: delAllErr } = await supabase
        .from("marketing_campaigns_targets")
        .delete()
        .eq("store_id", storeId)
        .eq("campaign_id", campaignId)
        .in("status", ["pending", "skipped"]);

      if (delAllErr) throw delAllErr;
    } else {
      const inList = `(${eligibleVisitorIds.map((v) => `"${v}"`).join(",")})`;

      const { error: delErr } = await supabase
        .from("marketing_campaigns_targets")
        .delete()
        .eq("store_id", storeId)
        .eq("campaign_id", campaignId)
        .in("status", ["pending", "skipped"])
        .not("visitor_id", "in", inList);

      if (delErr) throw delErr;
    }

    // 7) upsert
    let upserted = 0;

    const visitorRows = rows.filter((r) => r.visitor_id);
    if (visitorRows.length) {
      const { data: d1, error: u1 } = await supabase
        .from("marketing_campaigns_targets")
        .upsert(visitorRows, { onConflict: "campaign_id,visitor_id" })
        .select("id");
      if (u1) throw u1;
      upserted += (d1 ?? []).length;
    }

    const customerRows = rows.filter((r) => r.salla_customer_id);
    if (customerRows.length) {
      const { data: d2, error: u2 } = await supabase
        .from("marketing_campaigns_targets")
        .upsert(customerRows, { onConflict: "campaign_id,salla_customer_id" })
        .select("id");
      if (u2) throw u2;
      upserted += (d2 ?? []).length;
    }

    // 8) update meta
    const nowIso = new Date().toISOString();
    const { error: eu } = await supabase
      .from("marketing_campaigns_vehicle")
      .update({
        targets_last_refreshed_at: nowIso,
        targets_last_refreshed_count: upserted,
        updated_at: nowIso,
      })
      .eq("store_id", storeId)
      .eq("id", campaignId);

    if (eu) throw eu;

    return NextResponse.json({
      ok: true,
      eligible: rows.length,
      upserted,
      deleted_pending_skipped_not_eligible: true,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "refresh failed" },
      { status: 500 }
    );
  }
}
