import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const storeId = await getCurrentStoreId();
    if (!storeId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    if (!from || !to) return NextResponse.json({ error: "from/to required" }, { status: 400 });

    const fromTs = `${from}T00:00:00.000Z`;
    const toTs = `${to}T23:59:59.999Z`;

    // totals
    const { data: pvRows, error: pvErr } = await supabase
      .from("visitors_page_views")
      .select("visitor_id, path, page_url, occurred_at")
      .eq("store_id", storeId)
      .gte("occurred_at", fromTs)
      .lte("occurred_at", toTs);

    if (pvErr) return NextResponse.json({ error: pvErr.message }, { status: 500 });

    const visitorSet = new Set<string>();
    const pageMap = new Map<string, number>();
    (pvRows || []).forEach((r: any) => {
      visitorSet.add(r.visitor_id);
      const key = (r.path || r.page_url || "unknown") as string;
      pageMap.set(key, (pageMap.get(key) || 0) + 1);
    });

    const top_pages = Array.from(pageMap.entries())
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    const { data: usersLinks, error: uErr } = await supabase
      .from("visitors_customers")
      .select("salla_customer_id")
      .eq("store_id", storeId)
      .gte("last_seen_at", fromTs)
      .lte("last_seen_at", toTs);

    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

    const userSet = new Set((usersLinks || []).map((r: any) => String(r.salla_customer_id)));

    // top products
    const { data: prodRows, error: pErr } = await supabase
      .from("price_drop_product_views")
      .select("product_id, product_title, product_url, viewed_at")
      .eq("store_id", storeId)
      .gte("viewed_at", fromTs)
      .lte("viewed_at", toTs);

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

    const prodMap = new Map<string, { product_id: string; product_title: string | null; product_url: string | null; views: number }>();
    (prodRows || []).forEach((r: any) => {
      const id = String(r.product_id);
      const cur = prodMap.get(id);
      if (cur) cur.views += 1;
      else prodMap.set(id, { product_id: id, product_title: r.product_title || null, product_url: r.product_url || null, views: 1 });
    });

    const top_products = Array.from(prodMap.values())
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    return NextResponse.json({
      ok: true,
      totals: {
        visitors: visitorSet.size,
        users: userSet.size,
        page_views: (pvRows || []).length,
      },
      top_pages,
      top_products,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "SERVER_ERROR", details: String(e?.message || e) }, { status: 500 });
  }
}
