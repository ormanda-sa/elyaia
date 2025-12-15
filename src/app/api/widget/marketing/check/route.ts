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
  try {
    // لو جت URL كامل
    if (p.startsWith("http")) return new URL(p).pathname || "/";
  } catch {}
  return p.startsWith("/") ? p : "/" + p;
}

function parseAllowedPaths(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(normalizePath);
}

function pathAllowed(currentPath: string, allowed: string[]) {
  if (!allowed.length) return true; // ما فيه قيود = كل الصفحات
  const p = normalizePath(currentPath);
  return allowed.some((prefix) => p.startsWith(prefix));
}

export async function GET(req: NextRequest) {
  const sp = supabaseService();
  const { searchParams } = new URL(req.url);

  const store_id = searchParams.get("store_id") || "";
  const visitor_id = searchParams.get("visitor_id") || "";
  const path = searchParams.get("path") || "/";
  const page_url = searchParams.get("page_url") || null;

  if (!store_id || !visitor_id) {
    return NextResponse.json(
      { show: false, error: "missing store_id/visitor_id" },
      { status: 400 }
    );
  }

  const now = new Date();

  // 1) جيب الحملات النشطة + داخل المتجر
  const { data: campaigns, error: campErr } = await sp
    .from("marketing_campaigns_vehicle")
    .select(
      `
      id, store_id, title, status,
      scope_level, brand_id, model_id, year_id,
      audience_mode, only_customers, lookback_days, min_signals,
      send_onsite, onsite_enabled, onsite_variant, onsite_headline, onsite_body, onsite_cta_text, onsite_cta_url,
      starts_at, ends_at,
      onsite_paths,
      updated_at
    `
    )
    .eq("store_id", store_id)
    .eq("status", "active")
    .eq("send_onsite", true)
    .order("updated_at", { ascending: false });

  if (campErr) {
    return NextResponse.json({ show: false, error: campErr.message }, { status: 500 });
  }

  if (!campaigns?.length) return NextResponse.json({ show: false });

  // 2) فلترة وقت + فلترة صفحة
  const eligible = campaigns.filter((c: any) => {
    const starts = c.starts_at ? new Date(c.starts_at) : null;
    const ends = c.ends_at ? new Date(c.ends_at) : null;
    if (starts && now < starts) return false;
    if (ends && now > ends) return false;

    // onsite_enabled إذا موجودة في DB، لو ما عندك عمودها تجاهلها
    if (typeof c.onsite_enabled === "boolean" && c.onsite_enabled === false) return false;

    const allowed = parseAllowedPaths(c.onsite_paths);
    return pathAllowed(path, allowed);
  });

  if (!eligible.length) return NextResponse.json({ show: false });

  // 3) ترتيب: targeted أولاً ثم public
  eligible.sort((a: any, b: any) => {
    const aw = a.audience_mode === "targeted" ? 0 : 1;
    const bw = b.audience_mode === "targeted" ? 0 : 1;
    return aw - bw;
  });

  // 4) اختر أول حملة تنفع + Dedup 24 ساعة
  for (const c of eligible as any[]) {
    // Dedup
    const { data: impr } = await sp
      .from("marketing_campaigns_impressions")
      .select("id, expires_at")
      .eq("store_id", store_id)
      .eq("campaign_id", c.id)
      .eq("visitor_id", visitor_id)
      .maybeSingle();

    if (impr?.expires_at && new Date(impr.expires_at) > now) {
      continue; // شافها قبل أقل من 24 ساعة
    }

    // targeted لازم targets
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

    // سجّل impression
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
