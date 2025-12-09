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
        { ok: false, code: "UNAUTHORIZED", message: "غير مصرح" },
        { status: 401 },
      );
    }

    const body = (await req.json()) as Body | null;
    if (!body?.plan_code) {
      return NextResponse.json(
        { ok: false, code: "NO_PLAN_CODE", message: "plan_code مطلوب" },
        { status: 400 },
      );
    }

    // 1) نجيب تعريف الخطة الجديدة
    const { data: newPlan, error: planError } = await supabase
      .from("subscription_plans")
      .select(
        "id, code, name_ar, price_cents, billing_cycle, is_active",
      )
      .eq("code", body.plan_code)
      .eq("is_active", true)
      .single();

    if (planError || !newPlan) {
      return NextResponse.json(
        {
          ok: false,
          code: "PLAN_NOT_FOUND",
          message: "الخطة غير موجودة أو غير مفعلة.",
        },
        { status: 400 },
      );
    }

    const now = new Date();

    // 2) نجيب الاشتراك الحالي (إن وجد)
    const { data: currentSub, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("store_id", storeId)
      .eq("status", "active")
      .order("start_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      console.error("CHECKOUT_SUB_ERROR", subError);
      return NextResponse.json(
        { ok: false, code: "SUB_ERROR", message: "تعذر جلب الاشتراك الحالي." },
        { status: 500 },
      );
    }

    // لو فيه اشتراك حالي بنفس الخطة
    if (currentSub && currentSub.plan_code === newPlan.code) {
      return NextResponse.json(
        {
          ok: false,
          code: "ALREADY_ON_PLAN",
          message: "أنت مشترك بالفعل في هذه الخطة.",
        },
        { status: 400 },
      );
    }

    // 3) سيناريو: لا يوجد اشتراك حالي → اشتراك جديد
    if (!currentSub) {
      const endAt =
        newPlan.billing_cycle === "trial"
          ? addDays(now, 14)
          : newPlan.billing_cycle === "monthly"
          ? addDays(now, 30)
          : newPlan.billing_cycle === "yearly"
          ? addDays(now, 365)
          : null;

      const { data: sub, error: newSubError } = await supabase
        .from("subscriptions")
        .insert({
          store_id: storeId,
          plan_code: newPlan.code,
          billing_cycle: newPlan.billing_cycle,
          price_cents: newPlan.price_cents,
          start_at: now.toISOString(),
          end_at: endAt ? endAt.toISOString() : null,
          status: "active",
        })
        .select("*")
        .single();

      if (newSubError || !sub) {
        console.error("CHECKOUT_NEW_SUB_ERROR", newSubError);
        return NextResponse.json(
          { ok: false, code: "NEW_SUB_FAIL", message: "تعذر إنشاء الاشتراك." },
          { status: 500 },
        );
      }

      // فاتورة المبلغ الكامل (لو مو free)
      let invoice = null;
      if (newPlan.price_cents > 0) {
        const dueAt = addDays(now, 7);
        const { data: inv, error: invError } = await supabase
          .from("invoices")
          .insert({
            store_id: storeId,
            subscription_id: sub.id,
            amount_cents: newPlan.price_cents,
            status: "unpaid",
            issued_at: now.toISOString(),
            due_at: dueAt.toISOString(),
          })
          .select("*")
          .single();

        if (invError) {
          console.error("CHECKOUT_NEW_INV_ERROR", invError);
        } else {
          invoice = inv;
        }
      }

      return NextResponse.json({
        ok: true,
        mode: "new",
        subscription: sub,
        invoice,
        plan: newPlan,
      });
    }

    // 4) سيناريو: عنده اشتراك حالي → نفحص هل ترقية أو تخفيض
    // نمنع تخفيض الخطة (سعر أقل)
    if (newPlan.price_cents <= currentSub.price_cents) {
      return NextResponse.json(
        {
          ok: false,
          code: "DOWNGRADE_NOT_ALLOWED",
          message: "لا يمكن تخفيض الخطة من هنا.",
        },
        { status: 400 },
      );
    }

    // ترقية → نحسب الفرق في السعر (من غير تعقيد المدة حالياً)
    const diffCents = newPlan.price_cents - currentSub.price_cents;

    // نحدث الاشتراك ليصير على الخطة الجديدة فوراً
    const { data: upgradedSub, error: upgradeError } = await supabase
      .from("subscriptions")
      .update({
        plan_code: newPlan.code,
        billing_cycle: newPlan.billing_cycle,
        price_cents: newPlan.price_cents,
      })
      .eq("id", currentSub.id)
      .select("*")
      .single();

    if (upgradeError || !upgradedSub) {
      console.error("CHECKOUT_UPGRADE_SUB_ERROR", upgradeError);
      return NextResponse.json(
        { ok: false, code: "UPGRADE_FAIL", message: "تعذر ترقية الاشتراك." },
        { status: 500 },
      );
    }

    // ننشئ فاتورة للفرق فقط
    const dueAtUpgrade = addDays(now, 7);
    const { data: upgradeInv, error: upgradeInvError } = await supabase
      .from("invoices")
      .insert({
        store_id: storeId,
        subscription_id: upgradedSub.id,
        amount_cents: diffCents,
        status: "unpaid",
        issued_at: now.toISOString(),
        due_at: dueAtUpgrade.toISOString(),
      })
      .select("*")
      .single();

    if (upgradeInvError || !upgradeInv) {
      console.error("CHECKOUT_UPGRADE_INV_ERROR", upgradeInvError);
    }

    return NextResponse.json({
      ok: true,
      mode: "upgrade",
      subscription: upgradedSub,
      invoice: upgradeInv,
      plan: newPlan,
      diff_cents: diffCents,
    });
  } catch (err) {
    console.error("CHECKOUT_UNEXPECTED", err);
    return NextResponse.json(
      {
        ok: false,
        code: "SERVER_ERROR",
        message: "خطأ غير متوقع أثناء اختيار الخطة.",
      },
      { status: 500 },
    );
  }
}
