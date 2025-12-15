import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ customer_id: string }> },
) {
  try {
    const supabase = getSupabaseServerClient();
    const storeId = await getCurrentStoreId();
    if (!storeId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const { customer_id } = await ctx.params;
    const customerId = String(customer_id || "").trim();
    if (!customerId) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    // نجيب أحدث visitor_id للعميل
    const { data: link, error: linkErr } = await supabase
      .from("visitors_customers")
      .select("visitor_id")
      .eq("store_id", storeId)
      .eq("salla_customer_id", customerId)
      .order("last_seen_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 });
    if (!link?.visitor_id) return NextResponse.json({ ok: true, items: [] });

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 200) || 200, 1000);

    const { data, error } = await supabase
      .from("price_drop_product_views")
      .select("viewed_at,product_id,product_title,product_url,product_image_url,current_price")
      .eq("store_id", storeId)
      .eq("visitor_id", link.visitor_id)
      .order("viewed_at", { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, items: data || [] });
  } catch (e: any) {
    return NextResponse.json(
      { error: "SERVER_ERROR", details: String(e?.message || e) },
      { status: 500 },
    );
  }
}
