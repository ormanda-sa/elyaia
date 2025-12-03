// src/app/api/general-manager/stores/[storeId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ storeId: string }> },
) {
  try {
    const supabase = getSupabaseServerClient();

    // ✅ هذا هو الفرق المهم
    const { storeId } = await context.params;

    const { data, error } = await supabase
      .from("stores")
      .select(
        `
        id,
        name,
        domain,
        owner_email,
        status,
        created_at,
        subscriptions (
          id,
          plan_code,
          billing_cycle,
          status,
          start_at,
          end_at
        )
      `,
      )
      .eq("id", storeId)
      .maybeSingle();

    if (error || !data) {
      console.error("[GM STORE SHOW] error:", error);
      return NextResponse.json(
        { ok: false, message: "STORE_NOT_FOUND" },
        { status: 404 },
      );
    }

    const now = Date.now();
    const subs = Array.isArray(data.subscriptions)
      ? data.subscriptions
      : [];

    const activeSub =
      subs.find((s: any) => s.status === "active") ?? subs.at(0) ?? null;

    let trialDaysLeft: number | null = null;
    let currentPlan: string | null = null;

    if (activeSub) {
      currentPlan = activeSub.plan_code || null;

      if (activeSub.plan_code === "trial" && activeSub.end_at) {
        const end = new Date(activeSub.end_at).getTime();
        const diffMs = end - now;
        const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        trialDaysLeft = days > 0 ? days : 0;
      }
    }

    return NextResponse.json(
      {
        ok: true,
        store: {
          id: data.id,
          name: data.name,
          domain: data.domain,
          owner_email: data.owner_email,
          status: data.status,
          created_at: data.created_at,
          current_plan: currentPlan,
          trial_days_left: trialDaysLeft,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[GM STORE SHOW] INTERNAL_ERROR", err);
    return NextResponse.json(
      { ok: false, message: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
