import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabaseService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function normalizePath(p: string) {
  if (!p) return "/";
  // لو دخل URL كامل: نأخذ pathname فقط
  try {
    if (p.startsWith("http")) return new URL(p).pathname || "/";
  } catch {}

  // لو دخل /path?x=1 أو /path#hash: نشيل query/hash
  const cutQ = p.split("?")[0];
  const cutH = cutQ.split("#")[0];
  const clean = cutH.trim();
  return clean.startsWith("/") ? clean : "/" + clean;
}

function parseAllowedPaths(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return String(raw)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(normalizePath);
}

function pathAllowed(currentPath: string, allowed: string[]) {
  if (!allowed.length) return true; // فاضي = كل الصفحات
  const p = normalizePath(currentPath);
  return allowed.some((prefix) => p.startsWith(prefix));
}

export async function GET(req: NextRequest) {
  const sp = supabaseService();
  const { searchParams } = new URL(req.url);

  const store_id = searchParams.get("store_id") || "";
  const visitor_id = searchParams.get("visitor_id") || "";
  const path = normalizePath(searchParams.get("path") || "/");
  const page_url = searchParams.get("page_url") || null;

  if (!store_id || !visitor_id) {
    return NextResponse.json(
      { show: false, error: "missing store_id/visitor_id" },
      { status: 400 }
    );
  }

  const now = new Date();

  // 1) حملات نشطة + Onsite
  const { data: campaigns, error: campErr } = await sp
    .from("marketing_campaigns_vehicle")
    .select(`
      id, store_id, title, status,
      audience_mode,
      send_onsite, onsite_enabled, onsite_variant, onsite_headline, onsite_body, onsite_cta_text, onsite_cta_url,
      starts_at, ends_at, updated_at,
      onsite_paths
    `)
    .eq("store_id", store_id)
    .eq("status", "active")
    .eq("send_onsite", true)
    .order("updated_at", { ascending: false });

  if (campErr) {
    return NextResponse.json({ show: false, error: campErr.message }, { status: 500 });
  }
  if (!campaigns?.length) return NextResponse.json({ show: false });

  // 2) فلترة وقت + فلترة صفحات onsite_paths
  const eligible: any[] = [];
  for (const c of campaigns as any[]) {
    const starts = c.starts_at ? new Date(c.starts_at) : null;
    const ends = c.ends_at ? new Date(c.ends_at) : null;
    if (starts && now < starts) continue;
    if (ends && now > ends) continue;

    if (typeof c.onsite_enabled === "boolean" && c.onsite_enabled === false) continue;

    const allowed = parseAllowedPaths(c.onsite_paths);
    if (!pathAllowed(path, allowed)) continue;

    eligible.push(c);
  }

  if (!eligible.length) return NextResponse.json({ show: false });

  // 3) targeted أولاً (لو عندك)، ثم public
  eligible.sort((a, b) => (a.audience_mode === "targeted" ? -1 : 1));

  // 4) Dedup + شرط targeted
  for (const c of eligible) {
    const { data: impr } = await sp
      .from("marketing_campaigns_impressions")
      .select("id, expires_at")
      .eq("store_id", store_id)
      .eq("campaign_id", c.id)
      .eq("visitor_id", visitor_id)
      .maybeSingle();

    if (impr?.expires_at && new Date(impr.expires_at) > now) continue;

    let targetRow: any = null;
    if (c.audience_mode === "targeted") {
      const { data: t } = await sp
        .from("marketing_campaigns_targets")
        .select("id, status")
        .eq("store_id", store_id)
        .eq("campaign_id", c.id)
        .eq("visitor_id", visitor_id)
        .in("status", ["pending"])
        .limit(1)
        .maybeSingle();

      if (!t) continue;
      targetRow = t;
    }

    const expires_at = addHours(now, 24).toISOString();

    if (impr?.id) {
      await sp
        .from("marketing_campaigns_impressions")
        .update({
          last_seen_at: now.toISOString(),
          expires_at,
          seen_count: 1,
          path,
          page_url,
          user_agent: req.headers.get("user-agent"),
          client_ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
          target_id: targetRow?.id ?? null,
        })
        .eq("id", impr.id);
    } else {
      await sp.from("marketing_campaigns_impressions").insert({
        store_id,
        campaign_id: c.id,
        visitor_id,
        target_id: targetRow?.id ?? null,
        first_seen_at: now.toISOString(),
        last_seen_at: now.toISOString(),
        seen_count: 1,
        expires_at,
        path,
        page_url,
        user_agent: req.headers.get("user-agent"),
        client_ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
      });
    }

    await sp.from("marketing_campaigns_funnel_events").insert({
      store_id,
      campaign_id: c.id,
      target_id: targetRow?.id ?? null,
      event_type: "impression",
      meta: { path, page_url },
    });

    return NextResponse.json({
      show: true,
      campaign: {
        id: c.id,
        title: c.title,
        variant: c.onsite_variant || "popup",
        headline: c.onsite_headline ?? c.title,
        body: c.onsite_body ?? "",
        cta_text: c.onsite_cta_text ?? "عرض التفاصيل",
        cta_url: c.onsite_cta_url ?? null,
        audience_mode: c.audience_mode,
      },
    });
  }

  return NextResponse.json({ show: false });
}
