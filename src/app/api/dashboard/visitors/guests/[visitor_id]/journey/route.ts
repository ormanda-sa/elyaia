import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ visitor_id: string }> },
) {
  try {
    const supabase = getSupabaseServerClient();
    const storeId = await getCurrentStoreId();
    if (!storeId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const { visitor_id } = await ctx.params;
    const visitorId = String(visitor_id || "").trim();
    if (!visitorId) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 400) || 400, 2000);

    const { data, error } = await supabase
      .from("visitors_page_views")
      .select("occurred_at,path,page_url,referrer,user_agent,client_ip")
      .eq("store_id", storeId)
      .eq("visitor_id", visitorId)
      .order("occurred_at", { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, items: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: "SERVER_ERROR", details: String(e?.message || e) }, { status: 500 });
  }
}
