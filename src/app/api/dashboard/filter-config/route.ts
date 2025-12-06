import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("filter_configs")
    .select("*")
    .eq("store_id", storeId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[FILTER_CONFIG_GET_ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to load config", details: error },
      { status: 500 },
    );
  }

  return NextResponse.json({ config: data }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const payload = {
    store_id: storeId,

    enabled: body.enabled ?? true,

    title_text: body.title_text ?? null,
    subtitle_text: body.subtitle_text ?? null,
    hero_description_prefix: body.hero_description_prefix ?? null,
    hero_shipping_line: body.hero_shipping_line ?? null,
    shipping_text: body.shipping_text ?? null,

    background_image_url: body.background_image_url ?? null,

    primary_color: body.primary_color ?? "#e5202a",
    hero_title_color: body.hero_title_color ?? "#ffffff",
    hero_desc_color: body.hero_desc_color ?? "#f9fafb",

    counter_target: body.counter_target ?? 181825,
    counter_color: body.counter_color ?? "#e5202a",
    shipping_color: body.shipping_color ?? "#2563eb",
    step_badge_bg: body.step_badge_bg ?? "#d50026",

    hero_button_bg: body.hero_button_bg ?? null,
    hero_button_text_color: body.hero_button_text_color ?? "#ffffff",
    choices_primary_color: body.choices_primary_color ?? "#e5202a",
    hero_button_left_color: body.hero_button_left_color ?? "#e5202a",
    hero_button_right_color: body.hero_button_right_color ?? "#f97316",

    hero_capsule_bg: body.hero_capsule_bg ?? null,
    hero_capsule_shadow: body.hero_capsule_shadow ?? null,
    hero_capsule_left_color: body.hero_capsule_left_color ?? "#3b82f6",
    hero_capsule_right_color: body.hero_capsule_right_color ?? "#f43f5e",
    hero_capsule_base_color: body.hero_capsule_base_color ?? "#0f172a",

    hero_bg_mode: body.hero_bg_mode ?? "image",
    hero_bg_gradient: body.hero_bg_gradient ?? null,
    hero_bg_left_color: body.hero_bg_left_color ?? "#3b82f6",
    hero_bg_right_color: body.hero_bg_right_color ?? "#f43f5e",
    hero_bg_base_color: body.hero_bg_base_color ?? "#0f172a",
  };

  const { error } = await supabase
    .from("filter_configs")
    .upsert(payload, { onConflict: "store_id" });

  if (error) {
    console.error("[FILTER_CONFIG_SAVE_ERROR]", error);
    return NextResponse.json(
      {
        error: "Failed to save config",
        message: error.message,
        details: error,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
