// src/app/api/widget/subscription-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("store_id");

    if (!storeId) {
      return NextResponse.json(
        { ok: false, show_branding: false, suspended: false, reason: "MISSING_STORE_ID" },
        { status: 400 },
      );
    }

    // نجيب حالة المتجر
    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select("id, status")
      .eq("id", storeId)
      .maybeSingle();

    if (storeErr || !store) {
      return NextResponse.json(
        { ok: false, show_branding: false, suspended: false, reason: "STORE_NOT_FOUND" },
        { status: 200 },
      );
    }

    // لو المتجر موقوف → نخفي الودجت بالكامل
    if (store.status === "suspended") {
      return NextResponse.json(
        { ok: true, show_branding: false, suspended: true, reason: "STORE_SUSPENDED" },
        { status: 200 },
      );
    }

    const nowIso = new Date().toISOString();

    // اشتراك فعّال؟
    const { data: activeSub, error } = await supabase
      .from("subscriptions")
      .select("id, status, start_at, end_at")
      .eq("store_id", storeId)
      .eq("status", "active")
      .lte("start_at", nowIso)
      .or(`end_at.is.null,end_at.gt.${nowIso}`)
      .order("start_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[WIDGET SUB STATUS] error:", error);
      return NextResponse.json(
        { ok: false, show_branding: false, suspended: false, reason: "CHECK_FAILED" },
        { status: 200 },
      );
    }

    if (activeSub) {
      // اشتراك فعّال → لا نظهر حقوق
      return NextResponse.json(
        { ok: true, show_branding: false, suspended: false, reason: null },
        { status: 200 },
      );
    }

    // ما فيه اشتراك فعّال → نظهر حقوق Darb
    return NextResponse.json(
      { ok: true, show_branding: true, suspended: false, reason: "NO_ACTIVE_SUBSCRIPTION" },
      { status: 200 },
    );
  } catch (err) {
    console.error("[WIDGET SUB STATUS] INTERNAL_ERROR:", err);
    return NextResponse.json(
      { ok: false, show_branding: false, suspended: false, reason: "INTERNAL_ERROR" },
      { status: 200 },
    );
  }
}
