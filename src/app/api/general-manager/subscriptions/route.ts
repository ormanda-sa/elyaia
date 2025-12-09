// src/app/api/general-manager/subscriptions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(_req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from("subscriptions")
      .select(
        `
        id,
        store_id,
        plan_code,
        billing_cycle,
        price_cents,
        status,
        start_at,
        end_at,
        created_at,
        stores (
          name,
          domain,
          owner_email
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GM SUBSCRIPTIONS] GET error:", error);
      return NextResponse.json(
        { ok: false, message: "FAILED", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { ok: true, subscriptions: data || [] },
      { status: 200 },
    );
  } catch (err) {
    console.error("[GM SUBSCRIPTIONS] INTERNAL_ERROR:", err);
    return NextResponse.json(
      { ok: false, message: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
