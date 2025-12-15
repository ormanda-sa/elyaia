import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

function ymdToRange(from: string, to: string) {
  const fromTs = `${from}T00:00:00.000Z`;
  const toTs = `${to}T23:59:59.999Z`;
  return { fromTs, toTs };
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const storeId = await getCurrentStoreId();
    if (!storeId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const url = new URL(req.url);
    const from = url.searchParams.get("from") || "";
    const to = url.searchParams.get("to") || "";
    if (!from || !to) return NextResponse.json({ error: "from/to required" }, { status: 400 });

    const { fromTs, toTs } = ymdToRange(from, to);

    // 1) totals: visitors/users
    const [{ data: visitorsDistinct }, { data: usersDistinct }] = await Promise.all([
      supabase
        .from("visitors_page_views")
        .select("visitor_id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .gte("occurred_at", fromTs)
        .lte("occurred_at", toTs),
      supabase
        .from("visitors_customers")
        .select("salla_customer_id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .gte("last_seen_at", fromTs)
        .lte("last_seen_at", toTs),
    ]);

    // visitorsDistinct/usersDistinct counts are in headers; supabase-js returns as count in response in some setups.
    // safer: re-run with count using normal select to capture count in response
    const { count: visitorsCount } = await supabase
      .from("visitors_page_views")
      .select("visitor_id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .gte("occurred_at", fromTs)
      .lte("occurred_at", toTs);

    const { count: usersCount } = await supabase
      .from("visitors_customers")
      .select("salla_customer_id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .gte("last_seen_at", fromTs)
      .lte("last_seen_at", toTs);

    // 2) active last 30 minutes (visitors + users)
    const since30 = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { data: activeVisitorRows, error: aErr } = await supabase
      .from("visitors_page_views")
      .select("visitor_id, occurred_at")
      .eq("store_id", storeId)
      .gte("occurred_at", since30)
      .order("occurred_at", { ascending: true });

    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

    const activeVisitorsSet = new Set((activeVisitorRows || []).map(r => r.visitor_id));
    const activeVisitors = activeVisitorsSet.size;

    // sparkline buckets: last 30 minutes per minute
    const buckets = Array.from({ length: 30 }, (_, i) => i);
    const now = Date.now();
    const spark = buckets.map((i) => {
      const start = now - (30 - i) * 60 * 1000;
      const end = start + 60 * 1000;
      const c = (activeVisitorRows || []).filter(r => {
        const t = new Date(r.occurred_at).getTime();
        return t >= start && t < end;
      }).length;
      return { minute: i + 1, count: c };
    });

    // 3) timeseries daily: new vs returning visitors + users
    // new visitor = first_seen_at داخل اليوم
    // returning = first_seen_at قبل اليوم وظهر داخل اليوم
    const { data: firstSeen, error: fErr } = await supabase
      .from("visitor_first_seen")
      .select("visitor_id, first_seen_at")
      .eq("store_id", storeId);

    if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });

    const firstMap = new Map<string, number>();
    (firstSeen || []).forEach((r: any) => firstMap.set(r.visitor_id, new Date(r.first_seen_at).getTime()));

    const { data: viewsInRange, error: vErr } = await supabase
      .from("visitors_page_views")
      .select("visitor_id, occurred_at")
      .eq("store_id", storeId)
      .gte("occurred_at", fromTs)
      .lte("occurred_at", toTs);

    if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 });

    // build daily sets
    const dayKey = (iso: string) => iso.slice(0, 10); // YYYY-MM-DD
    const dayVisitors = new Map<string, Set<string>>();
    (viewsInRange || []).forEach((r: any) => {
      const d = dayKey(r.occurred_at);
      if (!dayVisitors.has(d)) dayVisitors.set(d, new Set());
      dayVisitors.get(d)!.add(r.visitor_id);
    });

    const { data: usersLinksInRange, error: uErr } = await supabase
      .from("visitors_customers")
      .select("salla_customer_id, last_seen_at")
      .eq("store_id", storeId)
      .gte("last_seen_at", fromTs)
      .lte("last_seen_at", toTs);

    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

    const dayUsers = new Map<string, Set<string>>();
    (usersLinksInRange || []).forEach((r: any) => {
      const d = dayKey(r.last_seen_at);
      if (!dayUsers.has(d)) dayUsers.set(d, new Set());
      dayUsers.get(d)!.add(String(r.salla_customer_id));
    });

    // build date list
    const startD = new Date(fromTs);
    const endD = new Date(toTs);
    const days: string[] = [];
    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
      days.push(d.toISOString().slice(0, 10));
    }

    const series = days.map((d) => {
      const visitorsSet = dayVisitors.get(d) || new Set<string>();
      let newCount = 0;
      let returningCount = 0;

      visitorsSet.forEach((vid) => {
        const first = firstMap.get(vid) ?? 0;
        const dayStart = new Date(`${d}T00:00:00.000Z`).getTime();
        const dayEnd = new Date(`${d}T23:59:59.999Z`).getTime();
        if (first >= dayStart && first <= dayEnd) newCount++;
        else if (first > 0 && first < dayStart) returningCount++;
      });

      const usersSet = dayUsers.get(d) || new Set<string>();

      return {
        date: d,
        visitors_new: newCount,
        visitors_returning: returningCount,
        users: usersSet.size,
      };
    });

    // 4) countries (top 10) within range
    const { data: countriesRows, error: cErr } = await supabase
      .from("visitors_page_views")
      .select("country_code, visitor_id")
      .eq("store_id", storeId)
      .gte("occurred_at", fromTs)
      .lte("occurred_at", toTs);

    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

    const countryMap = new Map<string, Set<string>>();
    (countriesRows || []).forEach((r: any) => {
      const cc = r.country_code || "NA";
      if (!countryMap.has(cc)) countryMap.set(cc, new Set());
      countryMap.get(cc)!.add(r.visitor_id);
    });

    const countries = Array.from(countryMap.entries())
      .map(([code, set]) => ({ country_code: code, visitors: set.size }))
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 10);

    return NextResponse.json({
      ok: true,
      totals: {
        visitors: visitorsCount || 0,
        users: usersCount || 0,
        active_visitors_30m: activeVisitors,
      },
      spark_30m: spark,
      series,
      countries,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "SERVER_ERROR", details: String(e?.message || e) }, { status: 500 });
  }
}
