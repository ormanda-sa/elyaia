// src/app/api/general-manager/stores/[storeId]/overview/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ storeId: string }> },
) {
  try {
    const { storeId } = await context.params; // 👈 هنا الحل
    const supabase = getSupabaseServerClient();

    // بيانات المتجر الأساسية
    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select("id, name, domain, owner_email, status, created_at")
      .eq("id", storeId)
      .maybeSingle();

    if (storeErr) {
      console.error("[STORE OVERVIEW] store error:", storeErr);
      return NextResponse.json(
        { ok: false, message: "STORE_QUERY_FAILED" },
        { status: 500 },
      );
    }

    if (!store) {
      return NextResponse.json(
        {
          ok: false,
          message: "STORE_NOT_FOUND",
          store: null,
          stats: { total_searches_90d: 0, monthly_revenue: 0 },
          activity: [],
          subscriptions: [],
        },
        { status: 200 },
      );
    }

    const now = new Date();
    const from90 = new Date();
    from90.setDate(from90.getDate() - 90);

    // أحداث البحث (search_submit) آخر 90 يوم
    const { data: events, error: eventsErr } = await supabase
      .from("widget_events")
      .select("created_at")
      .eq("store_id", storeId)
      .eq("event_type", "search_submit")
      .gte("created_at", from90.toISOString())
      .lte("created_at", now.toISOString());

    if (eventsErr) {
      console.error("[STORE OVERVIEW] events error:", eventsErr);
    }

    const activityMap = new Map<string, number>();
    (events || []).forEach((e) => {
      const d = new Date(e.created_at as string);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      activityMap.set(key, (activityMap.get(key) || 0) + 1);
    });

    const activity = Array.from(activityMap.entries())
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .map(([date, searches]) => ({ date, searches }));

    const totalSearches = events?.length ?? 0;

    // الاشتراكات الخاصة بهذا المتجر
    const { data: subs, error: subsErr } = await supabase
      .from("subscriptions")
      .select(
        "id, plan_code, billing_cycle, price_cents, status, start_at, end_at, created_at",
      )
      .eq("store_id", storeId)
      .order("start_at", { ascending: false });

    if (subsErr) {
      console.error("[STORE OVERVIEW] subs error:", subsErr);
    }

    const subscriptions = subs || [];
    const currentSub =
      subscriptions.find((s) => s.status === "active") ||
      subscriptions[0] ||
      null;

    const monthlyRevenue =
      currentSub && currentSub.status === "active"
        ? currentSub.price_cents / 100
        : 0;

    return NextResponse.json(
      {
        ok: true,
        store,
        stats: {
          total_searches_90d: totalSearches,
          monthly_revenue: monthlyRevenue,
        },
        activity,
        subscriptions,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[STORE OVERVIEW] INTERNAL_ERROR:", err);
    return NextResponse.json(
      { ok: false, message: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
