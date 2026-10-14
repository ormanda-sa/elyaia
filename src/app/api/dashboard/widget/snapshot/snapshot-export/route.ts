// src/app/api/dashboard/widget/snapshot-export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

export const runtime = "nodejs";

// نفس شكل snapshot عندك
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
  keywords: any[];
  config: SnapshotConfig | null;

  // ✅ جديد: جدول إضافي يمد “مكان ثاني”
  year_keywords: any[];
};

export async function POST(_req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const [
      brandsResult,
      modelsResult,
      yearsResult,
      sectionsResult,
      keywordsResult,
      yearKeywordsResult,
      configResult,
    ] = await Promise.all([
      supabase.from("filter_brands").select("*").eq("store_id", storeId).order("sort_order", { ascending: true }).order("id", { ascending: true }),
      supabase.from("filter_models").select("*").eq("store_id", storeId).order("sort_order", { ascending: true }).order("id", { ascending: true }),
      supabase.from("filter_years").select("*").eq("store_id", storeId).order("sort_order", { ascending: true }).order("id", { ascending: true }),
      supabase.from("filter_sections").select("*").eq("store_id", storeId).order("sort_order", { ascending: true }).order("id", { ascending: true }),
      supabase.from("filter_keywords").select("*").eq("store_id", storeId).order("sort_order", { ascending: true }).order("id", { ascending: true }),

      // ✅ جدول كلمات السنة
      supabase.from("filter_year_keywords").select("*").eq("store_id", storeId).order("sort_order", { ascending: true }).order("id", { ascending: true }),

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
      yearKeywordsResult.error ||
      configResult.error;

    if (firstError) {
      console.error("[SNAPSHOT_EXPORT_ERROR]", firstError);
      return NextResponse.json({ error: "Failed to build export snapshot" }, { status: 500 });
    }

    const cfg = configResult.data;

    const payload: SnapshotPayload = {
      store_id: storeId,
      brands: brandsResult.data ?? [],
      models: modelsResult.data ?? [],
      years: yearsResult.data ?? [],
      sections: sectionsResult.data ?? [],
      keywords: keywordsResult.data ?? [],
      year_keywords: yearKeywordsResult.data ?? [],
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

    // ✅ جدول جديد تحفظ فيه “نسخة التصدير”
    // لازم تسوي جدول اسمه widget_snapshots_export (نفس widget_snapshots)
    const { error: upsertError } = await supabase
      .from("widget_snapshots_export")
      .upsert({ store_id: storeId, data: payload, updated_at: now });

    if (upsertError) {
      console.error("[SNAPSHOT_EXPORT_UPSERT_ERROR]", upsertError);
      return NextResponse.json({ error: "Failed to save export snapshot" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, updated_at: now }, { status: 200 });
  } catch (err) {
    console.error("[SNAPSHOT_EXPORT_UNEXPECTED]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}