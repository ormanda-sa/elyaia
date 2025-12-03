import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStoreId } from "@/lib/currentStore";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

type Body = {
  plan_code: string;
};

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function POST(req: NextRequest) {
  try {
    const storeId = await getCurrentStoreId();
    if (!storeId) {
      return NextResponse.json(
        { ok: false, message: "غير مصرح" },
        { status: 401 },
      );
    }

    const body = (await req.json()) as Body | null;
    if (!body?.plan_code) {
      return NextResponse.json(
        { ok: false, message: "plan_code مطلوب" },
        { status: 400 },
      );
    }

    // 1) نجيب تعريف الخطة
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select(
        "id, code, name_ar, price_cents, billing_cycle, is_active",
      )
      .eq("code", body.plan_code)
      .eq("is_active", true)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { ok: false, message: "الخطة غير موجودة أو غير مفعلة." },
        { status: 400 },
      );
    }

    const now = new Date();
    let endAt: Date | null = null;

    if (plan.billing_cycle === "trial") {
      endAt = addDays(now, 14); // تجربة 14 يوم
    } else if (plan.billing_cycle === "monthly") {
      endAt = addDays(now, 30);
    } else if (plan.billing_cycle === "yearly") {
      endAt = addDays(now, 365);
    }

    // 2) نلغي أي اشتراك نشط سابق لنفس المتجر (اختياري)
    await supabase
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("store_id", storeId)
      .eq("status", "active");

    // 3) ننشئ الاشتراك الجديد
    const { data: sub, error: subError } = await supabase
      .from("subscriptions")
      .insert({
        store_id: storeId,
        plan_code: plan.code,
        billing_cycle: plan.billing_cycle,
        price_cents: plan.price_cents,
        start_at: now.toISOString(),
        end_at: endAt ? endAt.toISOString() : null,
        status: "active",
      })
      .select("*")
      .single();

    if (subError || !sub) {
      console.error("CHOOSE_PLAN_SUB_ERROR", subError);
      return NextResponse.json(
        { ok: false, message: "تعذر إنشاء الاشتراك." },
        { status: 500 },
      );
    }

    // 4) ننشئ فاتورة للباقة (لو السعر > 0)
    let invoice = null;
    if (plan.price_cents > 0) {
      const dueAt = addDays(now, 7);

      const { data: inv, error: invError } = await supabase
        .from("invoices")
        .insert({
          store_id: storeId,
          subscription_id: sub.id,
          amount_cents: plan.price_cents,
          status: "unpaid",
          issued_at: now.toISOString(),
          due_at: dueAt.toISOString(),
        })
        .select("*")
        .single();

      if (invError) {
        console.error("CHOOSE_PLAN_INV_ERROR", invError);
      } else {
        invoice = inv;
      }
    }

    return NextResponse.json({
      ok: true,
      subscription: sub,
      invoice,
      plan,
    });
  } catch (err) {
    console.error("CHOOSE_PLAN_UNEXPECTED", err);
    return NextResponse.json(
      { ok: false, message: "خطأ غير متوقع أثناء اختيار الخطة." },
      { status: 500 },
    );
  }
}
