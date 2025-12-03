// src/app/api/general-manager/billing/run-monthly/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();

    // (اختياري) حماية بسيطة بـ secret عشان ما أحد يضربه من برّا
    const authHeader = req.headers.get("authorization");
    const expected = process.env.BILLING_CRON_SECRET;
    if (expected && authHeader !== `Bearer ${expected}`) {
      return NextResponse.json(
        { ok: false, message: "غير مصرح" },
        { status: 401 },
      );
    }

    // 1) نجيب الاشتراكات الشهرية الفعّالة
    const { data: subs, error: subsError } = await supabase
      .from("subscriptions")
      .select(
        "id, store_id, plan_code, billing_cycle, price_cents, start_at, end_at, status",
      )
      .eq("status", "active")
      .eq("billing_cycle", "monthly");

    if (subsError) {
      console.error("BILLING_SUBS_ERROR", subsError);
      return NextResponse.json(
        { ok: false, message: "تعذر جلب الاشتراكات." },
        { status: 500 },
      );
    }

    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth(); // 0-11

    let createdCount = 0;

    for (const sub of subs || []) {
      // تجاهل الاشتراكات المنتهية زمنياً
      if (sub.end_at) {
        const end = new Date(sub.end_at);
        if (end < now) continue;
      }

      // 2) هل يوجد فاتورة لهذا الاشتراك في نفس "الشهر/السنة"؟
      const { data: existingInvoices, error: invError } = await supabase
        .from("invoices")
        .select("id, issued_at, status")
        .eq("subscription_id", sub.id)
        .neq("status", "canceled");

      if (invError) {
        console.error("BILLING_INV_ERROR", invError);
        continue;
      }

      const hasInvoiceThisMonth =
        (existingInvoices || []).some((inv) => {
          const issued = new Date(inv.issued_at);
          return (
            issued.getUTCFullYear() === currentYear &&
            issued.getUTCMonth() === currentMonth
          );
        });

      if (hasInvoiceThisMonth) {
        // فاتورة شهرية لهذا الاشتراك موجودة
        continue;
      }

      // 3) إنشاء فاتورة جديدة "غير مدفوعة"
      const dueAt = new Date(now);
      dueAt.setUTCDate(dueAt.getUTCDate() + 7); // مهلة 7 أيام مثلاً

      const { error: insertError } = await supabase.from("invoices").insert({
        store_id: sub.store_id,
        subscription_id: sub.id,
        amount_cents: sub.price_cents,
        status: "unpaid",
        issued_at: now.toISOString(),
        due_at: dueAt.toISOString(),
      });

      if (insertError) {
        console.error("BILLING_INV_INSERT_ERROR", insertError);
        continue;
      }

      createdCount++;
    }

    return NextResponse.json({
      ok: true,
      message: `تم إنشاء ${createdCount} فاتورة شهرية.`,
      createdCount,
    });
  } catch (err) {
    console.error("BILLING_RUN_MONTHLY_ERROR", err);
    return NextResponse.json(
      { ok: false, message: "خطأ غير متوقع أثناء توليد الفواتير." },
      { status: 500 },
    );
  }
}
