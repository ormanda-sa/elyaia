import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(_req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from("subscription_plans")
      .select(
        "id, code, name_ar, description_ar, price_cents, billing_cycle, is_active",
      )
      .eq("is_active", true)
      .order("price_cents", { ascending: true });

    if (error) {
      console.error("DASH_PLANS_ERROR", error);
      return NextResponse.json(
        { ok: false, message: "تعذر جلب خطط الاشتراك." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, plans: data ?? [] });
  } catch (err) {
    console.error("DASH_PLANS_UNEXPECTED", err);
    return NextResponse.json(
      { ok: false, message: "خطأ غير متوقع." },
      { status: 500 },
    );
  }
}
