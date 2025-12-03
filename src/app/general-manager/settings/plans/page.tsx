// src/app/general-manager/settings/plans/page.tsx
"use client";

import { useEffect, useState } from "react";
// لو عندك زر/Dialog من shadcn استخدم اللي عندك، هنا نستخدم أبسط شكل
// لو ما عندك Dialog جاهز، هذا مجرد div بسيط كـ popup

type PlanRow = {
  id: string;
  code: string;
  name_ar: string;
  description_ar: string | null;
  price_cents: number;
  billing_cycle: string;
  is_active: boolean;
  created_at: string;
};

export default function SubscriptionPlansPage() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  // حالة البوب-أب + فورم الخطة الجديدة
  const [showCreate, setShowCreate] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPrice, setNewPrice] = useState("0");
  const [newCycle, setNewCycle] = useState("monthly");
  const [creating, setCreating] = useState(false);

  async function loadPlans() {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/general-manager/plans");
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(data?.message || "فشل جلب الخطط.");
        setPlans([]);
      } else {
        setPlans(data.plans as PlanRow[]);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("خطأ في الاتصال بالسيرفر.");
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlans();
  }, []);

  async function handleSave(plan: PlanRow) {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSavingId(plan.id);

    try {
      const res = await fetch(
        `/api/general-manager/plans/${encodeURIComponent(plan.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            price_cents: plan.price_cents,
            billing_cycle: plan.billing_cycle,
            is_active: plan.is_active,
            name_ar: plan.name_ar,
            description_ar: plan.description_ar,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(data?.message || "فشل حفظ التعديلات.");
      } else {
        setSuccessMsg("تم حفظ التعديلات على الخطة بنجاح.");
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("خطأ في الاتصال بالسيرفر أثناء الحفظ.");
    } finally {
      setSavingId(null);
    }
  }

  function handleFieldChange(
    id: string,
    field: keyof PlanRow,
    value: string | boolean,
  ) {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              [field]:
                field === "price_cents"
                  ? Number(value) || 0
                  : field === "is_active"
                  ? Boolean(value)
                  : value,
            }
          : p,
      ),
    );
  }

  // إضافة خطة جديدة من البوب-أب
  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newCode.trim() || !newName.trim()) {
      setErrorMsg("الكود واسم الخطة مطلوبان.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/general-manager/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode.trim(),
          name_ar: newName.trim(),
          description_ar: newDesc.trim() || null,
          price_cents: Number(newPrice) * 100 || 0,
          billing_cycle: newCycle,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(data?.message || "فشل إنشاء الخطة الجديدة.");
      } else {
        setSuccessMsg("تم إنشاء الخطة الجديدة بنجاح.");
        setShowCreate(false);
        setNewCode("");
        setNewName("");
        setNewDesc("");
        setNewPrice("0");
        setNewCycle("monthly");
        loadPlans();
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("خطأ في الاتصال بالسيرفر أثناء إنشاء الخطة.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">خطط الاشتراك</h1>
          <p className="text-[11px] text-slate-500">
            إدارة الأسعار والخطط المتاحة للمتاجر.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadPlans}
            className="rounded-md border px-3 py-1.5 text-[11px]"
          >
            تحديث
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white"
          >
            + إضافة خطة جديدة
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
          {successMsg}
        </div>
      )}

      {/* بوب-أب بسيط */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-4 text-[11px]">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">إضافة خطة اشتراك جديدة</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="text-xs text-slate-500"
              >
                إغلاق
              </button>
            </div>
            <form onSubmit={handleCreatePlan} className="space-y-2">
              <div className="space-y-1">
                <label className="font-medium">الكود (مثال: pro_monthly)</label>
                <input
                  className="w-full rounded-md border px-2 py-1"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium">اسم الخطة</label>
                <input
                  className="w-full rounded-md border px-2 py-1"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium">الوصف</label>
                <input
                  className="w-full rounded-md border px-2 py-1"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium">السعر (ريال)</label>
                <input
                  type="number"
                  min={0}
                  className="w-24 rounded-md border px-2 py-1"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium">الدورة</label>
                <select
                  className="rounded-md border px-2 py-1"
                  value={newCycle}
                  onChange={(e) => setNewCycle(e.target.value)}
                >
                  <option value="monthly">شهري</option>
                  <option value="yearly">سنوي</option>
                </select>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-md border px-3 py-1 text-[11px]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-md bg-slate-900 px-3 py-1 text-[11px] font-medium text-white disabled:opacity-60"
                >
                  {creating ? "جارٍ الإضافة..." : "حفظ الخطة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-2 text-right">الكود</th>
              <th className="px-4 py-2 text-right">اسم الخطة</th>
              <th className="px-4 py-2 text-right">الوصف</th>
              <th className="px-4 py-2 text-right">السعر (ريال)</th>
              <th className="px-4 py-2 text-right">الدورة</th>
              <th className="px-4 py-2 text-right">مفعّلة</th>
              <th className="px-4 py-2 text-right">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-slate-400"
                >
                  جاري التحميل...
                </td>
              </tr>
            ) : plans.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-slate-400"
                >
                  لا توجد خطط مسجّلة حاليًا.
                </td>
              </tr>
            ) : (
              plans.map((plan) => (
                <tr key={plan.id} className="border-t text-[11px]">
                  <td className="px-4 py-2 font-mono text-[10px]">
                    {plan.code}
                  </td>
                  <td className="px-4 py-2">
                    <input
                      className="w-full rounded-md border px-2 py-1 text-[11px]"
                      value={plan.name_ar}
                      onChange={(e) =>
                        handleFieldChange(plan.id, "name_ar", e.target.value)
                      }
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      className="w-full rounded-md border px-2 py-1 text-[11px]"
                      value={plan.description_ar ?? ""}
                      onChange={(e) =>
                        handleFieldChange(
                          plan.id,
                          "description_ar",
                          e.target.value,
                        )
                      }
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min={0}
                      className="w-20 rounded-md border px-2 py-1 text-[11px]"
                      value={plan.price_cents / 100}
                      onChange={(e) =>
                        handleFieldChange(
                          plan.id,
                          "price_cents",
                          String(Number(e.target.value) * 100),
                        )
                      }
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      className="rounded-md border px-2 py-1 text-[11px]"
                      value={plan.billing_cycle}
                      onChange={(e) =>
                        handleFieldChange(
                          plan.id,
                          "billing_cycle",
                          e.target.value,
                        )
                      }
                    >
                      <option value="monthly">شهري</option>
                      <option value="yearly">سنوي</option>
                    </select>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={plan.is_active}
                      onChange={(e) =>
                        handleFieldChange(
                          plan.id,
                          "is_active",
                          e.target.checked,
                        )
                      }
                    />
                  </td>
                  <td className="px-4 py-2 text-left">
                    <button
                      onClick={() => handleSave(plan)}
                      disabled={savingId === plan.id}
                      className="rounded-md bg-slate-900 px-3 py-1 text-[11px] font-medium text-white disabled:opacity-60"
                    >
                      {savingId === plan.id ? "جارٍ الحفظ..." : "حفظ"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
