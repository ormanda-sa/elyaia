// src/app/api/dashboard/widget/snapshot-export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

export const runtime = "nodejs";

// شكل الـ config داخل JSON
type SnapshotConfig = {
  enabled: boolean;
  title_text: string | null;
  subtitle_text: string | null;
  hero_description_prefix: string | null;
  hero_shipping_line: string | null;
  background_image_url: string | null;
  hero_bg_mode: string | null;
  hero_bg_gradient: string | null;

  hero_title_color: string | null;
  hero_desc_color: string | null;
  counter_target: number | null;
  counter_color: string | null;
  shipping_color: string | null;
  step_badge_bg: string | null;

  hero_button_bg: string | null;
  hero_button_text_color: string | null;

  hero_capsule_bg: string | null;
  hero_capsule_shadow: string | null;
};

type SnapshotPayload = {
  store_id: string;
  brands: any[];
  models: any[];
  years: any[];
  sections: any[];
  keywords: any[]; // ✅ نخلي الاسم keywords مثل القديم عشان ما يتغير اللي يقرأه
  config: SnapshotConfig | null;
};

export async function POST(_req: NextRequest) {
  const supabase = getSupabaseServerClient();

  // نجيب المتجر الحالي من السيشن (صاحب المتجر)
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    // نجيب بيانات الفلتر + إعدادات الهيرو في نفس الوقت
    const [
      brandsResult,
      modelsResult,
      yearsResult,
      sectionsResult,
      keywordsResult, // ✅ هذا صار يقرأ filter_year_keywords
      configResult,
    ] = await Promise.all([
      supabase
        .from("filter_brands")
        .select("*")
        .eq("store_id", storeId)
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true }),

      supabase
        .from("filter_models")
        .select("*")
        .eq("store_id", storeId)
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true }),

      supabase
        .from("filter_years")
        .select("*")
        .eq("store_id", storeId)
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true }),

      supabase
        .from("filter_sections")
        .select("*")
        .eq("store_id", storeId)
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true }),

      // ✅ التغيير الوحيد: جدول الكلمات الجديد
      supabase
        .from("filter_year_keywords")
        .select("*")
        .eq("store_id", storeId)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true }),

      // إعدادات الهيرو من filter_configs
      supabase
        .from("filter_configs")
        .select("*")
        .eq("store_id", storeId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const firstError =
      brandsResult.error ||
      modelsResult.error ||
      yearsResult.error ||
      sectionsResult.error ||
      keywordsResult.error ||
      configResult.error;

    if (firstError) {
      console.error("[DASHBOARD_WIDGET_SNAPSHOT_EXPORT_ERROR]", firstError);
      return NextResponse.json({ error: "Failed to build snapshot" }, { status: 500 });
    }

    const cfg = configResult.data;

    const snapshot: SnapshotPayload = {
      store_id: storeId,
      brands: brandsResult.data ?? [],
      models: modelsResult.data ?? [],
      years: yearsResult.data ?? [],
      sections: sectionsResult.data ?? [],
      keywords: keywordsResult.data ?? [], // ✅ نفس المفتاح القديم keywords
      config: cfg
        ? {
            enabled: cfg.enabled ?? true,
            title_text: cfg.title_text ?? null,
            subtitle_text: cfg.subtitle_text ?? null,
            hero_description_prefix: cfg.hero_description_prefix ?? null,
            hero_shipping_line: cfg.hero_shipping_line ?? null,
            background_image_url: cfg.background_image_url ?? null,
            hero_bg_mode: cfg.hero_bg_mode ?? null,
            hero_bg_gradient: cfg.hero_bg_gradient ?? null,

            hero_title_color: cfg.hero_title_color ?? null,
            hero_desc_color: cfg.hero_desc_color ?? null,
            counter_target: cfg.counter_target ?? null,
            counter_color: cfg.counter_color ?? null,
            shipping_color: cfg.shipping_color ?? null,
            step_badge_bg: cfg.step_badge_bg ?? null,

            hero_button_bg: cfg.hero_button_bg ?? null,
            hero_button_text_color: cfg.hero_button_text_color ?? null,

            hero_capsule_bg: cfg.hero_capsule_bg ?? null,
            hero_capsule_shadow: cfg.hero_capsule_shadow ?? null,
          }
        : null,
    };

    const now = new Date().toISOString();

    // نخزن الـ JSON في جدول widget_snapshots (نفس القديم)
    const { error: upsertError } = await supabase.from("widget_snapshots").upsert({
      store_id: storeId,
      data: snapshot,
      updated_at: now,
    });

    if (upsertError) {
      console.error("[WIDGET_SNAPSHOT_EXPORT_UPSERT_ERROR]", upsertError);
      return NextResponse.json({ error: "Failed to save snapshot" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, updated_at: now }, { status: 200 });
  } catch (err) {
    console.error("[DASHBOARD_WIDGET_SNAPSHOT_EXPORT_UNEXPECTED]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}