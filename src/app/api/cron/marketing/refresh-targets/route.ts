// FILE: src/app/api/cron/marketing/refresh-targets/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Cron endpoint (multi-tenant):
 * - يجلب كل الحملات المستهدفة النشطة لكل المتاجر
 * - يبني targets من visitor_vehicle_signals
 * - (الجديد) يعمل queue تلقائي لرسائل email/whatsapp مع scheduled_at (delay)
 *
 * Vercel Cron ينادي GET، ونحميه بـ secret في query:
 * /api/cron/marketing/refresh-targets?secret=XXXX
 */

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

function addMinutes(iso: string, minutes: number) {
  const d = new Date(iso);
  return new Date(d.getTime() + minutes * 60 * 1000).toISOString();
}

async function refreshTargetsForCampaign(opts: {
  supabase: ReturnType<typeof getServiceSupabase>;
  storeId: string;
  campaignId: number;
}) {
  const { supabase, storeId, campaignId } = opts;

  // 1) load campaign (✅ نضيف send_email/send_whatsapp/send_delay_minutes)
  const { data: c, error: e1 } = await supabase
    .from("marketing_campaigns_vehicle")
    .select(
      `
      id, store_id, audience_mode, scope_level, brand_id, model_id, year_id,
      lookback_days, min_signals, only_customers,
      send_email, send_whatsapp, send_delay_minutes
      `
    )
    .eq("store_id", storeId)
    .eq("id", campaignId)
    .single();

  if (e1) throw e1;
  if (!c) throw new Error("Campaign not found");
  if (c.audience_mode !== "targeted") {
    return { ok: true, skipped: true, reason: "public", targets_upserted: 0, messages_created: 0 };
  }

  const wantEmail = !!c.send_email;
  const wantWhats = !!c.send_whatsapp;
  const forceCustomers = wantEmail || wantWhats;
  const onlyCustomers = forceCustomers ? true : !!c.only_customers;

  const since = new Date(Date.now() - Number(c.lookback_days) * 86400000).toISOString();

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

  // 5) join customers if only_customers (✅ يجبرها لو ايميل/واتساب شغال)
  const customersByVisitor = new Map<string, any>();
  if (onlyCustomers) {
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

  // 6) build target rows
  const rows: any[] = [];
  for (const [visitorId, v] of entries) {
    const link = customersByVisitor.get(visitorId);
    if (onlyCustomers && !link) continue;

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

  // 6.5) SYNC DELETE (pending/skipped فقط)
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

  // 7) upsert targets
  const { data: up, error: u1 } = await supabase
    .from("marketing_campaigns_targets")
    .upsert(rows, { onConflict: "campaign_id,visitor_id" })
    .select("id");

  if (u1) throw u1;
  const targetsUpserted = (up ?? []).length;

  // 8) update meta (+ only_customers يتصحح تلقائيًا لو القنوات تحتاج)
  const nowIso = new Date().toISOString();
  const { error: eu } = await supabase
    .from("marketing_campaigns_vehicle")
    .update({
      targets_last_refreshed_at: nowIso,
      targets_last_refreshed_count: targetsUpserted,
      updated_at: nowIso,
      only_customers: onlyCustomers,
    })
    .eq("store_id", storeId)
    .eq("id", campaignId);

  if (eu) throw eu;

  // 9) ✅ Queue messages تلقائيًا (بدون تكرار)
  let messagesCreated = 0;

  if (wantEmail || wantWhats) {
    const delayMin = Number(c.send_delay_minutes ?? 60);

    // نجيب targets pending
    const { data: pendingTargets, error: et } = await supabase
      .from("marketing_campaigns_targets")
      .select("id, customer_email, customer_phone, last_signal_at, status")
      .eq("store_id", storeId)
      .eq("campaign_id", campaignId)
      .in("status", ["pending"])
      .limit(2000);

    if (et) throw et;

    const targetIds = (pendingTargets ?? []).map((t) => t.id);
    const existingKey = new Set<string>();

    if (targetIds.length) {
      const { data: ex, error: exErr } = await supabase
        .from("marketing_campaigns_messages")
        .select("target_id, channel, status")
        .eq("store_id", storeId)
        .eq("campaign_id", campaignId)
        .in("target_id", targetIds)
        .limit(5000);

      if (exErr) throw exErr;

      // أي رسالة موجودة لنفس target+channel (pending/sent) تمنع التكرار
      for (const m of ex ?? []) existingKey.add(`${m.target_id}:${m.channel}`);
    }

    const msgRows: any[] = [];
    for (const t of pendingTargets ?? []) {
      const last = t.last_signal_at ? String(t.last_signal_at) : nowIso;
      const sched = addMinutes(last, delayMin);

      if (wantEmail && t.customer_email && !existingKey.has(`${t.id}:email`)) {
        msgRows.push({
          store_id: storeId,
          campaign_id: campaignId,
          target_id: t.id,
          channel: "email",
          status: "pending",
          scheduled_at: sched,
        });
      }

      if (wantWhats && t.customer_phone && !existingKey.has(`${t.id}:whatsapp`)) {
        msgRows.push({
          store_id: storeId,
          campaign_id: campaignId,
          target_id: t.id,
          channel: "whatsapp",
          status: "pending",
          scheduled_at: sched,
        });
      }
    }

    if (msgRows.length) {
      const { data: ins, error: insErr } = await supabase
        .from("marketing_campaigns_messages")
        .insert(msgRows)
        .select("id");

      if (insErr) throw insErr;
      messagesCreated = (ins ?? []).length;
    }
  }

  return {
    ok: true,
    eligible: rows.length,
    targets_upserted: targetsUpserted,
    messages_created: messagesCreated,
    forced_only_customers: forceCustomers,
  };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");

    if (!secret || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const supabase = getServiceSupabase();

    // ✅ multi-tenant: كل الحملات المستهدفة النشطة لكل المتاجر
    const { data: campaigns, error } = await supabase
      .from("marketing_campaigns_vehicle")
      .select("id, store_id")
      .eq("audience_mode", "targeted")
      .eq("status", "active")
      .limit(500);

    if (error) throw error;

    let ok = 0;
    let failed = 0;
    let messages_created = 0;
    let targets_upserted = 0;

    for (const c of campaigns ?? []) {
      try {
        const r: any = await refreshTargetsForCampaign({
          supabase,
          storeId: c.store_id,
          campaignId: c.id,
        });

        ok++;
        messages_created += Number(r?.messages_created ?? 0);
        targets_upserted += Number(r?.targets_upserted ?? 0);
      } catch {
        failed++;
      }
    }

    return NextResponse.json({
      ok,
      failed,
      total: (campaigns ?? []).length,
      targets_upserted,
      messages_created,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}
