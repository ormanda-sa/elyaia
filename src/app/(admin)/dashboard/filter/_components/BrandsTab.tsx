"use client";

import { Dispatch, SetStateAction } from "react";
import { DeleteConfirmButton } from "./DeleteConfirmButton";

export type Brand = {
  id: number;
  store_id: string;
  name_ar: string;
  slug: string | null;
  salla_company_id: string | null;
  sort_order: number | null;
};

export type BrandFormState = {
  mode: "add" | "edit";
  id?: number | null;
  name_ar?: string;
  slug?: string | null;
  salla_company_id?: string | null;
  sort_order?: number | null;
};

type Props = {
  brands: Brand[];
  form: BrandFormState;
  setForm: Dispatch<SetStateAction<BrandFormState>>;
  loading: boolean;
  error: string | null;
  onSubmit: () => Promise<void> | void;
  onEdit: (brand: Brand) => void;
  onDelete: (brand: Brand) => Promise<void> | void;
};

export function BrandsTab({
  brands,
  form,
  setForm,
  loading,
  error,
  onSubmit,
  onEdit,
  onDelete,
}: Props) {
  const isEdit = form.mode === "edit";

  return (
    <div dir="rtl" className="w-full">
      {/* نخلي المحتوى في وسط الشاشة بعرض ثابت */}
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        {/* هيدر التبويب */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-700">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              الشركات (Brands)
              <span className="mx-1 h-3 w-px bg-slate-200" />
              <span className="text-slate-500">
                إجمالي:{" "}
                <span className="font-semibold text-slate-900">
                  {brands.length}
                </span>
              </span>
            </div>
            <p className="text-xs text-slate-500">
              إدارة شركات السيارات وربطها بـ{" "}
              <span className="font-mono text-[11px] text-slate-700">
                company.id
              </span>{" "}
              و{" "}
              <span className="font-mono text-[11px] text-slate-700">
                slug
              </span>{" "}
              من سلة، عشان الفلتر في الواجهة يكون مرتب وواضح.
            </p>
          </div>
        </div>

        {/* الفورم – كرت واحد واضح بدون فضاوة كبيرة */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          {/* لمسات خلفية بسيطة */}
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div className="absolute -top-16 left-[-15%] h-32 w-32 rounded-full bg-[radial-gradient(circle_at_center,#38bdf8_0,transparent_60%)] blur-2xl" />
            <div className="absolute -bottom-20 right-[-10%] h-32 w-32 rounded-full bg-[radial-gradient(circle_at_center,#a855f7_0,transparent_60%)] blur-2xl" />
          </div>

          <div className="relative space-y-4">
            {/* عنوان الفورم */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-7 items-center rounded-full bg-slate-900/95 px-3 text-[11px] font-medium text-slate-50 shadow-sm">
                  {isEdit ? "تعديل شركة موجودة" : "إضافة شركة جديدة"}
                </span>
                {isEdit && form.name_ar && (
                  <span className="text-[11px] text-slate-500">
                    حالياً تعدّل:{" "}
                    <span className="font-semibold text-slate-800">
                      {form.name_ar}
                    </span>
                  </span>
                )}
              </div>

              {isEdit && (
                <button
                  type="button"
                  onClick={() => setForm({ mode: "add" })}
                  className="text-[11px] text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
                >
                  إلغاء التعديل
                </button>
              )}
            </div>

            {/* الحقول */}
            <div className="grid gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className="mb-1 block text-[11px] text-slate-500">
                  اسم الشركة بالعربي
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10"
                  value={form.name_ar || ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name_ar: e.target.value }))
                  }
                  placeholder="مثال: تويوتا"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] text-slate-500">
                  slug (اختياري)
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10"
                  value={form.slug || ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  placeholder="مثال: GKQeoY"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] text-slate-500">
                  company.id في سلة (اختياري)
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10"
                  value={form.salla_company_id || ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      salla_company_id: e.target.value,
                    }))
                  }
                  placeholder="مثال: 2029219668"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] text-slate-500">
                  الترتيب في القوائم
                </label>
                <input
                  type="number"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10"
                  value={form.sort_order ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      sort_order: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    }))
                  }
                  placeholder="1"
                />
              </div>
            </div>

            {/* زر الحفظ + ملاحظة */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] text-slate-500">
                الاسم والـ slug بيظهرون في واجهة الفلتر، خلك دقيق وواضح.
              </p>
              <button
                type="button"
                onClick={onSubmit}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-slate-50 shadow-sm transition hover:bg-slate-800 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.3)]" />
                {isEdit ? "تحديث الشركة" : "حفظ الشركة"}
              </button>
            </div>
          </div>
        </div>

        {/* رسالة الخطأ */}
        {error && (
          <p className="rounded-2xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-[11px] text-rose-700">
            خطأ: {error}
          </p>
        )}

        {/* جدول الشركات */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70">
          <div className="max-h-[360px] overflow-auto">
            <table className="min-w-full text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100/90 backdrop-blur">
                <tr>
                  <th className="px-3 py-2 text-right font-medium text-slate-500">
                    #
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-slate-500">
                    الاسم
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-slate-500">
                    slug
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-slate-500">
                    company.id
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-slate-500">
                    ترتيب
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-slate-500">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white/90">
                {brands.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-6 text-center text-[11px] text-slate-400"
                    >
                      لا توجد شركات مضافة حتى الآن.
                    </td>
                  </tr>
                )}

                {brands.map((b, index) => (
                  <tr
                    key={b.id}
                    className="transition hover:bg-slate-50/80"
                  >
                    <td className="px-3 py-2 text-[11px] text-slate-500">
                      {index + 1}
                    </td>
                    <td className="px-3 py-2 text-xs font-medium text-slate-900">
                      {b.name_ar}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-600">
                      {b.slug ? (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-700">
                          {b.slug}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-600">
                      {b.salla_company_id ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[10px] text-emerald-700">
                          {b.salla_company_id}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-600">
                      {b.sort_order ?? (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[11px]">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEdit(b)}
                          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          تعديل
                        </button>
                        <DeleteConfirmButton
                          onConfirm={() => onDelete(b)}
                          title="حذف الشركة"
                          description={`هل أنت متأكد أنك تريد حذف الشركة "${b.name_ar}"؟ قد تتأثر الموديلات والسنوات والكلمات المرتبطة بها.`}
                        >
                          حذف
                        </DeleteConfirmButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
