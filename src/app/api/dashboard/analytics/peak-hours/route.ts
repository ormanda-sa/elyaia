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

    const { data, error } = await supabase
      .from("widget_events")
      .select("created_at")
      .eq("store_id", storeId)
      .eq("event_type", "search_submit")
      .gte("created_at", fromIso)
      .lte("created_at", toIso);

    if (error) {
      console.error("peak-hours select error", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    const events = (data as { created_at: string }[]) || [];

    // counts[0..23] = الساعة (0..23)
    const counts = Array(24).fill(0) as number[];

    for (const ev of events) {
      const d = new Date(ev.created_at);
      const hour = d.getUTCHours(); // نستخدم UTC لأننا بنينا المدى على UTC + تعويض KSA
      counts[hour] += 1;
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
    console.error("peak-hours unexpected", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
