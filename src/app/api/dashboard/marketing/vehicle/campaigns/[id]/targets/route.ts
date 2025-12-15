import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const campaignId = Number(id);
    const storeId = await getCurrentStoreId();
    if (!storeId) return NextResponse.json({ error: "store_id not found" }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const url = new URL(req.url);

    const q = (url.searchParams.get("q") || "").trim();
    const status = (url.searchParams.get("status") || "").trim(); // pending/notified/converted/skipped
    const onlyCustomers = url.searchParams.get("only_customers") === "true";

    // targets
    let tQuery = supabase
      .from("marketing_campaigns_targets")
      .select(`
        id, visitor_id, salla_customer_id, customer_name, customer_email, customer_phone,
        signals_count, last_signal_at, status, notified_at, created_at
      `)
      .eq("store_id", storeId)
      .eq("campaign_id", campaignId)
      .order("last_signal_at", { ascending: false })
      .limit(200);

    if (status) tQuery = tQuery.eq("status", status);
    if (onlyCustomers) tQuery = tQuery.not("salla_customer_id", "is", null);

    if (q) {
      // بحث بسيط: اسم/ايميل/جوال/visitor_id
      tQuery = tQuery.or(
        `visitor_id.ilike.%${q}%,customer_name.ilike.%${q}%,customer_email.ilike.%${q}%,customer_phone.ilike.%${q}%`
      );
    }

    const { data: targets, error: e1 } = await tQuery;
    if (e1) throw e1;

    const ids = (targets ?? []).map((t) => t.id);
    if (!ids.length) return NextResponse.json({ items: [] });

    // messages (نجيب آخر رسالة لكل target لكل قناة)
    const { data: msgs, error: e2 } = await supabase
      .from("marketing_campaigns_messages")
      .select("id, target_id, channel, status, scheduled_at, sent_at, failed_at, error_message")
      .eq("store_id", storeId)
      .eq("campaign_id", campaignId)
      .in("target_id", ids)
      .order("created_at", { ascending: false })
      .limit(2000);

    if (e2) throw e2;

    const byTarget: Record<string, any> = {};
    for (const m of msgs ?? []) {
      const k = String(m.target_id);
      if (!byTarget[k]) byTarget[k] = { email: null, whatsapp: null, onsite: null };
      if (!byTarget[k][m.channel]) byTarget[k][m.channel] = m; // أول واحد = الأحدث
    }

    const items = (targets ?? []).map((t) => ({
      ...t,
      messages: byTarget[String(t.id)] || { email: null, whatsapp: null, onsite: null },
    }));

    return NextResponse.json({ items });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed" }, { status: 500 });
  }
}
