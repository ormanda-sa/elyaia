import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const storeId = await getCurrentStoreId();
    if (!storeId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const limit = Math.min(Number(url.searchParams.get("limit") || 50) || 50, 200);

    const cursorLastSeen = url.searchParams.get("cursor_last_seen");
    const cursorCustomerId = url.searchParams.get("cursor_customer_id");

    let query = supabase
      .from("customer_journey_summary")
      .select("*")
      .eq("store_id", storeId)
      .order("last_seen_at", { ascending: false })
      .order("salla_customer_id", { ascending: false })
      .limit(limit + 1); // عشان نعرف فيه صفحة بعدها

    if (q) {
      if (/^\d+$/.test(q)) {
        query = query.eq("salla_customer_id", q);
      } else {
        query = query.or(
          `customer_name.ilike.%${q}%,customer_email.ilike.%${q}%,customer_phone.ilike.%${q}%`,
        );
      }
    }

    // cursor pagination (keyset)
    if (cursorLastSeen && cursorCustomerId) {
      // (last_seen_at, salla_customer_id) < (cursorLastSeen, cursorCustomerId)
      query = query.or(
        `and(last_seen_at.lt.${cursorLastSeen}),and(last_seen_at.eq.${cursorLastSeen},salla_customer_id.lt.${cursorCustomerId})`,
      );
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = data || [];
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    const nextCursor =
      hasMore && items.length
        ? {
            cursor_last_seen: items[items.length - 1].last_seen_at,
            cursor_customer_id: items[items.length - 1].salla_customer_id,
          }
        : null;

    return NextResponse.json({ ok: true, items, nextCursor });
  } catch (e: any) {
    return NextResponse.json({ error: "SERVER_ERROR", details: String(e?.message || e) }, { status: 500 });
  }
}
