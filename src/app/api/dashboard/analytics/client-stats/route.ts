import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStoreId } from "@/lib/currentStore";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

// helper: نبني مدى اليوم من/إلى (اليوم كامل) بدون لعب UTC
function buildDateRange(from: string, to: string) {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);

  const fromDate = new Date(
    Date.UTC(fy, (fm || 1) - 1, fd || 1, 0, 0, 0, 0),
  );
  const toDate = new Date(
    Date.UTC(ty, (tm || 1) - 1, td || 1, 23, 59, 59, 999),
  );

  return {
    fromIso: fromDate.toISOString(),
    toIso: toDate.toISOString(),
  };
}

function classifyDevice(ua: string): "desktop" | "mobile" | "tablet" | "other" {
  const u = ua.toLowerCase();
  if (!u) return "other";
  if (u.includes("ipad") || u.includes("tablet")) return "tablet";
  if (u.includes("mobile") || u.includes("iphone") || u.includes("android"))
    return "mobile";
  if (u.includes("windows") || u.includes("macintosh") || u.includes("linux"))
    return "desktop";
  return "other";
}

function classifyBrowser(ua: string): string {
  const u = ua.toLowerCase();
  if (!u) return "Unknown";
  if (u.includes("edg")) return "Edge";
  if (u.includes("opr") || u.includes("opera")) return "Opera";
  if (u.includes("firefox")) return "Firefox";
  if (u.includes("safari") && !u.includes("chrome")) return "Safari";
  if (u.includes("chrome")) return "Chrome";
  return "Other";
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

    const { fromIso, toIso } = buildDateRange(from, to);

    // نجيب meta من أحداث search_submit
    const { data, error } = await supabase
      .from("widget_events")
      .select("meta")
      .eq("store_id", storeId)
      .eq("event_type", "search_submit")
      .gte("created_at", fromIso)
      .lte("created_at", toIso);

    if (error) {
      console.error("client-stats select error", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    const rows = (data as { meta: any }[]) || [];

    const deviceCounts: Record<string, number> = {};
    const browserCounts: Record<string, number> = {};
    let total = 0;

    for (const row of rows) {
      const ua = (row.meta && row.meta.user_agent) || "";
      if (!ua) continue;
      total += 1;

      const device = classifyDevice(ua);
      const browser = classifyBrowser(ua);

      deviceCounts[device] = (deviceCounts[device] || 0) + 1;
      browserCounts[browser] = (browserCounts[browser] || 0) + 1;
    }

    const devices = Object.entries(deviceCounts).map(([type, count]) => ({
      type,
      count,
    }));
    const browsers = Object.entries(browserCounts).map(([name, count]) => ({
      name,
      count,
    }));

    return NextResponse.json({
      store_id: storeId,
      from,
      to,
      from_iso: fromIso,
      to_iso: toIso,
      total_events: total,
      devices,
      browsers,
    });
  } catch (err) {
    console.error("client-stats unexpected", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
