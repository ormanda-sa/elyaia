"use client";

import { Dispatch, SetStateAction, useState } from "react";
import type { Brand } from "./BrandsTab";
import { DeleteConfirmButton } from "./DeleteConfirmButton";

// shadcn + icons
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type Model = {
  id: number;
  store_id: string;
  brand_id: number;
  name_ar: string;
  slug: string | null;
  salla_category_id: string | null;
  sort_order: number | null;
};

export type ModelFormState = {
  mode: "add" | "edit";
  id?: number | null;
  name_ar?: string;
  slug?: string | null;
  salla_category_id?: string | null;
  sort_order?: number | null;
};

type Props = {
  brands: Brand[];
  models: Model[];
  selectedBrandId: number | null;
  setSelectedBrandId: Dispatch<SetStateAction<number | null>>;
  form: ModelFormState;
  setForm: Dispatch<SetStateAction<ModelFormState>>;
  loading: boolean;
  error: string | null;
  onSubmit: () => Promise<void> | void;
  onEdit: (model: Model) => void;
  onDelete: (model: Model) => Promise<void> | void;
};

export function ModelsTab({
  brands,
  models,
  selectedBrandId,
  setSelectedBrandId,
  form,
  setForm,
  loading,
  error,
  onSubmit,
  onEdit,
  onDelete,
}: Props) {
  const [brandPopoverOpen, setBrandPopoverOpen] = useState(false);

  const selectedBrand =
    brands.find((b) => b.id === selectedBrandId) || null;

  const filteredModels = selectedBrandId
    ? models.filter((m) => m.brand_id === selectedBrandId)
    : [];

  const isEdit = form.mode === "edit";

  const handleSelectBrand = (value: string) => {
    if (!value) {
      setSelectedBrandId(null);
      return;
    }
    const idNum = Number(value);
    setSelectedBrandId(Number.isNaN(idNum) ? null : idNum);
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* هيدر التبويب */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-700">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500" />
            السيارات (Models)
            <span className="mx-1 h-3 w-px bg-slate-200" />
            <span className="text-slate-500">
              إجمالي الموديلات:{" "}
              <span className="font-semibold text-slate-900">
                {models.length}
              </span>
            </span>
          </div>
          <p className="text-xs text-slate-500">
            الموديلات المرتبطة بكل شركة. اختر الشركة أولاً ثم أضف أو عدّل
            الموديلات التابعة لها.
          </p>
          {selectedBrand && (
            <p className="text-[11px] text-slate-400">
              الشركة الحالية:{" "}
              <span className="font-semibold text-slate-800">
                {selectedBrand.name_ar}
              </span>
            </p>
          )}
        </div>

        {selectedBrand && (
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-600 shadow-sm">
            مرتبط حالياً مع فلتر:{" "}
            <span className="font-semibold text-slate-900">
              {selectedBrand.name_ar}
            </span>
          </div>
        )}
      </div>

      {/* اختيار الشركة – Combobox بدل select */}
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] text-slate-500">
              الشركة
            </label>

            <Popover open={brandPopoverOpen} onOpenChange={setBrandPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "w-full justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-900",
                    !selectedBrandId && "text-slate-400"
                  )}
                >
                  {selectedBrand
                    ? selectedBrand.name_ar
                    : "اختر شركة..."}
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>

              <PopoverContent
                align="start"
                className="w-[240px] p-0"
              >
                <Command dir="rtl">
                  <CommandInput
                    placeholder="بحث عن شركة..."
                    className="h-9 text-xs"
                  />
                  <CommandList>
                    <CommandEmpty className="text-[11px]">
                      لا توجد شركة مطابقة.
                    </CommandEmpty>
                    <CommandGroup>
                      {brands.map((b) => (
                        <CommandItem
                          key={b.id}
                          value={String(b.id)}
                          className="text-xs"
                          onSelect={(val) => {
                            if (val === String(selectedBrandId ?? "")) {
                              handleSelectBrand("");
                            } else {
                              handleSelectBrand(val);
                            }
                            setBrandPopoverOpen(false);
                          }}
                        >
                          {b.name_ar}
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              selectedBrandId === b.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <p className="mt-1 text-[10px] text-slate-400">
              لازم تختار شركة عشان تشوف الموديلات المرتبطة بها وتضيف موديلات جديدة.
            </p>
          </div>
        </div>
      </div>

     {/* فورم الموديل – صف واحد مضغوط */}
<div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/80 via-white/80 to-slate-100/70 p-[1px] shadow-[0_14px_45px_rgba(15,23,42,0.12)]">
  <div className="relative rounded-2xl bg-white/80 p-3 backdrop-blur-xl sm:p-4">
    <div className="mb-3 flex items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-7 items-center rounded-full bg-slate-900/95 px-3 text-[11px] font-medium text-slate-50 shadow-sm">
          {isEdit ? "تعديل موديل" : "إضافة موديل جديد"}
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

    {/* صف واحد صغير للحقول */}
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[180px] flex-1">
        <label className="mb-1 block text-[11px] text-slate-500">
          اسم الموديل
        </label>
        <input
          className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-[13px] text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10"
          value={form.name_ar || ""}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, name_ar: e.target.value }))
          }
          placeholder="مثال: كامري"
        />
      </div>

      <div className="min-w-[120px]">
        <label className="mb-1 block text-[11px] text-slate-500">
          slug (اختياري)
        </label>
        <input
          className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-[11px] text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10"
          value={form.slug || ""}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, slug: e.target.value }))
          }
          placeholder="wdpGVw"
        />
      </div>

      <div className="min-w-[140px]">
        <label className="mb-1 block text-[11px] text-slate-500">
          category.id في سلة (اختياري)
        </label>
        <input
          className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-[11px] text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10"
          value={form.salla_category_id || ""}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              salla_category_id: e.target.value,
            }))
          }
          placeholder="1499123062"
        />
      </div>

      <div className="w-[80px]">
        <label className="mb-1 block text-[11px] text-slate-500">
          الترتيب
        </label>
        <input
          type="number"
          className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-2 py-1.5 text-[11px] text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10"
          value={form.sort_order ?? ""}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              sort_order: e.target.value ? Number(e.target.value) : undefined,
            }))
          }
          placeholder="1"
        />
      </div>

      <div className="shrink-0">
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading || !selectedBrandId}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-slate-50 shadow-sm transition hover:bg-slate-800 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_0_3px_rgba(56,189,248,0.35)]" />
          {isEdit ? "تحديث الموديل" : "حفظ الموديل"}
        </button>
      </div>
    </div>
  </div>
</div>


      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-[11px] text-rose-700">
          خطأ: {error}
        </p>
      )}

      {/* جدول الموديلات */}
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
                  category.id
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
              {(!selectedBrand || filteredModels.length === 0) && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-[11px] text-slate-400"
                  >
                    لا توجد موديلات للشركة المختارة حتى الآن.
                  </td>
                </tr>
              )}

              {filteredModels.map((m, index) => (
                <tr
                  key={m.id}
                  className="transition hover:bg-slate-50/80"
                >
                  <td className="px-3 py-2 text-[11px] text-slate-500">
                    {index + 1}
                  </td>
                  <td className="px-3 py-2 text-xs font-medium text-slate-900">
                    {m.name_ar}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-600">
                    {m.slug ? (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-700">
                        {m.slug}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-600">
                    {m.salla_category_id ? (
                      <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 font-mono text-[10px] text-sky-700">
                        {m.salla_category_id}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-600">
                    {m.sort_order ?? (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[11px]">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEdit(m)}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        تعديل
                      </button>
                     <DeleteConfirmButton
  onConfirm={() => onDelete(m)}
  title="حذف الموديل"
  description={`هل أنت متأكد أنك تريد حذف الموديل "${m.name_ar}"؟ قد تتأثر السنوات والكلمات المرتبطة به.`}
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
