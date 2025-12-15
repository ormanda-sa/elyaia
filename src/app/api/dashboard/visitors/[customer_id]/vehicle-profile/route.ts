import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ customer_id: string }> },
) {
  try {
    const supabase = getSupabaseServerClient();
    const storeId = await getCurrentStoreId();
    if (!storeId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const { customer_id } = await ctx.params;
    const customerId = String(customer_id || "").trim();
    if (!customerId) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    const { data: link, error: linkErr } = await supabase
      .from("visitors_customers")
      .select("visitor_id")
      .eq("store_id", storeId)
      .eq("salla_customer_id", customerId)
      .order("last_seen_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 });
    if (!link?.visitor_id) return NextResponse.json({ ok: true, profile: null });

    const visitorId = String(link.visitor_id);

    const { data: prof, error: pErr } = await supabase
      .from("visitor_vehicle_profile_7d")
      .select("brand_id,model_id,year_id,signals_7d,last_signal_at")
      .eq("store_id", storeId)
      .eq("visitor_id", visitorId)
      .maybeSingle();

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
    if (!prof) return NextResponse.json({ ok: true, profile: null });

    const [b, m, y] = await Promise.all([
      prof.brand_id
        ? supabase
            .from("filter_brands")
            .select("name_ar")
            .eq("store_id", storeId)
            .eq("id", prof.brand_id)
            .maybeSingle()
        : Promise.resolve({ data: null as any }),
      prof.model_id
        ? supabase
            .from("filter_models")
            .select("name_ar")
            .eq("store_id", storeId)
            .eq("id", prof.model_id)
            .maybeSingle()
        : Promise.resolve({ data: null as any }),
      prof.year_id
        ? supabase
            .from("filter_years")
            .select("year")
            .eq("store_id", storeId)
            .eq("id", prof.year_id)
            .maybeSingle()
        : Promise.resolve({ data: null as any }),
    ]);

    return NextResponse.json({
      ok: true,
      profile: {
        visitor_id: visitorId,
        brand_id: prof.brand_id ?? null,
        model_id: prof.model_id ?? null,
        year_id: prof.year_id ?? null,
        signals_7d: prof.signals_7d ?? 0,
        last_signal_at: prof.last_signal_at ?? null,
        brand_name: b.data?.name_ar ?? null,
        model_name: m.data?.name_ar ?? null,
        year_text: y.data?.year ?? null,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "SERVER_ERROR", details: String(e?.message || e) },
      { status: 500 },
    );
  }
}
