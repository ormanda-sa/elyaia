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
    const body = await req.json().catch(() => ({} as any));
    const year_id = Number(body?.year_id);
    const ordered_ids = body?.ordered_ids as number[] | undefined;

    if (!year_id || Number.isNaN(year_id)) {
      return NextResponse.json({ error: "year_id is required" }, { status: 400 });
    }
    if (!Array.isArray(ordered_ids) || ordered_ids.length === 0) {
      return NextResponse.json({ error: "ordered_ids array is required" }, { status: 400 });
    }

    // ✅ نتأكد أن العناصر كلها ضمن نفس store + year
    const { data: existing, error: exErr } = await supabase
      .from("filter_year_keywords")
      .select("id, year_id")
      .eq("store_id", storeId)
      .eq("year_id", year_id)
      .in("id", ordered_ids);

    if (exErr) {
      console.error("reorder fetch error", exErr);
      return NextResponse.json({ error: exErr.message }, { status: 500 });
    }

    const existingIds = new Set((existing || []).map((r: any) => r.id));
    const missing = ordered_ids.filter((id) => !existingIds.has(id));
    if (missing.length) {
      return NextResponse.json(
        { error: `Some ids are not in this year context: ${missing.join(", ")}` },
        { status: 400 },
      );
    }

    // ✅ تحديث sort_order (1..N)
    // نستخدم Promise.all (طلبات متعددة) - كافي وعدد الكلمات عادة مو ضخم
    const updates = ordered_ids.map((id, idx) => {
      const sort_order = idx + 1;
      return supabase
        .from("filter_year_keywords")
        .update({ sort_order })
        .eq("store_id", storeId)
        .eq("year_id", year_id)
        .eq("id", id);
    });

    const results = await Promise.all(updates);
    const firstError = results.find((r) => r.error)?.error;

    if (firstError) {
      console.error("reorder update error", firstError);
      return NextResponse.json({ error: firstError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, count: ordered_ids.length });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 },
    );
  }
}