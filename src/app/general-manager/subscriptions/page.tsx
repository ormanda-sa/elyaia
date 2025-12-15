// src/app/general-manager/subscriptions/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

type SubscriptionRow = {
  id: string;
  store_id: string;
  plan_code: string;
  billing_cycle: string;
  price_cents: number;
  status: string;
  start_at: string;
  end_at: string | null;
  created_at: string;
  stores: {
    name: string;
    domain: string | null;
    owner_email: string | null;
  } | null;
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export default function SubscriptionsListPage() {
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [planFilter, setPlanFilter] = useState<string>("");

  async function loadSubs() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/general-manager/subscriptions");
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setErrorMsg(data?.message || "فشل جلب الاشتراكات.");
        setSubs([]);
      } else {
        setSubs(data.subscriptions as SubscriptionRow[]);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("خطأ في الاتصال بالسيرفر.");
      setSubs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubs();
  }, []);

  const filteredSubs = subs.filter((s) => {
    const matchStatus = !statusFilter || s.status === statusFilter;
    const matchPlan = !planFilter || s.plan_code === planFilter;
    return matchStatus && matchPlan;
  });

  // 🔹 ملخص أرقام بسيط من نفس البيانات
  const summary = useMemo(() => {
    const total = subs.length;
    const active = subs.filter((s) => s.status === "active").length;
    const canceled = subs.filter((s) => s.status === "canceled").length;
    const expired = subs.filter((s) => s.status === "expired").length;
    const totalRevenueCents = subs
      .filter((s) => s.status === "active" && s.price_cents > 0)
      .reduce((sum, s) => sum + s.price_cents, 0);
    const totalRevenue = totalRevenueCents / 100;

    return { total, active, canceled, expired, totalRevenue };
  }, [subs]);

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">الاشتراكات</h1>
          <p className="text-[11px] text-slate-500">
            عرض اشتراكات المتاجر، الخطط، وحالة كل اشتراك.
          </p>
        </div>
        <button
          onClick={loadSubs}
          className="rounded-md border px-3 py-1.5 text-[11px]"
        >
          تحديث
        </button>
      </div>

      {/* 🔹 ملخص سريع للأرقام */}
      <div className="grid grid-cols-2 gap-2 text-[11px] md:grid-cols-5">
        <div className="rounded-md border bg-white px-3 py-2">
          <div className="text-slate-500">إجمالي الاشتراكات</div>
          <div className="font-semibold">{summary.total}</div>
        </div>
        <div className="rounded-md border bg-white px-3 py-2">
          <div className="text-slate-500">نشطة</div>
          <div className="font-semibold text-emerald-700">
            {summary.active}
          </div>
        </div>
        <div className="rounded-md border bg-white px-3 py-2">
          <div className="text-slate-500">ملغاة</div>
          <div className="font-semibold text-red-700">
            {summary.canceled}
          </div>
        </div>
        <div className="rounded-md border bg-white px-3 py-2">
          <div className="text-slate-500">منتهية</div>
          <div className="font-semibold text-amber-700">
            {summary.expired}
          </div>
        </div>
        <div className="rounded-md border bg-white px-3 py-2">
          <div className="text-slate-500">إيراد الاشتراكات النشطة (ريال)</div>
          <div className="font-semibold">
            {summary.totalRevenue.toLocaleString("ar-EG", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>

      {/* فلاتر بسيطة */}
      <div className="mb-3 mt-1 flex flex-wrap gap-3 text-xs">
        <select
          className="min-w-[140px] h-8 rounded-md border px-2 text-xs"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="canceled">ملغى</option>
          <option value="expired">منتهي</option>
        </select>

        <select
          className="min-w-[140px] h-8 rounded-md border px-2 text-xs"
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
        >
          <option value="">كل الخطط</option>
          {/* الكودات حسب ما حطيتها في subscription_plans */}
          <option value="trial">trial</option>
          <option value="pro_monthly">pro_monthly</option>
        </select>
      </div>

      {errorMsg && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
          {errorMsg}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2 text-right">المتجر</th>
              <th className="px-4 py-2 text-right">الخطة</th>
              <th className="px-4 py-2 text-right">الدورة</th>
              <th className="px-4 py-2 text-right">السعر (ريال)</th>
              <th className="px-4 py-2 text-right">الحالة</th>
              <th className="px-4 py-2 text-right">بداية</th>
              <th className="px-4 py-2 text-right">نهاية</th>
              <th className="px-4 py-2 text-right">التفاصيل</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 text-center text-slate-400"
                >
                  جاري التحميل...
                </td>
              </tr>
            ) : filteredSubs.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 text-center text-slate-400"
                >
                  لا توجد اشتراكات مسجلة حاليًا.
                </td>
              </tr>
            ) : (
              filteredSubs.map((sub) => {
                const storeName = sub.stores?.name || "متجر غير معروف";
                const statusLabel =
                  sub.status === "active"
                    ? "نشط"
                    : sub.status === "canceled"
                    ? "ملغى"
                    : sub.status === "expired"
                    ? "منتهي"
                    : sub.status;

                return (
                  <tr key={sub.id} className="border-t text-[11px]">
                    <td className="px-4 py-2">
                      <div className="flex flex-col">
                        <span className="font-medium">{storeName}</span>
                        <span className="text-[10px] text-slate-500">
                          {sub.stores?.domain || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2">{sub.plan_code}</td>
                    <td className="px-4 py-2">
                      {sub.billing_cycle === "trial"
                        ? "تجريبي"
                        : sub.billing_cycle === "monthly"
                        ? "شهري"
                        : sub.billing_cycle === "yearly"
                        ? "سنوي"
                        : sub.billing_cycle}
                    </td>
                    <td className="px-4 py-2">
                      {(sub.price_cents / 100).toLocaleString("ar-EG", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-2">{statusLabel}</td>
                    <td className="px-4 py-2 text-[10px] text-slate-600">
                      {formatDate(sub.start_at)}
                    </td>
                    <td className="px-4 py-2 text-[10px] text-slate-600">
                      {formatDate(sub.end_at)}
                    </td>
                    <td className="px-4 py-2 text-left">
                      <Link
                        href={`/general-manager/stores/${sub.store_id}`}
                        className="text-[11px] text-blue-600 hover:underline"
                      >
                        متجر
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
