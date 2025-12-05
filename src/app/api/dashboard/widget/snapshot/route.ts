// src/app/api/dashboard/widget/snapshot/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

export const runtime = "nodejs";

type SnapshotPayload = {
  store_id: string;
  brands: any[];
  models: any[];
  years: any[];
  sections: any[];
  keywords: any[];
};

export async function POST(_req: NextRequest) {
  const supabase = getSupabaseServerClient();

  // نجيب المتجر الحالي من السيشن (صاحب المتجر)
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json(
      { error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  try {
    // نجيب كل بيانات الفلتر من جداول filter_*
    const [
      brandsResult,
      modelsResult,
      yearsResult,
      sectionsResult,
      keywordsResult,
    ] = await Promise.all([
      supabase
        .from("filter_brands")
        .select("*")
        .eq("store_id", storeId),
      supabase
        .from("filter_models")
        .select("*")
        .eq("store_id", storeId),
      supabase
        .from("filter_years")
        .select("*")
        .eq("store_id", storeId),
      supabase
        .from("filter_sections")
        .select("*")
        .eq("store_id", storeId),
      supabase
        .from("filter_keywords")
        .select("*")
        .eq("store_id", storeId),
    ]);

    const firstError =
      brandsResult.error ||
      modelsResult.error ||
      yearsResult.error ||
      sectionsResult.error ||
      keywordsResult.error;

    if (firstError) {
      console.error("[DASHBOARD_WIDGET_SNAPSHOT_ERROR]", firstError);
      return NextResponse.json(
        { error: "Failed to build snapshot" },
        { status: 500 },
      );
    }

    const snapshot: SnapshotPayload = {
      store_id: storeId,
      brands: brandsResult.data ?? [],
      models: modelsResult.data ?? [],
      years: yearsResult.data ?? [],
      sections: sectionsResult.data ?? [],
      keywords: keywordsResult.data ?? [],
    };

    const now = new Date().toISOString();

    // نخزن الـ JSON في جدول widget_snapshots
    const { error: upsertError } = await supabase
      .from("widget_snapshots")
      .upsert({
        store_id: storeId,
        data: snapshot,
        updated_at: now,
      });

    if (upsertError) {
      console.error("[WIDGET_SNAPSHOT_UPSERT_ERROR]", upsertError);
      return NextResponse.json(
        { error: "Failed to save snapshot" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        updated_at: now,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[DASHBOARD_WIDGET_SNAPSHOT_UNEXPECTED]", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
