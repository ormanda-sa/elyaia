// src/app/api/general-manager/stores/[storeId]/plan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ storeId: string }> },
) {
  try {
    const { storeId } = await context.params;
    const supabase = getSupabaseServerClient();

    // نسمح نمرر code من البودي، ولو ما فيه → pro_monthly
    const { plan_code } = (await req.json().catch(() => ({}))) as {
      plan_code?: string;
    };

    const code = plan_code || "pro_monthly";

    // 1) نجيب بيانات الخطة من جدول subscription_plans
    const { data: plan, error: planErr } = await supabase
      .from("subscription_plans")
      .select("code, name_ar, price_cents, billing_cycle")
      .eq("code", code)
      .maybeSingle();

    if (planErr || !plan) {
      console.error("[GM PLAN] planErr:", planErr);
      return NextResponse.json(
        { ok: false, message: "PLAN_NOT_FOUND" },
        { status: 400 },
      );
    }

    // 2) نلغي الاشتراكات النشطة الحالية
    const { error: cancelErr } = await supabase
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("store_id", storeId)
      .eq("status", "active");

    if (cancelErr) {
      console.error("[GM PLAN] cancelErr:", cancelErr);
      return NextResponse.json(
        { ok: false, message: "SUB_CANCEL_FAILED" },
        { status: 500 },
      );
    }

    // 3) ننشئ اشتراك جديد من الخطة
    const startAt = new Date();
    const endAt = new Date();

    if (plan.billing_cycle === "monthly") {
      endAt.setMonth(endAt.getMonth() + 1);
    } else if (plan.billing_cycle === "yearly") {
      endAt.setFullYear(endAt.getFullYear() + 1);
    } else {
      // trial أو شيء خاص
      endAt.setDate(endAt.getDate() + 14);
    }

    const { error: subErr } = await supabase.from("subscriptions").insert({
      store_id: storeId,
      plan_code: plan.code,
      billing_cycle: plan.billing_cycle,
      price_cents: plan.price_cents,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: "active",
    });

    if (subErr) {
      console.error("[GM PLAN] subErr:", subErr);
      return NextResponse.json(
        { ok: false, message: "SUB_CREATE_FAILED" },
        { status: 500 },
      );
    }

    // 4) نحدّث حالة المتجر إلى Active
    const { error: updateErr } = await supabase
      .from("stores")
      .update({ status: "active" })
      .eq("id", storeId);

    if (updateErr) {
      console.error("[GM PLAN] updateErr:", updateErr);
      return NextResponse.json(
        { ok: false, message: "STORE_UPDATE_FAILED" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        status: "active",
        plan_code: plan.code,
        billing_cycle: plan.billing_cycle,
        price_cents: plan.price_cents,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[GM PLAN] INTERNAL_ERROR:", err);
    return NextResponse.json(
      { ok: false, message: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
