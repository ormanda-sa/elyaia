import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

export async function GET(_req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("price_drop_stats", {
    p_store_id: storeId,
  });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  const row = Array.isArray(data) && data.length > 0 ? data[0] : data;

  return NextResponse.json({
    active_campaigns: row?.active_campaigns ?? 0,
    total_targets_last_7d: row?.total_targets_last_7d ?? 0,
    conversions_last_7d: row?.conversions_last_7d ?? 0,
  });
}
