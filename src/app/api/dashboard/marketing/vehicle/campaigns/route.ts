// FILE: src/app/api/dashboard/marketing/vehicle/campaigns/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStoreId } from "@/lib/currentStore";

type ScopeLevel = "brand" | "model" | "year";
type AudienceMode = "public" | "targeted";
type CampaignType = "discount" | "message";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ✅ Refresh targets داخلي (بدون HTTP) + SYNC (يحذف غير المؤهلين pending/skipped)
async function refreshTargetsInternal(opts: {
  supabase: ReturnType<typeof getServiceSupabase>;
  storeId: string;
  campaignId: number;
}) {
  const { supabase, storeId, campaignId } = opts;

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
    return { ok: true, eligible: 0, upserted: 0, note: "public campaign (no targets)" };
  }

  const since = new Date(Date.now() - Number(c.lookback_days) * 86400000).toISOString();

  const { data: signals, error: e2 } = await supabase
    .from("visitor_vehicle_signals")
    .select("visitor_id, occurred_at, brand_id, model_id, year_id")
    .eq("store_id", storeId)
    .gte("occurred_at", since);

  if (e2) throw e2;

  // brand -> models list
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

  // filter by scope
  const filtered = (signals ?? []).filter((s: any) => {
    if (!s.visitor_id) return false;

    if (c.scope_level === "year") return s.year_id === c.year_id;
    if (c.scope_level === "model") return s.model_id === c.model_id;

    // brand
    if (s.brand_id === c.brand_id) return true;
    if (s.model_id && modelIdsForBrand.includes(s.model_id)) return true;
    return false;
  });

  // group per visitor
  const byVisitor = new Map<string, { count: number; first: string; last: string }>();
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

  const entries = [...byVisitor.entries()].filter(([, v]) => v.count >= Number(c.min_signals));

  // join customers if only_customers
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
        .select("visitor_id, salla_customer_id, customer_name, customer_email, customer_phone")
        .eq("store_id", storeId)
        .in("visitor_id", part);

      if (el) throw el;
      for (const row of links ?? []) customersByVisitor.set(String(row.visitor_id), row);
    }
  }

  // build rows
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

  // ✅ SYNC DELETE: remove pending/skipped not eligible
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

  // upsert
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

  // update meta
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

  return { ok: true, eligible: rows.length, upserted };
}

export async function GET(req: NextRequest) {
  try {
    const storeIdMaybe = await getCurrentStoreId();
    if (!storeIdMaybe) {
      return NextResponse.json({ error: "store_id not found" }, { status: 401 });
    }
    const storeId: string = storeIdMaybe;

    const supabase = getServiceSupabase();
    const url = new URL(req.url);

    const q = (url.searchParams.get("q") || "").trim();
    const status = (url.searchParams.get("status") || "").trim();
    const audience = (url.searchParams.get("audience_mode") || "").trim();
    const scope = (url.searchParams.get("scope_level") || "").trim();
    const type = (url.searchParams.get("campaign_type") || "").trim();

    let query = supabase
      .from("marketing_campaigns_vehicle")
      .select(`
        id, title, status, scope_level, brand_id, model_id, year_id,
        audience_mode, campaign_type,
        send_onsite, send_email, send_whatsapp,
        ends_at, starts_at, created_at,
        targets_last_refreshed_at, targets_last_refreshed_count,
        marketing_campaigns_targets(count)
      `)
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (q) query = query.ilike("title", `%${q}%`);
    if (status) query = query.eq("status", status);
    if (audience) query = query.eq("audience_mode", audience);
    if (scope) query = query.eq("scope_level", scope);
    if (type) query = query.eq("campaign_type", type);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ items: data ?? [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to load campaigns" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const storeIdMaybe = await getCurrentStoreId();
    if (!storeIdMaybe) {
      return NextResponse.json({ error: "store_id not found" }, { status: 401 });
    }
    const storeId: string = storeIdMaybe;

    const supabase = getServiceSupabase();
    const body = await req.json();

    const audience_mode = (body.audience_mode as AudienceMode) ?? "public";

    const payload: any = {
      store_id: storeId,
      title: String(body.title || "").trim() || "حملة سيارة",

      scope_level: body.scope_level as ScopeLevel,
      brand_id: body.brand_id ?? null,
      model_id: body.model_id ?? null,
      year_id: body.year_id ?? null,

      audience_mode,
      campaign_type: (body.campaign_type as CampaignType) ?? "message",

      // ✅ public => on-site إجباري، targeted => حسب المستخدم
      send_onsite: audience_mode === "public" ? true : (body.send_onsite ?? true),
      send_email: audience_mode === "targeted" ? (body.send_email ?? false) : false,
      send_whatsapp: audience_mode === "targeted" ? (body.send_whatsapp ?? false) : false,

      // ✅ targeted الافتراضي: زوار + عملاء (only_customers=false)
      only_customers: audience_mode === "targeted" ? (body.only_customers ?? false) : true,
      lookback_days: audience_mode === "targeted" ? (body.lookback_days ?? 7) : 7,
      min_signals: audience_mode === "targeted" ? (body.min_signals ?? 1) : 1,

      email_template_id: body.email_template_id ?? null,
      coupon_code: body.coupon_code ?? null,
      discount_percent: body.discount_percent ?? null,
      ends_at: body.ends_at ?? null,

      status: "draft",
    };

    // ---- Validation: scope ----
    if (!payload.scope_level) {
      return NextResponse.json({ error: "scope_level required" }, { status: 400 });
    }
    if (payload.scope_level === "brand" && !payload.brand_id) {
      return NextResponse.json({ error: "brand_id required" }, { status: 400 });
    }
    if (payload.scope_level === "model" && !payload.model_id) {
      return NextResponse.json({ error: "model_id required" }, { status: 400 });
    }
    if (payload.scope_level === "year" && !payload.year_id) {
      return NextResponse.json({ error: "year_id required" }, { status: 400 });
    }

    // ---- Validation: targeted settings ----
    if (payload.audience_mode === "targeted") {
      const lb = Number(payload.lookback_days);
      const ms = Number(payload.min_signals);

      if (!Number.isFinite(lb) || lb < 1 || lb > 365) {
        return NextResponse.json(
          { error: "lookback_days must be 1..365" },
          { status: 400 }
        );
      }
      if (!Number.isFinite(ms) || ms < 1 || ms > 50) {
        return NextResponse.json(
          { error: "min_signals must be 1..50" },
          { status: 400 }
        );
      }
    } else {
      // public: لا targets
      payload.only_customers = true;
      payload.lookback_days = 7;
      payload.min_signals = 1;
    }

    // ---- Validation: discount fields ----
    if (payload.campaign_type === "discount") {
      if (payload.discount_percent != null) {
        const p = Number(payload.discount_percent);
        if (!Number.isFinite(p) || p <= 0 || p > 100) {
          return NextResponse.json(
            { error: "discount_percent must be 0..100" },
            { status: 400 }
          );
        }
      }
    } else {
      payload.coupon_code = null;
      payload.discount_percent = null;
    }

    const { data, error } = await supabase
      .from("marketing_campaigns_vehicle")
      .insert(payload)
      .select("id")
      .single();

    if (error) throw error;
    if (!data?.id) throw new Error("Insert succeeded but no id returned");

    // ✅ targeted: refresh تلقائي بعد الإنشاء
    let refresh: any = null;
    if (audience_mode === "targeted") {
      refresh = await refreshTargetsInternal({ supabase, storeId, campaignId: data.id });
    }

    return NextResponse.json({ id: data.id, refresh });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to create campaign" },
      { status: 500 }
    );
  }
}
   