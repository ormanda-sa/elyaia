// src/app/dashboard/subscriptions/page.tsx

import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "الاشتراك والفواتير | لوحة المتجر | Darb Filters",
};

type DashboardResponse = {
  store: {
    id: string;
    name: string;
    domain: string | null;
    status: string;
    created_at: string;
  };
  current_subscription: {
    id: string;
    store_id: string;
    plan_code: string;
    billing_cycle: string;
    price_cents: number;
    start_at: string;
    end_at: string | null;
    status: string;
    created_at: string;
    updated_at: string;
  } | null;
  current_plan: {
    id: string;
    code: string;
    name_ar: string;
    description_ar: string | null;
    price_cents: number;
    billing_cycle: string;
    is_active: boolean;
  } | null;
  subscriptions: any[];
  invoices: {
    id: string;
    store_id: string;
    subscription_id: string | null;
    amount_cents: number;
    status: string;
    issued_at: string;
    due_at: string | null;
    paid_at: string | null;
    created_at: string;
    updated_at: string;
  }[];
  metrics: {
    total_outstanding_cents: number;
    total_outstanding: number;
    unpaid_invoices_count: number;
    paid_invoices_count: number;
    total_invoices_count: number;
  };
};

async function fetchDashboardData(): Promise<DashboardResponse> {
  const hdrs = await headers();
  const host = hdrs.get("host") || "localhost:3000";
  const protocol =
    process.env.NODE_ENV === "production" ? "https" : "http";
  const baseUrl = `${protocol}://${host}`;

  const res = await fetch(
    `${baseUrl}/api/dashboard/subscriptions/overview`,
    {
      cache: "no-store",
      headers: {
        cookie: hdrs.get("cookie") ?? "",
      },
    }
  );

  // لو ما في جلسة → 401 → رجّع المستخدم لصفحة الدخول
  if (res.status === 401) {
    redirect("/dashboard/login");
  }

  if (!res.ok) {
    throw new Error("فشل في جلب بيانات لوحة الاشتراك");
  }

  return res.json();
}

function formatCurrency(amount: number) {
  return `${amount.toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ر.س`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export default async function SubscriptionsPage() {
  const data = await fetchDashboardData();
  const { store, current_subscription, current_plan, invoices, metrics } = data;

  const hasActiveSub = !!current_subscription;

  let subscriptionLabel = "لا يوجد اشتراك فعّال حاليًا";
  let subscriptionExtra = "";

  if (current_subscription) {
    const planName =
      current_plan?.name_ar ||
      current_subscription.plan_code ||
      "خطة بدون اسم";
    const endText = current_subscription.end_at
      ? `ينتهي في ${formatDate(current_subscription.end_at)}`
      : "بدون تاريخ انتهاء محدد";

    subscriptionLabel = `الخطة الحالية: ${planName}`;
    subscriptionExtra = `${endText} — حالة الاشتراك: ${current_subscription.status}`;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      {/* العنوان */}
      <header className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            الاشتراك والفواتير
          </h1>
          <p className="text-sm text-slate-500">
            هنا تقدر تشوف حالة اشتراك متجرك، والخطط، والفواتير المستحقة أو
            المدفوعة.
          </p>
        </div>
      </header>

      {/* كروت الملخص */}
      <section className="mb-8 grid gap-4 md:grid-cols-3">
        {/* حالة المتجر */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 text-xs font-semibold text-slate-500">
            حالة المتجر
          </div>
          <div className="text-lg font-semibold text-slate-900">
            {store.name}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            الحالة:{" "}
            <span className="font-medium text-slate-800">
              {store.status === "active"
                ? "فعّال"
                : store.status === "trial"
                ? "تجريبي"
                : store.status === "suspended"
                ? "موقوف"
                : store.status}
            </span>
          </div>
          {store.domain && (
            <div className="mt-1 text-xs text-slate-500">
              النطاق:{" "}
              <span className="font-mono text-slate-700">{store.domain}</span>
            </div>
          )}
        </div>

        {/* الاشتراك الحالي (عرض فقط) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 text-xs font-semibold text-slate-500">
            الاشتراك
          </div>
          <div className="text-sm font-semibold text-slate-900">
            {subscriptionLabel}
          </div>
          {subscriptionExtra && (
            <div className="mt-1 text-xs text-slate-500">
              {subscriptionExtra}
            </div>
          )}
          <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
            إدارة تجديد أو ترقية الاشتراك تتم حاليًا عن طريق إدارة النظام. في
            حال رغبتك بتغيير الخطة أو تمديد الاشتراك، يرجى التواصل مع الإدارة
            أو مسؤول الحساب.
          </div>
        </div>

        {/* المبالغ غير المدفوعة */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 text-xs font-semibold text-slate-500">
            المبالغ غير المسددة
          </div>
          <div className="text-xl font-bold text-slate-900">
            {formatCurrency(metrics.total_outstanding)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            عدد الفواتير غير المدفوعة:{" "}
            <span className="font-medium text-slate-800">
              {metrics.unpaid_invoices_count}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            إجمالي الفواتير: {metrics.total_invoices_count} — المدفوعة:{" "}
            {metrics.paid_invoices_count}
          </div>
        </div>
      </section>

      {/* جدول الفواتير */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            الفواتير (Invoices)
          </h2>
          <span className="text-xs text-slate-500">
            تظهر هنا الفواتير الخاصة بهذا المتجر
          </span>
        </div>

        {invoices.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            لا توجد فواتير حتى الآن.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-right text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">رقم الفاتورة</th>
                  <th className="px-3 py-2 font-medium">المبلغ</th>
                  <th className="px-3 py-2 font-medium">الحالة</th>
                  <th className="px-3 py-2 font-medium">تاريخ الإصدار</th>
                  <th className="px-3 py-2 font-medium">تاريخ الاستحقاق</th>
                  <th className="px-3 py-2 font-medium">تاريخ السداد</th>
                  <th className="px-3 py-2 font-medium">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const shortId = inv.id.slice(0, 8);
                  const amount = inv.amount_cents / 100;
                  const statusLabel =
                    inv.status === "paid"
                      ? "مدفوعة"
                      : inv.status === "unpaid"
                      ? "غير مدفوعة"
                      : inv.status === "canceled"
                      ? "ملغاة"
                      : inv.status;

                  return (
                    <tr
                      key={inv.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-3 py-2 font-mono text-xs text-slate-700">
                        #{shortId}
                      </td>
                      <td className="px-3 py-2 text-slate-900">
                        {formatCurrency(amount)}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span
                          className={
                            "inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium " +
                            (inv.status === "paid"
                              ? "bg-emerald-50 text-emerald-700"
                              : inv.status === "unpaid"
                              ? "bg-amber-50 text-amber-700"
                              : inv.status === "canceled"
                              ? "bg-slate-100 text-slate-500"
                              : "bg-slate-50 text-slate-700")
                          }
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700">
                        {formatDate(inv.issued_at)}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700">
                        {formatDate(inv.due_at)}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700">
                        {formatDate(inv.paid_at)}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {inv.status === "unpaid" ? (
                          <a
                            href={`/dashboard/invoices/${inv.id}/pay`}
                            className="rounded-full border px-3 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
                          >
                            ادفع الآن
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
