// src/app/api/general-manager/plans/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(_req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from("subscription_plans")
      .select(
        "id, code, name_ar, description_ar, price_cents, billing_cycle, is_active, created_at",
      )
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[GM PLANS] GET error:", error);
      return NextResponse.json(
        { ok: false, message: "FAILED", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { ok: true, plans: data || [] },
      { status: 200 },
    );
  } catch (err) {
    console.error("[GM PLANS] GET INTERNAL_ERROR:", err);
    return NextResponse.json(
      { ok: false, message: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

// إضافة خطة جديدة
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const body = (await req.json()) as {
      code?: string;
      name_ar?: string;
      description_ar?: string;
      price_cents?: number;
      billing_cycle?: string;
    };

    const code = body.code?.trim();
    const name_ar = body.name_ar?.trim();
    const billing_cycle = body.billing_cycle || "monthly";
    const price_cents =
      typeof body.price_cents === "number" ? body.price_cents : 0;

    if (!code || !name_ar) {
      return NextResponse.json(
        { ok: false, message: "CODE_AND_NAME_REQUIRED" },
        { status: 400 },
      );
    }

    const { error } = await supabase.from("subscription_plans").insert({
      code,
      name_ar,
      description_ar: body.description_ar || null,
      price_cents,
      billing_cycle,
      is_active: true,
    });

    if (error) {
      console.error("[GM PLANS] POST error:", error);
      return NextResponse.json(
        { ok: false, message: "CREATE_FAILED", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("[GM PLANS] POST INTERNAL_ERROR:", err);
    return NextResponse.json(
      { ok: false, message: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
