// FILE: src/app/api/widget/marketing/check/route.ts
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

function scopeMatch(c: any, s: any) {
  // c = campaign, s = signal
  if (!s) return false;

  if (c.scope_level === "brand") return !!c.brand_id && c.brand_id === s.brand_id;
  if (c.scope_level === "model") return !!c.model_id && c.model_id === s.model_id;
  if (c.scope_level === "year") return !!c.year_id && c.year_id === s.year_id;

  return false;
}

export async function GET(req: NextRequest) {
  const sp = supabaseService();

  const { searchParams } = new URL(req.url);
  const store_id = searchParams.get("store_id") || "";
  const visitor_id = searchParams.get("visitor_id") || "";
  const path = searchParams.get("path") || null;
  const page_url = searchParams.get("page_url") || null;

  if (!store_id || !visitor_id) {
    return NextResponse.json({ show: false, error: "missing store_id/visitor_id" }, { status: 400 });
  }

  // 1) آخر إشارة سيارة للزائر (نستخدمها لتحديد نطاق الحملة)
  const lookbackDays = 30; // سقف عام، وبعدين كل حملة لها lookback_days
  const lookbackSince = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: lastSignal } = await sp
    .from("visitor_vehicle_signals")
    .select("brand_id,model_id,year_id,occurred_at")
    .eq("store_id", store_id)
    .eq("visitor_id", visitor_id)
    .gte("occurred_at", lookbackSince)
    .order("occurred_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 2) اجلب الحملات النشطة + مفعل فيها onsite
  // ملاحظة: public و targeted الاثنين هنا، بس targeted لازم target membership
  const { data: campaigns, error: campErr } = await sp
    .from("marketing_campaigns_vehicle")
    .select(`
      id, store_id, title, status, scope_level,
      brand_id, model_id, year_id,
      audience_mode, only_customers, lookback_days, min_signals,
      send_onsite, onsite_enabled, onsite_variant, onsite_headline, onsite_body, onsite_cta_text, onsite_cta_url,
      starts_at, ends_at
    `)
    .eq("store_id", store_id)
    .eq("status", "active")
    .eq("send_onsite", true)
    .eq("onsite_enabled", true)
    .order("updated_at", { ascending: false });

  if (campErr) {
    return NextResponse.json({ show: false, error: campErr.message }, { status: 500 });
  }

  if (!campaigns || campaigns.length === 0) {
    return NextResponse.json({ show: false });
  }

  // 3) فلترة حسب النطاق + التوقيت + lookback للحملة
  const now = new Date();

  const eligible = [];
  for (const c of campaigns) {
    const starts = c.starts_at ? new Date(c.starts_at) : null;
    const ends = c.ends_at ? new Date(c.ends_at) : null;
    if (starts && now < starts) continue;
    if (ends && now > ends) continue;

    // لو ما عندنا signal، ما نقدر نثبت أنه داخل Brand/Model/Year.
    // هنا قرار “تقليدي”: ما نعرض حملة Vehicle إلا لو عندنا إشارة سيارة.
    if (!lastSignal) continue;

    // لازم الإشارة تكون داخل lookback_days للحملة
    const lb = new Date(Date.now() - (c.lookback_days ?? 7) * 24 * 60 * 60 * 1000);
    const sigAt = new Date(lastSignal.occurred_at);
    if (sigAt < lb) continue;

    // نطاق الحملة
    if (!scopeMatch(c, lastSignal)) continue;

    eligible.push(c);
  }

  if (eligible.length === 0) {
    return NextResponse.json({ show: false });
  }

  // 4) رتبهم: targeted أولاً (أقوى)، ثم public
  eligible.sort((a: any, b: any) => {
    const aw = a.audience_mode === "targeted" ? 0 : 1;
    const bw = b.audience_mode === "targeted" ? 0 : 1;
    return aw - bw;
  });

  // 5) اختر أول حملة تتحقق شروطها + Dedup
  for (const c of eligible) {
    // 5.1) Dedup check
    const { data: impr } = await sp
      .from("marketing_campaigns_impressions")
      .select("id, expires_at")
      .eq("store_id", store_id)
      .eq("campaign_id", c.id)
      .eq("visitor_id", visitor_id)
      .maybeSingle();

    if (impr?.expires_at && new Date(impr.expires_at) > now) {
      continue; // شافها خلال 24 ساعة
    }

    // 5.2) لو targeted: لازم يكون ضمن targets وبحالة pending (أو أي منطق تبغاه)
    let targetRow: any = null;

    if (c.audience_mode === "targeted") {
      const { data: t } = await sp
        .from("marketing_campaigns_targets")
        .select("id, status")
        .eq("store_id", store_id)
        .eq("campaign_id", c.id)
        .eq("visitor_id", visitor_id)
        .in("status", ["pending"]) // تقدر توسعها لاحقًا
        .limit(1)
        .maybeSingle();

      if (!t) continue;
      targetRow = t;
    }

    // 5.3) سجّل impression (upsert)
    const expires_at = addHours(now, 24).toISOString();

    const payload = {
      store_id,
      campaign_id: c.id,
      visitor_id,
      target_id: targetRow?.id ?? null,
      path,
      page_url,
      user_agent: req.headers.get("user-agent"),
      client_ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
      expires_at,
      first_seen_at: now.toISOString(),
      last_seen_at: now.toISOString(),
      seen_count: 1,
    };

    // إذا كان موجود قبل (وانتهى)، نعمل update بدل insert
    if (impr?.id) {
      await sp
        .from("marketing_campaigns_impressions")
        .update({
          last_seen_at: now.toISOString(),
          expires_at,
          seen_count: (1), // reset
          path,
          page_url,
          user_agent: payload.user_agent,
          client_ip: payload.client_ip,
          target_id: payload.target_id,
        })
        .eq("id", impr.id);
    } else {
      await sp.from("marketing_campaigns_impressions").insert(payload);
    }

    // (اختياري) Funnel event
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
        variant: c.onsite_variant,
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
