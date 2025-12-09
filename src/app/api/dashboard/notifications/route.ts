// src/app/api/dashboard/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

export const runtime = "nodejs";

type Notification = {
  id: string;
  type: "invoice_unpaid" | "subscription_ending" | "store_status";
  title: string;
  body: string;
  href?: string | null;
  created_at: string;
  level: "info" | "warning" | "danger";
};

export async function GET(_req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const storeId = await getCurrentStoreId();

    if (!storeId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const notifications: Notification[] = [];

    // نجيب المتجر + حالته
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, name, status, created_at")
      .eq("id", storeId)
      .maybeSingle();

    if (storeError) {
      console.error("notifications store error:", storeError);
    }

    // نجيب الاشتراك الحالي (إن وجد)
    const { data: subs, error: subError } = await supabase
      .from("subscriptions")
      .select("id, plan_code, billing_cycle, price_cents, start_at, end_at, status")
      .eq("store_id", storeId)
      .in("status", ["active", "trial"])
      .order("start_at", { ascending: false })
      .limit(1);

    if (subError) {
      console.error("notifications subs error:", subError);
    }

    const currentSub = subs && subs.length > 0 ? subs[0] : null;

    // نجيب الفواتير غير المدفوعة
    const { data: unpaidInvoices, error: invError } = await supabase
      .from("invoices")
      .select("id, amount_cents, status, issued_at, due_at")
      .eq("store_id", storeId)
      .eq("status", "unpaid")
      .order("issued_at", { ascending: false });

    if (invError) {
      console.error("notifications invoices error:", invError);
    }

    const now = new Date();

    // 1) إشعار عن الفواتير غير المدفوعة
    if (unpaidInvoices && unpaidInvoices.length > 0) {
      const totalUnpaid =
        unpaidInvoices.reduce(
          (sum, inv) => sum + (inv.amount_cents || 0),
          0,
        ) / 100;

      notifications.push({
        id: "unpaid_summary",
        type: "invoice_unpaid",
        title: "فواتير غير مدفوعة",
        body: `لديك ${unpaidInvoices.length} فاتورة غير مدفوعة بإجمالي حوالي ${totalUnpaid.toFixed(
          2,
        )} ر.س. يرجى سدادها لتفادي إيقاف الخدمات.`,
        href: "/dashboard/subscriptions",
        created_at: unpaidInvoices[0].issued_at || now.toISOString(),
        level: "warning",
      });
    }

    // 2) إشعار عن اشتراك يقترب من الانتهاء (أقل من 5 أيام)
    if (currentSub && currentSub.end_at) {
      const endDate = new Date(currentSub.end_at);
      const diffMs = endDate.getTime() - now.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays <= 5) {
        notifications.push({
          id: "subscription_ending",
          type: "subscription_ending",
          title: "الاشتراك يقترب من الانتهاء",
          body: `اشتراكك الحالي سينتهي خلال ${diffDays} يوم${
            diffDays === 1 ? "" : "اً"
          }. يرجى التنسيق لتجديد الاشتراك في الوقت المناسب.`,
          href: "/dashboard/subscriptions",
          created_at: currentSub.end_at,
          level: "warning",
        });
      }
    }

    // 3) إشعار عن حالة المتجر (مثلاً موقوف أو تجريبي)
    if (store) {
      if (store.status === "trial") {
        notifications.push({
          id: "store_trial",
          type: "store_status",
          title: "متجرك في وضع تجريبي",
          body:
            "متجرك يعمل حالياً بوضع تجريبي. تأكد من ترقية الاشتراك قبل انتهاء الفترة التجريبية.",
          href: "/dashboard/subscriptions",
          created_at: store.created_at,
          level: "info",
        });
      } else if (store.status === "suspended") {
        notifications.push({
          id: "store_suspended",
          type: "store_status",
          title: "المتجر موقوف",
          body:
            "تم إيقاف متجرك مؤقتاً. يرجى سداد الفواتير المستحقة أو التواصل مع الإدارة لإعادة التفعيل.",
          href: "/dashboard/subscriptions",
          created_at: store.created_at,
          level: "danger",
        });
      }
    }

    // ممكن نضيف إشعارات أخرى هنا مستقبلاً

    return NextResponse.json({ notifications });
  } catch (err) {
    console.error("notifications GET unexpected error:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
