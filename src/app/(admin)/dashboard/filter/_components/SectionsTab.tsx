// src/app/(admin)/dashboard/filter/_components/SectionsTab.tsx
"use client";

import { Dispatch, SetStateAction } from "react";
import { DeleteConfirmButton } from "./DeleteConfirmButton";
export type Section = {
  id: number;
  store_id: string;
  name_ar: string;
  slug: string | null;
  salla_section_id: string | null;
  sort_order: number | null;
};

export type SectionFormState = {
  mode: "add" | "edit";
  id?: number | null;
  name_ar?: string;
  slug?: string | null;
  salla_section_id?: string | null;
  sort_order?: number | null;
};

type Props = {
  sections: Section[];
  form: SectionFormState;
  setForm: Dispatch<SetStateAction<SectionFormState>>;
  loading: boolean;
  error: string | null;
  onSubmit: () => Promise<void> | void;
  onEdit: (s: Section) => void;
  onDelete: (s: Section) => Promise<void> | void;
};

export function SectionsTab({
  sections,
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
    <div className="space-y-4" dir="rtl">
      {/* هيدر التبويب */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-700">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-violet-500" />
            الأقسام (Sections)
            <span className="mx-1 h-3 w-px bg-slate-200" />
            <span className="text-slate-500">
              إجمالي الأقسام:{" "}
              <span className="font-semibold text-slate-900">
                {sections.length}
              </span>
            </span>
          </div>
          <p className="text-xs text-slate-500">
            الأقسام الرئيسية للقطع التي تظهر في الفلتر (الأضواء، مكانيكا،
            أنظمة التبريد، القطع الخارجية…)، وهي اللي تمسك الهيكل الكامل
            للودجت.
          </p>
        </div>
      </div>

      {/* فورم القسم – كرت زجاجي */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/80 via-white/80 to-slate-100/70 p-[1px] shadow-[0_14px_45px_rgba(15,23,42,0.12)]">
        {/* خلفية جيل زد خفيفة */}
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -top-16 left-[-10%] h-32 w-32 rounded-full bg-[radial-gradient(circle_at_center,#a855f7_0,transparent_60%)] blur-2xl" />
          <div className="absolute -bottom-16 right-[-10%] h-32 w-32 rounded-full bg-[radial-gradient(circle_at_center,#38bdf8_0,transparent_60%)] blur-2xl" />
        </div>

        <div className="relative rounded-2xl bg-white/80 p-3 backdrop-blur-xl sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-7 items-center rounded-full bg-slate-900/95 px-3 text-[11px] font-medium text-slate-50 shadow-sm">
                {isEdit ? "تعديل قسم" : "إضافة قسم جديد"}
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

          <div className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="mb-1 block text-[11px] text-slate-500">
                اسم القسم
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10"
                value={form.name_ar || ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name_ar: e.target.value }))
                }
                placeholder="مثال: الأضواء"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-slate-500">
                slug (اختياري)
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10"
                value={form.slug || ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, slug: e.target.value }))
                }
                placeholder="مثال: lights"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-slate-500">
                section.id في سلة (اختياري)
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10"
                value={form.salla_section_id || ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    salla_section_id: e.target.value,
                  }))
                }
                placeholder="مثال: 2058954628"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-slate-500">
                الترتيب
              </label>
              <input
                type="number"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10"
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

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="hidden text-[11px] text-slate-500 sm:block">
              القسم بيظهر كخيار أساسي في الفلتر (الأضواء، الميكانيكا، إلخ).
              خلّي أسماء الأقسام واضحة للعميل.
            </p>
            <button
              type="button"
              onClick={onSubmit}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-slate-50 shadow-sm transition hover:bg-slate-800 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_0_3px_rgba(139,92,246,0.35)]" />
              {isEdit ? "تحديث القسم" : "حفظ القسم"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-[11px] text-rose-700">
          خطأ: {error}
        </p>
      )}

      {/* جدول الأقسام */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60">
        <div className="max-h-[420px] overflow-auto">
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
                  section.id
                </th>
                <th className="px-3 py-2 text-right font-medium text-slate-500">
                  ترتيب
                </th>
                <th className="px-3 py-2 text-right font-medium text-slate-500">
                  إجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/80">
              {sections.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-[11px] text-slate-400"
                  >
                    لا توجد أقسام مضافة حتى الآن.
                  </td>
                </tr>
              )}

              {sections.map((s, index) => (
                <tr
                  key={s.id}
                  className="transition hover:bg-slate-50/80"
                >
                  <td className="px-3 py-2 text-[11px] text-slate-500">
                    {index + 1}
                  </td>
                  <td className="px-3 py-2 text-xs font-medium text-slate-900">
                    {s.name_ar}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-600">
                    {s.slug ? (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-700">
                        {s.slug}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-600">
                    {s.salla_section_id ? (
                      <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 font-mono text-[10px] text-violet-700">
                        {s.salla_section_id}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-600">
                    {s.sort_order ?? (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[11px]">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEdit(s)}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        تعديل
                      </button>
                     <DeleteConfirmButton
  onConfirm={() => onDelete(s)}
  title="حذف القسم"
  description={`هل أنت متأكد أنك تريد حذف القسم "${s.name_ar}"؟ قد تتأثر الكلمات المرتبطة به.`}
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
  );
}
