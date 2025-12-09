// src/app/general-manager/stores/[storeId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { StoreSummaryCards } from "./_components/StoreSummaryCards";
import { StoreActivityChart } from "./_components/StoreActivityChart";
import { StoreSubscriptionsTable } from "./_components/StoreSubscriptionsTable";

type StoreRouteParams = {
  storeId: string;
};

type OverviewResponse = {
  ok: boolean;
  store: {
    id: string;
    name: string;
    domain: string | null;
    owner_email: string | null;
    status: string;
    created_at: string;
  };
  stats: {
    total_searches_90d: number;
    monthly_revenue: number;
  };
  activity: { date: string; searches: number }[];
  subscriptions: {
    id: string;
    plan_code: string;
    billing_cycle: string;
    price_cents: number;
    status: string;
    start_at: string;
    end_at: string | null;
    created_at: string;
  }[];
};

type InvoiceRow = {
  id: string;
  amount_cents: number;
  status: string;
  issued_at: string;
  due_at: string | null;
  paid_at: string | null;
};

function formatDate(d: string | null) {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export default function StoreDetailsPage() {
  const params = useParams<StoreRouteParams>();
  const storeId = params.storeId;

  const [status, setStatus] = useState<string>("unknown");
  const [trialDays, setTrialDays] = useState<string>("14");
  const [loadingAction, setLoadingAction] = useState<
    "" | "suspend" | "activate" | "trial" | "upgrade"
  >("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // فواتير المتجر (للوحة الإدارة)
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [updatingInvoiceId, setUpdatingInvoiceId] = useState<string | null>(
    null,
  );

  // حالة إنشاء فاتورة جديدة
  const [invoiceAmount, setInvoiceAmount] = useState<string>("");
  const [invoiceDueAt, setInvoiceDueAt] = useState<string>("");
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  // جلب بيانات المتجر + الحركة + الاشتراكات + الفواتير
  useEffect(() => {
    async function fetchData() {
      try {
        setLoadingOverview(true);
        setLoadingInvoices(true);
        setErrorMsg(null);

        // overview
        const res = await fetch(
          `/api/general-manager/stores/${encodeURIComponent(
            storeId,
          )}/overview`,
        );
        const raw = await res.json();

        if (!res.ok || !raw.ok) {
          const msg =
            (raw && typeof raw.message === "string" && raw.message) ||
            "تعذّر جلب بيانات المتجر.";
          setErrorMsg(msg);
          setOverview(null);
        } else {
          const data = raw as OverviewResponse;
          setOverview(data);
          setStatus(data.store.status);
        }

        // invoices
        const invRes = await fetch(
          `/api/general-manager/stores/${encodeURIComponent(
            storeId,
          )}/invoices/list`,
        );
        const invJson = await invRes.json();
        if (invRes.ok && invJson.ok) {
          setInvoices(invJson.invoices || []);
        } else {
          console.warn("INVOICES_LIST", invJson);
        }
      } catch (e) {
        console.error(e);
        setErrorMsg("خطأ في الاتصال بالسيرفر.");
        setOverview(null);
      } finally {
        setLoadingOverview(false);
        setLoadingInvoices(false);
      }
    }

    fetchData();
  }, [storeId]);

  async function callStatusApi(body: any) {
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await fetch(
      `/api/general-manager/stores/${encodeURIComponent(storeId)}/status`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    const data = await res.json();
    console.log("STATUS API", data);

    if (!res.ok || !data.ok) {
      setErrorMsg(data?.message || "حدث خطأ.");
      return null;
    }
    return data;
  }

  async function handleSuspend() {
    setLoadingAction("suspend");
    const data = await callStatusApi({ action: "suspend" });
    if (data?.status) {
      setStatus(data.status);
      setSuccessMsg("تم إيقاف المتجر بنجاح.");
    }
    setLoadingAction("");
  }

  async function handleActivate() {
    setLoadingAction("activate");
    const data = await callStatusApi({ action: "activate" });
    if (data?.status) {
      setStatus(data.status);
      setSuccessMsg("تم تفعيل المتجر بنجاح.");
    }
    setLoadingAction("");
  }

  async function handleSetTrial() {
    const daysNum = parseInt(trialDays || "0", 10);
    const days = !isNaN(daysNum) && daysNum > 0 ? daysNum : 14;

    setLoadingAction("trial");
    const data = await callStatusApi({
      action: "set_trial",
      trial_days: days,
    });

    if (data?.status) {
      setStatus(data.status);
      setSuccessMsg(`تم تعيين المتجر كتجريبي لمدة ${days} يومًا.`);
    }
    setLoadingAction("");
  }

  async function handleUpgradeToPaid() {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoadingAction("upgrade");

    try {
      const res = await fetch(
        `/api/general-manager/stores/${encodeURIComponent(storeId)}/plan`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan_code: "pro_monthly",
          }),
        },
      );

      const data = await res.json();
      console.log("PLAN API", data);

      if (!res.ok || !data.ok) {
        setErrorMsg(data?.message || "تعذر ترقية المتجر للخطة المدفوعة.");
      } else {
        setStatus("active");
        setSuccessMsg("تم ترقية المتجر إلى الخطة المدفوعة.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("خطأ في الاتصال بالسيرفر أثناء الترقية.");
    } finally {
      setLoadingAction("");
    }
  }

  async function handleCreateInvoice() {
    setErrorMsg(null);
    setSuccessMsg(null);

    const amountNumber = parseFloat(invoiceAmount.replace(/,/g, ""));
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      setErrorMsg("الرجاء إدخال مبلغ صحيح أكبر من صفر.");
      return;
    }

    setLoadingInvoice(true);
    try {
      const res = await fetch(
        `/api/general-manager/stores/${encodeURIComponent(storeId)}/invoices`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount_cents: Math.round(amountNumber * 100),
            due_at: invoiceDueAt || null,
          }),
        },
      );

      const data = await res.json();
      console.log("INVOICE API", data);

      if (!res.ok || data?.error) {
        setErrorMsg(
          data?.message ||
            "تعذر إنشاء الفاتورة. تأكد من البيانات وحاول مرة أخرى.",
        );
      } else {
        setSuccessMsg("تم إنشاء الفاتورة بنجاح.");
        setInvoiceAmount("");
        setInvoiceDueAt("");

        // نضيف الفاتورة الجديدة أول القائمة عشان تبان فوراً
        setInvoices((prev) => [
          {
            id: data.invoice.id,
            amount_cents: data.invoice.amount_cents,
            status: data.invoice.status,
            issued_at: data.invoice.issued_at,
            due_at: data.invoice.due_at,
            paid_at: data.invoice.paid_at,
          },
          ...prev,
        ]);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("حدث خطأ غير متوقع أثناء إنشاء الفاتورة.");
    } finally {
      setLoadingInvoice(false);
    }
  }

  async function handleUpdateInvoiceStatus(
    invoiceId: string,
    status: "paid" | "unpaid" | "canceled",
  ) {
    setErrorMsg(null);
    setSuccessMsg(null);
    setUpdatingInvoiceId(invoiceId);

    try {
      const res = await fetch(
        `/api/general-manager/invoices/${encodeURIComponent(invoiceId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );

      const json = await res.json();
      if (!res.ok || !json.ok) {
        setErrorMsg(json?.message || "تعذر تحديث حالة الفاتورة.");
        return;
      }

      const updated = json.invoice as InvoiceRow;
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === invoiceId ? updated : inv)),
      );

      setSuccessMsg("تم تحديث حالة الفاتورة بنجاح.");
    } catch (err) {
      console.error(err);
      setErrorMsg("حدث خطأ غير متوقع أثناء تحديث الفاتورة.");
    } finally {
      setUpdatingInvoiceId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* الهيدر */}
      <div className="flex items-center justify-between gap-3 px-4 lg:px-6">
        <div>
          <h1 className="text-lg font-semibold">
            {overview?.store?.name || `متجر #${storeId}`}
          </h1>
          <p className="text-[11px] text-slate-500">
            بيانات المتجر، حالة الاشتراك، حركة البحث، والفواتير.
          </p>
        </div>
        <Link
          href="/general-manager/stores"
          className="text-[11px] text-slate-500 hover:underline"
        >
          ← الرجوع لقائمة المتاجر
        </Link>
      </div>

      {/* الرسائل */}
      {errorMsg && (
        <div className="mx-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700 lg:mx-6">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="mx-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700 lg:mx-6">
          {successMsg}
        </div>
      )}

      {/* كروت الملخص */}
      {!loadingOverview && overview && (
        <StoreSummaryCards store={overview.store} stats={overview.stats} />
      )}

      {/* التحكم في الحالة + الخطة المدفوعة + التجربة */}
      <div className="grid gap-3 px-4 text-[11px] md:grid-cols-3 lg:px-6">
        {/* حالة المتجر */}
        <div className="space-y-3 rounded-lg border bg-white p-3">
          <div className="mb-1 font-medium">التحكم في حالة المتجر</div>
          <div className="space-y-2 text-slate-600">
            <button
              onClick={handleActivate}
              disabled={loadingAction === "activate"}
              className="w-full rounded-md bg-emerald-600 px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-60"
            >
              {loadingAction === "activate"
                ? "جاري التفعيل..."
                : "تفعيل المتجر (نشط)"}
            </button>

            <button
              onClick={handleSuspend}
              disabled={loadingAction === "suspend"}
              className="w-full rounded-md bg-red-600 px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-60"
            >
              {loadingAction === "suspend"
                ? "جاري الإيقاف..."
                : "إيقاف المتجر (موقوف)"}
            </button>
          </div>
        </div>

        {/* الخطة المدفوعة */}
        <div className="space-y-3 rounded-lg border bg-white p-3">
          <div className="mb-1 font-medium">الخطة المدفوعة</div>
          <p className="mb-2 text-slate-600">
            ترقية المتجر إلى خطة مدفوعة (مثال: Pro شهري).
          </p>
          <button
            onClick={handleUpgradeToPaid}
            disabled={loadingAction === "upgrade"}
            className="w-full rounded-md bg-indigo-600 px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-60"
          >
            {loadingAction === "upgrade"
              ? "جاري الترقية..."
              : "ترقية المتجر إلى الخطة المدفوعة"}
          </button>
        </div>

        {/* التجربة */}
        <div className="rounded-lg border bg-white p-3">
          <div className="mb-1 font-medium">تعيين/تجديد فترة تجريبية</div>
          <div className="space-y-2 text-slate-600">
            <label className="flex items-center gap-2">
              <span>مدة التجربة بالأيام:</span>
              <input
                type="number"
                min={1}
                className="w-16 rounded-md border px-2 py-1 text-[11px]"
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
              />
            </label>
            <button
              onClick={handleSetTrial}
              disabled={loadingAction === "trial"}
              className="w-full rounded-md bg-slate-800 px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-60"
            >
              {loadingAction === "trial"
                ? "جاري ضبط التجربة..."
                : "تعيين المتجر كتجريبي بهذه المدة"}
            </button>
          </div>
        </div>
      </div>

      {/* شارت الحركة */}
      {!loadingOverview && overview && (
        <StoreActivityChart activity={overview.activity} />
      )}

      {/* جدول الاشتراكات */}
      {!loadingOverview && overview && (
        <StoreSubscriptionsTable subscriptions={overview.subscriptions} />
      )}

      {/* جدول الفواتير لهذا المتجر (إدارة عامة) */}
      <div className="mx-4 mt-2 rounded-lg border bg-white p-3 text-[11px] text-slate-700 lg:mx-6">
        <div className="mb-2 flex items-center justify-between">
          <div className="font-medium">فواتير هذا المتجر</div>
          <span className="text-[10px] text-slate-500">
            حالة الفاتورة: بانتظار الدفع / مدفوعة / ملغاة
          </span>
        </div>

        {loadingInvoices ? (
          <div className="rounded-md border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-slate-500">
            يتم تحميل الفواتير...
          </div>
        ) : invoices.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-slate-500">
            لا توجد فواتير مسجلة لهذا المتجر.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-right text-[11px]">
              <thead className="border-b bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">رقم الفاتورة</th>
                  <th className="px-3 py-2 font-medium">المبلغ</th>
                  <th className="px-3 py-2 font-medium">الحالة</th>
                  <th className="px-3 py-2 font-medium">تاريخ الإصدار</th>
                  <th className="px-3 py-2 font-medium">تاريخ الاستحقاق</th>
                  <th className="px-3 py-2 font-medium">تاريخ السداد</th>
                  <th className="px-3 py-2 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const shortId = inv.id.slice(0, 8);
                  const amount = (inv.amount_cents ?? 0) / 100;
                  const statusLabel =
                    inv.status === "paid"
                      ? "مدفوعة"
                      : inv.status === "unpaid"
                      ? "بانتظار الدفع"
                      : inv.status === "canceled"
                      ? "ملغاة"
                      : inv.status;

                  const isUpdating = updatingInvoiceId === inv.id;

                  return (
                    <tr
                      key={inv.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-3 py-2 font-mono text-[10px] text-slate-700">
                        #{shortId}
                      </td>
                      <td className="px-3 py-2">
                        {amount.toLocaleString("ar-EG", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        ر.س
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-medium " +
                            (inv.status === "paid"
                              ? "bg-emerald-50 text-emerald-700"
                              : inv.status === "unpaid"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-500")
                          }
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2">{formatDate(inv.issued_at)}</td>
                      <td className="px-3 py-2">{formatDate(inv.due_at)}</td>
                      <td className="px-3 py-2">{formatDate(inv.paid_at)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {inv.status !== "paid" && (
                            <button
                              onClick={() =>
                                handleUpdateInvoiceStatus(inv.id, "paid")
                              }
                              disabled={isUpdating}
                              className="rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-medium text-white disabled:opacity-60"
                            >
                              {isUpdating ? "..." : "تمييز كمدفوعة"}
                            </button>
                          )}
                          {inv.status !== "canceled" && (
                            <button
                              onClick={() =>
                                handleUpdateInvoiceStatus(inv.id, "canceled")
                              }
                              disabled={isUpdating}
                              className="rounded-md bg-slate-200 px-2 py-1 text-[10px] font-medium text-slate-700 disabled:opacity-60"
                            >
                              {isUpdating ? "..." : "إلغاء"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* إنشاء فاتورة جديدة */}
      <div className="mx-4 mt-2 rounded-lg border bg-white p-3 text-[11px] text-slate-700 lg:mx-6">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="font-medium">إنشاء فاتورة جديدة لهذا المتجر</div>
          <span className="text-[10px] text-slate-500">
            الفاتورة تظهر لصاحب المتجر في /dashboard/subscriptions
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-700">
              مبلغ الفاتورة (ريال)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="w-full rounded-md border px-2 py-1 text-[11px]"
              placeholder="مثال: 199.00"
              value={invoiceAmount}
              onChange={(e) => setInvoiceAmount(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-700">
              تاريخ الاستحقاق (اختياري)
            </label>
            <input
              type="date"
              className="w-full rounded-md border px-2 py-1 text-[11px]"
              value={invoiceDueAt}
              onChange={(e) => setInvoiceDueAt(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleCreateInvoice}
              disabled={loadingInvoice}
              className="w-full rounded-md bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-60"
            >
              {loadingInvoice ? "جاري إنشاء الفاتورة..." : "إنشاء فاتورة جديدة"}
            </button>
          </div>
        </div>
      </div>

      {/* روابط إضافية */}
      <div className="mt-2 flex flex-wrap gap-2 px-4 text-[11px] lg:px-6">
        <Link
          href={`/general-manager/stores/${storeId}/users`}
          className="rounded-full border px-3 py-1 hover:bg-slate-50"
        >
          المستخدمين
        </Link>
        <Link
          href={`/general-manager/stores/${storeId}/invitations`}
          className="rounded-full border px-3 py-1 hover:bg-slate-50"
        >
          الدعوات
        </Link>
        <Link
          href={`/general-manager/stores/${storeId}/filter-snapshot`}
          className="rounded-full border px-3 py-1 hover:bg-slate-50"
        >
          Filter Snapshot
        </Link>
      </div>
    </div>
  );
}
