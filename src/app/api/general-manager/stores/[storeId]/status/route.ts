// src/app/api/general-manager/stores/[storeId]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

type Action = "suspend" | "activate" | "set_trial";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ storeId: string }> },
) {
  try {
    const { storeId } = await context.params; // 👈 هنا ناخذ storeId الصحيح
    const supabase = getSupabaseServerClient();

    const { action, trial_days } = (await req.json()) as {
      action: Action;
      trial_days?: number;
    };

    if (!action) {
      return NextResponse.json(
        { ok: false, message: "ACTION_REQUIRED" },
        { status: 400 },
      );
    }

    async function cancelActiveSubscriptions() {
      await supabase
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("store_id", storeId)
        .eq("status", "active");
    }

    // 1) إيقاف المتجر
    if (action === "suspend") {
      await cancelActiveSubscriptions();

      const { error: updateErr } = await supabase
        .from("stores")
        .update({ status: "suspended" })
        .eq("id", storeId);

      if (updateErr) {
        console.error("[GM STORE STATUS] suspend UPDATE_FAILED", updateErr);
        return NextResponse.json(
          { ok: false, message: "UPDATE_FAILED" },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { ok: true, status: "suspended" },
        { status: 200 },
      );
    }

    // 2) تفعيل المتجر
    if (action === "activate") {
      const { error: updateErr } = await supabase
        .from("stores")
        .update({ status: "active" })
        .eq("id", storeId);

      if (updateErr) {
        console.error("[GM STORE STATUS] activate UPDATE_FAILED", updateErr);
        return NextResponse.json(
          { ok: false, message: "UPDATE_FAILED" },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { ok: true, status: "active" },
        { status: 200 },
      );
    }

    // 3) تعيين/تجديد فترة تجريبية
    if (action === "set_trial") {
      const days = trial_days && trial_days > 0 ? trial_days : 14;

      await cancelActiveSubscriptions();

      const startAt = new Date();
      const endAt = new Date();
      endAt.setDate(endAt.getDate() + days);

      const { error: subErr } = await supabase.from("subscriptions").insert({
        store_id: storeId, // 👈 ما عاد null
        plan_code: "trial",
        billing_cycle: "trial",
        price_cents: 0,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        status: "active",
      });

      if (subErr) {
        console.error("[GM STORE STATUS] set_trial SUB_CREATE_FAILED", subErr);
        return NextResponse.json(
          { ok: false, message: "SUB_CREATE_FAILED" },
          { status: 500 },
        );
      }

      const { error: updateErr } = await supabase
        .from("stores")
        .update({ status: "trial" })
        .eq("id", storeId);

      if (updateErr) {
        console.error("[GM STORE STATUS] set_trial UPDATE_FAILED", updateErr);
        return NextResponse.json(
          { ok: false, message: "UPDATE_FAILED" },
          { status: 500 },
        );
      }

      return NextResponse.json(
        { ok: true, status: "trial", trial_days: days },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { ok: false, message: "UNKNOWN_ACTION" },
      { status: 400 },
    );
  } catch (err) {
    console.error("[GM STORE STATUS] INTERNAL_ERROR", err);
    return NextResponse.json(
      { ok: false, message: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
