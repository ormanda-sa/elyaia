import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStoreId } from "@/lib/currentStore";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

// توقيت السعودية +3 ساعات عن UTC
const TZ_OFFSET_HOURS = 3;
const TZ_MS = TZ_OFFSET_HOURS * 60 * 60 * 1000;

// from/to = YYYY-MM-DD (محلي) → مدى UTC يغطي اليوم كامل في KSA
function buildLocalKsaDateRange(fromStr: string, toStr: string) {
  const [fy, fm, fd] = fromStr.split("-").map(Number);
  const [ty, tm, td] = toStr.split("-").map(Number);

  const fromUtc = new Date(
    Date.UTC(fy, (fm || 1) - 1, fd || 1, 0 - TZ_OFFSET_HOURS, 0, 0, 0),
  );
  const toUtc = new Date(
    Date.UTC(ty, (tm || 1) - 1, td || 1, 23 - TZ_OFFSET_HOURS, 59, 59, 999),
  );

  return {
    fromIso: fromUtc.toISOString(),
    toIso: toUtc.toISOString(),
  };
}

// نحول "YYYY-MM-DD" إلى Date محلي للتكرار على الأيام
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

// تنسيق YYYY-MM-DD من Date
function formatYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const storeId = await getCurrentStoreId();
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!storeId || !from || !to) {
      return NextResponse.json(
        { error: "UNAUTHORIZED_OR_MISSING_RANGE" },
        { status: 400 },
      );
    }

    const { fromIso, toIso } = buildLocalKsaDateRange(from, to);

    // 1) نجيب كل search_submit في الفترة (حسب UTC المعدّل)
    const { data, error } = await supabase
      .from("widget_events")
      .select("created_at")
      .eq("store_id", storeId)
      .eq("event_type", "search_submit")
      .gte("created_at", fromIso)
      .lte("created_at", toIso);

    if (error) {
      console.error("search-timeseries select error", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    const events = (data as { created_at: string }[]) || [];

    // 2) نعدها حسب اليوم الميلادي في توقيت السعودية
    const countsMap = new Map<string, number>();

    for (const ev of events) {
      const utc = new Date(ev.created_at); // وقت UTC من Supabase
      const localKsa = new Date(utc.getTime() + TZ_MS); // نحوله +3 ساعات
      const key = formatYMD(localKsa); // اليوم المحلي في KSA
      countsMap.set(key, (countsMap.get(key) || 0) + 1);
    }

    // 3) نضمن كل أيام الفترة موجودة حتى لو صفر
    const labels: string[] = [];
    const counts: number[] = [];

    const cursor = parseLocalDate(from);
    const end = parseLocalDate(to);

    while (cursor <= end) {
      const key = formatYMD(cursor);
      labels.push(key);
      counts.push(countsMap.get(key) || 0);
      cursor.setDate(cursor.getDate() + 1);
    }

    return NextResponse.json({
      store_id: storeId,
      from,
      to,
      from_iso: fromIso,
      to_iso: toIso,
      labels,
      counts,
    });
  } catch (err) {
    console.error("search-timeseries unexpected", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
