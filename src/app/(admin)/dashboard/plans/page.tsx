"use client";

import { useEffect, useState } from "react";

type Plan = {
  id: string;
  code: string;
  name_ar: string;
  description_ar: string | null;
  price_cents: number;
  billing_cycle: string;
  is_active: boolean;
};

type PlansApi = { ok: boolean; plans: Plan[] };

type OverviewResponse = {
  current_subscription: {
    id: string;
    plan_code: string;
    price_cents: number;
    status: string;
  } | null;
  current_plan: {
    code: string;
    name_ar: string;
  } | null;
};

type CheckoutResp = {
  ok: boolean;
  mode?: "new" | "upgrade";
  code?: string;
  message?: string;
};

function formatPrice(price_cents: number) {
  const amount = price_cents / 100;
  return `${amount.toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ر.س`;
}

function billingLabel(bc: string) {
  if (bc === "trial") return "تجريبي";
  if (bc === "monthly") return "شهري";
  if (bc === "yearly") return "سنوي";
  return bc;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectingCode, setSelectingCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const [plansRes, overviewRes] = await Promise.all([
        fetch("/api/dashboard/plans"),
        fetch("/api/dashboard/subscriptions/overview"),
      ]);

      const plansJson = (await plansRes.json()) as PlansApi;
      const overviewJson = (await overviewRes.json()) as OverviewResponse & {
        error?: string;
      };

      if (!plansRes.ok || !plansJson.ok) {
        setErrorMsg("تعذر جلب خطط الاشتراك.");
        setPlans([]);
      } else {
        setPlans(plansJson.plans);
      }

      if (!overviewRes.ok || (overviewJson as any).error) {
        console.warn("overview error", overviewJson);
        setOverview(null);
      } else {
        setOverview(overviewJson);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("خطأ في الاتصال بالسيرفر.");
      setPlans([]);
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleChoose(plan_code: string) {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSelectingCode(plan_code);
    try {
      const res = await fetch(
        "/api/dashboard/subscriptions/checkout",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan_code }),
        },
      );
      const json = (await res.json()) as CheckoutResp;

      if (!res.ok || !json.ok) {
        setErrorMsg(json.message || "تعذر اختيار الخطة.");
      } else {
        if (json.mode === "upgrade") {
          setSuccessMsg("تم ترقية الخطة وإنشاء فاتورة بفارق السعر.");
        } else {
          setSuccessMsg("تم إنشاء الاشتراك والفاتورة لهذه الخطة.");
        }
        // نعيد تحميل البيانات عشان ينعكس الاشتراك الحالي
        await loadAll();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("خطأ في الاتصال بالسيرفر.");
    } finally {
      setSelectingCode(null);
    }
  }

  const currentSub = overview?.current_subscription;
  const currentPlan = overview?.current_plan;
  const currentPrice = currentSub?.price_cents ?? 0;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          خطط الاشتراك
        </h1>
        <p className="text-sm text-slate-500">
          اختر الباقة المناسبة لمتجرك. سيتم إنشاء اشتراك وفاتورة بناءً على
          الخطة المختارة.
        </p>
        {currentSub && currentPlan && (
          <p className="mt-1 text-xs text-slate-500">
            الخطة الحالية:{" "}
            <span className="font-semibold text-slate-800">
              {currentPlan.name_ar} ({currentPlan.code})
            </span>
          </p>
        )}
      </header>

      {errorMsg && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {successMsg}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          جاري تحميل الخطط...
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          لا توجد خطط مفعّلة حالياً. يرجى التواصل مع الإدارة.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent =
              currentSub && currentSub.plan_code === plan.code;
            const isCheaper = currentPrice > 0 &&
              plan.price_cents < currentPrice;

            let buttonLabel = "اختيار هذه الخطة";
            let buttonDisabled = false;
            let info: string | null = null;

            if (isCurrent) {
              buttonLabel = "أنت مشترك في هذه الخطة";
              buttonDisabled = true;
              info = "هذه هي خطتك الحالية.";
            } else if (isCheaper) {
              buttonLabel = "لا يمكن التخفيض لهذه الخطة";
              buttonDisabled = true;
              info = "تخفيض الخطة غير مسموح من هنا.";
            } else if (currentSub && plan.price_cents > currentPrice) {
              buttonLabel = "ترقية إلى هذه الخطة";
              info = "سيتم إنشاء فاتورة بفارق السعر بين الخطتين.";
            } else if (!currentSub) {
              buttonLabel = "اشترك في هذه الخطة";
            }

            return (
              <div
                key={plan.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-1 text-xs font-semibold text-slate-500">
                  {plan.code}
                </div>
                <div className="text-base font-semibold text-slate-900">
                  {plan.name_ar}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {plan.description_ar || "بدون وصف"}
                </div>

                <div className="mt-3 text-sm font-bold text-slate-900">
                  {formatPrice(plan.price_cents)}
                </div>
                <div className="text-[11px] text-slate-500">
                  الدورة: {billingLabel(plan.billing_cycle)}
                </div>

                {info && (
                  <div className="mt-2 rounded-md bg-slate-50 px-2 py-1 text-[10px] text-slate-500">
                    {info}
                  </div>
                )}

                <button
                  onClick={() => handleChoose(plan.code)}
                  disabled={buttonDisabled || !!selectingCode}
                  className="mt-4 rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-60 hover:bg-slate-800"
                >
                  {selectingCode === plan.code
                    ? "جارٍ تنفيذ الطلب..."
                    : buttonLabel}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
