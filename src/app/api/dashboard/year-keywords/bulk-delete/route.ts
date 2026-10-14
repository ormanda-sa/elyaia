import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const idsRaw = body?.ids;

    if (!Array.isArray(idsRaw) || idsRaw.length === 0) {
      return NextResponse.json({ error: "ids array is required" }, { status: 400 });
    }

    const ids = idsRaw
      .map((x: any) => Number(x))
      .filter((n: number) => Number.isFinite(n) && n > 0);

    if (ids.length === 0) {
      return NextResponse.json({ error: "No valid ids" }, { status: 400 });
    }

    // ✅ حذف دفعة واحدة (مع حماية store_id)
    const { data, error } = await supabase
      .from("filter_year_keywords")
      .delete()
      .eq("store_id", storeId)
      .in("id", ids)
      .select("id");

    if (error) {
      console.error("bulk delete year keywords error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const deletedCount = data?.length ?? 0;
    return NextResponse.json({ deletedCount });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}