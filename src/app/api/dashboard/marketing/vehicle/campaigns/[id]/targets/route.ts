// FILE: src/app/api/dashboard/marketing/vehicle/campaigns/[id]/targets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const storeId = await getCurrentStoreId();
    const supabase = getSupabaseServerClient();

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const status = (url.searchParams.get("status") || "").trim();
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
    const cursor = url.searchParams.get("cursor"); // last seen target id (for pagination)

    let query = supabase
      .from("marketing_campaigns_targets")
      .select(
        "id, visitor_id, salla_customer_id, customer_name, customer_email, customer_phone, signals_count, last_signal_at, status, created_at"
      )
      .eq("store_id", storeId)
      .eq("campaign_id", Number(id))
      .order("id", { ascending: false })
      .limit(limit + 1); // +1 to detect nextCursor

    if (cursor) query = query.lt("id", Number(cursor));
    if (status) query = query.eq("status", status);

    // search (name/email/phone/customer_id)
    if (q) {
      query = query.or(
        `customer_name.ilike.%${q}%,customer_email.ilike.%${q}%,customer_phone.ilike.%${q}%,salla_customer_id.ilike.%${q}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = data ?? [];
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? String(items[items.length - 1].id) : null;

    return NextResponse.json({ items, nextCursor });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to load targets" }, { status: 500 });
  }
}
