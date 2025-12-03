import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStoreId } from "@/lib/currentStore";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

// توقيت السعودية +3 عن UTC
const TZ_OFFSET_HOURS = 3;

// from/to = YYYY-MM-DD (محلي) → مدى UTC يغطي اليوم كامل في KSA
function buildLocalKsaDateRange(fromStr: string, toStr: string) {
  const [fy, fm, fd] = fromStr.split("-").map(Number);
  const [ty, tm, td] = toStr.split("-").map(Number);

  // بداية اليوم المحلي 00:00 (KSA) → UTC -3
  const fromUtc = new Date(
    Date.UTC(fy, (fm || 1) - 1, fd || 1, 0 - TZ_OFFSET_HOURS, 0, 0, 0),
  );
  // نهاية اليوم المحلي 23:59:59 (KSA) → UTC 20:59:59
  const toUtc = new Date(
    Date.UTC(ty, (tm || 1) - 1, td || 1, 23 - TZ_OFFSET_HOURS, 59, 59, 999),
  );

  return {
    fromIso: fromUtc.toISOString(),
    toIso: toUtc.toISOString(),
  };
}

// تنسيق تاريخ افتراضي (لو ما انرسل from/to)
function fmtDateLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const storeId = await getCurrentStoreId();
    let from = searchParams.get("from");
    let to = searchParams.get("to");

    if (!storeId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    // افتراضي: آخر 30 يوم حسب توقيت السعودية
    const now = new Date();
    const defaultFromDate = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000,
    );
    if (!from) from = fmtDateLocal(defaultFromDate);
    if (!to) to = fmtDateLocal(now);

    const { fromIso, toIso } = buildLocalKsaDateRange(from, to);

    // نجيب كل الأحداث في الفترة
    const { data, error: byTypeError } = await supabase
      .from("widget_events")
      .select("event_type")
      .eq("store_id", storeId)
      .gte("created_at", fromIso)
      .lte("created_at", toIso);

    if (byTypeError) {
      console.error("overview byTypeError", byTypeError);
      return NextResponse.json(
        { error: byTypeError.message },
        { status: 500 },
      );
    }

    const events = (data as { event_type: string }[]) || [];

    const counters: Record<string, number> = {};
    for (const ev of events) {
      const t = ev.event_type || "unknown";
      counters[t] = (counters[t] || 0) + 1;
    }

    const totalEvents = Object.values(counters).reduce(
      (sum, v) => sum + v,
      0,
    );

    const response = {
      store_id: storeId,
      from,
      to,
      from_iso: fromIso,
      to_iso: toIso,
      total_events: totalEvents,
      counters: {
        brand_select: counters["brand_select"] || 0,
        model_select: counters["model_select"] || 0,
        year_select: counters["year_select"] || 0,
        section_select: counters["section_select"] || 0,
        keyword_click: counters["keyword_click"] || 0,
        search_submit: counters["search_submit"] || 0,
      },
      top_brand: null as null,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("overview unexpected", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
