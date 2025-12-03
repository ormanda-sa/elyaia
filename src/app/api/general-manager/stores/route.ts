// src/app/api/general-manager/stores/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim().toLowerCase();

    let query = supabase
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
      .order("created_at", { ascending: false });

    if (q) {
      query = query.ilike("name", `%${q}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[GM STORES] error:", error);
      return NextResponse.json(
        { ok: false, message: "FAILED", details: error.message },
        { status: 500 },
      );
    }

    const now = Date.now();

    const stores = (data || []).map((store: any) => {
      const subs: any[] = Array.isArray(store.subscriptions)
        ? store.subscriptions
        : [];

      const activeSub: any =
        subs.find((s: any) => s.status === "active") ?? subs.at(0) ?? null;

      let trialDaysLeft: number | null = null;
      let currentPlan: string | null = null;

      if (activeSub) {
        currentPlan = activeSub.plan_code || null;

        if (activeSub.plan_code === "trial" && activeSub.end_at) {
          const end = new Date(activeSub.end_at).getTime();
          const diffMs = end - now;
          const days = Math.ceil(
            diffMs / (1000 * 60 * 60 * 24),
          );
          trialDaysLeft = days > 0 ? days : 0;
        }
      }

      return {
        id: store.id,
        name: store.name,
        domain: store.domain,
        owner_email: store.owner_email,
        status: store.status,
        created_at: store.created_at,
        current_plan: currentPlan,
        trial_days_left: trialDaysLeft,
      };
    });

    return NextResponse.json(
      {
        ok: true,
        stores,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[GM STORES] unexpected:", err);
    return NextResponse.json(
      { ok: false, message: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
