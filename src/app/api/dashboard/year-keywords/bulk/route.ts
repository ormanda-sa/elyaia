import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

type Item = { name_ar: string; sort_order?: number | null };

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const year_id = Number(body?.year_id);
    const items = body?.items as Item[] | undefined;

    if (!year_id || Number.isNaN(year_id)) {
      return NextResponse.json({ error: "year_id is required" }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items array is required" }, { status: 400 });
    }

    // تنظيف + تحضير rows
    const rows = items
      .map((it) => ({
        store_id: storeId,
        year_id,
        name_ar: String(it.name_ar || "").trim(),
        sort_order:
          it.sort_order !== undefined && it.sort_order !== null
            ? Number(it.sort_order)
            : null,
      }))
      .filter((r) => r.name_ar);

    if (rows.length === 0) {
      return NextResponse.json({ error: "No valid rows" }, { status: 400 });
    }

    // إدخال دفعة واحدة
    const { data, error } = await supabase
      .from("filter_year_keywords")
      .insert(rows)
      .select("id");

    if (error) {
      console.error("year-keywords bulk insert error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const successCount = data?.length ?? 0;
    const failCount = rows.length - successCount; // تقديري (لو supabase رفض الكل بيرجع error)

    return NextResponse.json({ successCount, failCount });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 },
    );
  }
}