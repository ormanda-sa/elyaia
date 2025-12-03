import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStoreId } from "@/lib/currentStore";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

// توقيت السعودية +3
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

// لو ما انرسل from/to نستخدم آخر 30 يوم ميلادي
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
      return NextResponse.json(
        { error: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const now = new Date();
    const defaultFromDate = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000,
    );
    if (!from) from = fmtDateLocal(defaultFromDate);
    if (!to) to = fmtDateLocal(now);

    const { fromIso, toIso } = buildLocalKsaDateRange(from, to);

    // نجيب كل search_submit في الفترة
    const { data, error } = await supabase
      .from("widget_events")
      .select("created_at")
      .eq("store_id", storeId)
      .eq("event_type", "search_submit")
      .gte("created_at", fromIso)
      .lte("created_at", toIso);

    if (error) {
      console.error("daily-searches select error", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    const events = (data as { created_at: string }[]) || [];

    // counts[0..6] = Sun..Sat (لكن نحسب اليوم بعد تحويل الحدث لتوقيت السعودية)
    const counts = [0, 0, 0, 0, 0, 0, 0];

    for (const ev of events) {
      const utc = new Date(ev.created_at); // وقت UTC من Supabase
      const localKsa = new Date(utc.getTime() + TZ_MS); // نضيف +3 ساعات
      const dow = localKsa.getDay(); // 0..6 في KSA
      counts[dow] += 1;
    }

    return NextResponse.json({
      store_id: storeId,
      from,
      to,
      from_iso: fromIso,
      to_iso: toIso,
      counts,
    });
  } catch (err) {
    console.error("daily-searches unexpected", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
