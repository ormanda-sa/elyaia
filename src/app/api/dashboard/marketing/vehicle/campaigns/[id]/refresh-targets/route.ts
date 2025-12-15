import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStoreId } from "@/lib/currentStore";

function supabaseService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

function addMinutes(iso: string, minutes: number) {
  const d = new Date(iso);
  return new Date(d.getTime() + minutes * 60 * 1000).toISOString();
}

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const storeId = await getCurrentStoreId();
    if (!storeId) return NextResponse.json({ error: "store_id not found" }, { status: 401 });

    const { id } = await ctx.params;
    const campaignId = Number(id);
    if (!Number.isFinite(campaignId)) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }

    const sp = supabaseService();

    const { data: c, error: e1 } = await sp
      .from("marketing_campaigns_vehicle")
      .select(
        `
        id, store_id, audience_mode, status,
        scope_level, brand_id, model_id, year_id,
        lookback_days, min_signals, only_customers,
        send_email, send_whatsapp, send_delay_minutes
        `
      )
      .eq("store_id", storeId)
      .eq("id", campaignId)
      .single();

    if (e1) throw e1;
    if (!c) return NextResponse.json({ error: "campaign not found" }, { status: 404 });
    if (c.audience_mode !== "targeted") {
      return NextResponse.json({ ok: true, note: "public campaign (no targets)" });
    }

    // ✅ لو بتسوي Email/WhatsApp لازم عملاء فقط
    const forceCustomers = !!c.send_email || !!c.send_whatsapp;
    const onlyCustomers = forceCustomers ? true : !!c.only_customers;

    // Validation: لازم scope ids للحملة المستهدفة
    if (!c.scope_level) return NextResponse.json({ error: "scope_level required" }, { status: 400 });
    if (c.scope_level === "brand" && !c.brand_id) return NextResponse.json({ error: "brand_id required" }, { status: 400 });
    if (c.scope_level === "model" && !c.model_id) return NextResponse.json({ error: "model_id required" }, { status: 400 });
    if (c.scope_level === "year" && !c.year_id) return NextResponse.json({ error: "year_id required" }, { status: 400 });

    const lookbackDays = Number(c.lookback_days ?? 7);
    const minSignals = Number(c.min_signals ?? 1);
    const since = new Date(Date.now() - lookbackDays * 86400000).toISOString();

    // 1) signals within lookback
    const { data: signals, error: e2 } = await sp
      .from("visitor_vehicle_signals")
      .select("visitor_id, occurred_at, brand_id, model_id, year_id")
      .eq("store_id", storeId)
      .gte("occurred_at", since);

    if (e2) throw e2;

    // brand -> models list (عشان لو brand و signal جاي من model)
    let modelIdsForBrand: number[] = [];
    if (c.scope_level === "brand" && c.brand_id) {
      const { data: ms, error: em } = await sp
        .from("filter_models")
        .select("id")
        .eq("store_id", storeId)
        .eq("brand_id", c.brand_id);
      if (em) throw em;
      modelIdsForBrand = (ms ?? []).map((x: any) => x.id);
    }

    // 2) filter by scope
    const filtered = (signals ?? []).filter((s: any) => {
      if (!s.visitor_id) return false;

      if (c.scope_level === "year") return s.year_id === c.year_id;
      if (c.scope_level === "model") return s.model_id === c.model_id;

      // brand
      if (s.brand_id === c.brand_id) return true;
      if (s.model_id && modelIdsForBrand.includes(s.model_id)) return true;
      return false;
    });

    // 3) aggregate per visitor
    const byVisitor = new Map<string, { count: number; first: string; last: string }>();
    for (const s of filtered) {
      const vid = String(s.visitor_id);
      const t = String(s.occurred_at);
      const cur = byVisitor.get(vid);
      if (!cur) byVisitor.set(vid, { count: 1, first: t, last: t });
      else {
        cur.count += 1;
        if (t < cur.first) cur.first = t;
        if (t > cur.last) cur.last = t;
      }
    }

    const candidates = [...byVisitor.entries()].filter(([, agg]) => agg.count >= minSignals);

    // 4) join customers (only_customers)
    const customersByVisitor = new Map<string, any>();
    if (onlyCustomers) {
      const ids = candidates.map(([vid]) => vid);
      const chunk = (arr: string[], size: number) =>
        Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
          arr.slice(i * size, i * size + size)
        );

      for (const part of chunk(ids, 500)) {
        const { data: links, error: el } = await sp
          .from("visitors_customers")
          .select("visitor_id, salla_customer_id, customer_name, customer_email, customer_phone")
          .eq("store_id", storeId)
          .in("visitor_id", part);
        if (el) throw el;
        for (const row of links ?? []) customersByVisitor.set(String(row.visitor_id), row);
      }
    }

    // 5) build target rows
    const rows: any[] = [];
    for (const [visitorId, agg] of candidates) {
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
        signals_count: agg.count,
        first_signal_at: agg.first,
        last_signal_at: agg.last,
        status: "pending",
      });
    }

    // 6) SYNC delete: remove pending/skipped not eligible
    const eligibleVisitorIds = rows.map((r) => r.visitor_id).filter(Boolean);

    if (eligibleVisitorIds.length === 0) {
      const { error: delAllErr } = await sp
        .from("marketing_campaigns_targets")
        .delete()
        .eq("store_id", storeId)
        .eq("campaign_id", campaignId)
        .in("status", ["pending", "skipped"]);
      if (delAllErr) throw delAllErr;
    } else {
      const inList = `(${eligibleVisitorIds.map((v) => `"${v}"`).join(",")})`;
      const { error: delErr } = await sp
        .from("marketing_campaigns_targets")
        .delete()
        .eq("store_id", storeId)
        .eq("campaign_id", campaignId)
        .in("status", ["pending", "skipped"])
        .not("visitor_id", "in", inList);
      if (delErr) throw delErr;
    }

    // 7) upsert targets
    const { data: up, error: u1 } = await sp
      .from("marketing_campaigns_targets")
      .upsert(rows, { onConflict: "campaign_id,visitor_id" })
      .select("id");
    if (u1) throw u1;

    const upserted = (up ?? []).length;
    const nowIso = new Date().toISOString();

    await sp
      .from("marketing_campaigns_vehicle")
      .update({
        targets_last_refreshed_at: nowIso,
        targets_last_refreshed_count: upserted,
        updated_at: nowIso,
        only_customers: onlyCustomers,
      })
      .eq("store_id", storeId)
      .eq("id", campaignId);

    // 8) Queue messages with scheduled_at (delay)
    const wantEmail = !!c.send_email;
    const wantWhats = !!c.send_whatsapp;
    const delayMin = Number(c.send_delay_minutes ?? 60);

    const { data: pendingTargets, error: et } = await sp
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
      const { data: ex, error: exErr } = await sp
        .from("marketing_campaigns_messages")
        .select("target_id, channel, status")
        .eq("store_id", storeId)
        .eq("campaign_id", campaignId)
        .in("target_id", targetIds)
        .limit(5000);
      if (exErr) throw exErr;
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

    let messagesCreated = 0;
    if (msgRows.length) {
      const { data: ins, error: insErr } = await sp
        .from("marketing_campaigns_messages")
        .insert(msgRows)
        .select("id");
      if (insErr) throw insErr;
      messagesCreated = (ins ?? []).length;
    }

    return NextResponse.json({
      ok: true,
      targets_eligible: rows.length,
      targets_upserted: upserted,
      messages_created: messagesCreated,
      delay_minutes: delayMin,
      forced_only_customers: forceCustomers,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed" }, { status: 500 });
  }
}
