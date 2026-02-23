import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

type Item = {
  model: string;         // كورولا
  year: string;          // 2011-2013
  name_ar: string;       // الكلمة
  sort_order?: number | null;
};

function norm(s: any) {
  return String(s ?? "").trim();
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const items = body?.items as Item[] | undefined;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items array is required" }, { status: 400 });
    }

    // 1) تنظيف البيانات
    const cleaned = items
      .map((it) => ({
        model: norm(it.model),
        year: norm(it.year),
        name_ar: norm(it.name_ar),
        sort_order:
          it.sort_order !== undefined && it.sort_order !== null && String(it.sort_order).trim() !== ""
            ? Number(it.sort_order)
            : null,
      }))
      .filter((r) => r.model && r.year && r.name_ar);

    if (cleaned.length === 0) {
      return NextResponse.json({ error: "No valid rows (need model, year, name_ar)" }, { status: 400 });
    }

    // 2) جلب model_id لكل موديل مذكور في الإكسل
    const modelNames = Array.from(new Set(cleaned.map((r) => r.model)));

    const { data: models, error: modelsErr } = await supabase
      .from("filter_models")
      .select("id,name_ar")
      .eq("store_id", storeId)
      .in("name_ar", modelNames);

    if (modelsErr) {
      console.error("models lookup error", modelsErr);
      return NextResponse.json({ error: modelsErr.message }, { status: 500 });
    }

    const modelIdByName = new Map<string, number>();
    (models ?? []).forEach((m: any) => modelIdByName.set(String(m.name_ar), Number(m.id)));

    // 3) جلب year_id لكل (model_id + year)
    const modelIds = Array.from(new Set((models ?? []).map((m: any) => Number(m.id))));
    const yearsWanted = Array.from(new Set(cleaned.map((r) => r.year)));

    // لو ما لقى ولا موديل -> كله فشل
    if (modelIds.length === 0) {
      return NextResponse.json({
        successCount: 0,
        failCount: cleaned.length,
        errors: cleaned.slice(0, 50).map((r, i) => ({
          row: i + 2,
          reason: `MODEL_NOT_FOUND: ${r.model}`,
        })),
      });
    }

    const { data: years, error: yearsErr } = await supabase
      .from("filter_years")
      .select("id,model_id,year")
      .eq("store_id", storeId)
      .in("model_id", modelIds)
      .in("year", yearsWanted);

    if (yearsErr) {
      console.error("years lookup error", yearsErr);
      return NextResponse.json({ error: yearsErr.message }, { status: 500 });
    }

    // key = `${model_id}__${year}`
    const yearIdByKey = new Map<string, number>();
    (years ?? []).forEach((y: any) => {
      const key = `${Number(y.model_id)}__${String(y.year)}`;
      yearIdByKey.set(key, Number(y.id));
    });

    // 4) تجهيز rows للإدخال
    const rowsToInsert: any[] = [];
    const errors: Array<{ row: number; reason: string }> = [];

    cleaned.forEach((r, idx) => {
      const rowNo = idx + 2; // لأن الصف 1 هيدر
      const model_id = modelIdByName.get(r.model);

      if (!model_id) {
        errors.push({ row: rowNo, reason: `MODEL_NOT_FOUND: ${r.model}` });
        return;
      }

      const yKey = `${model_id}__${r.year}`;
      const year_id = yearIdByKey.get(yKey);

      if (!year_id) {
        errors.push({ row: rowNo, reason: `YEAR_NOT_FOUND: ${r.model} | ${r.year}` });
        return;
      }

      rowsToInsert.push({
        store_id: storeId,
        year_id,
        name_ar: r.name_ar,
        sort_order: r.sort_order ?? 0,
      });
    });

    if (rowsToInsert.length === 0) {
      return NextResponse.json({
        successCount: 0,
        failCount: cleaned.length,
        errors: errors.slice(0, 200),
      });
    }

    // 5) إدخال دفعة واحدة
    const { data: inserted, error: insErr } = await supabase
      .from("filter_year_keywords")
      .insert(rowsToInsert)
      .select("id");

    if (insErr) {
      console.error("insert year keywords error", insErr);
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    const successCount = inserted?.length ?? 0;
    const failCount = cleaned.length - successCount;

    return NextResponse.json({
      successCount,
      failCount,
      errors: errors.slice(0, 200), // أعرض أول 200 خطأ فقط
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 },
    );
  }
}