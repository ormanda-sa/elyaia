"use client";

import { Dispatch, SetStateAction, useState } from "react";
import type { Brand } from "./BrandsTab";
import type { Model } from "./ModelsTab";
import { DeleteConfirmButton } from "./DeleteConfirmButton";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";

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

export type YearRow = {
  id: number;
  store_id: string;
  model_id: number;
  year: string;
  slug: string | null;
  salla_year_id: string | null;
  sort_order: number | null;
};

export type YearFormState = {
  mode: "add" | "edit";
  id?: number | null;
  year?: string;
  slug?: string | null;
  salla_year_id?: string | null;
  sort_order?: number | null;
};

type Props = {
  brands: Brand[];
  models: Model[];
  selectedBrandId: number | null;
  setSelectedBrandId: Dispatch<SetStateAction<number | null>>;
  selectedModelId: number | null;
  setSelectedModelId: Dispatch<SetStateAction<number | null>>;
  years: YearRow[];
  form: YearFormState;
  setForm: Dispatch<SetStateAction<YearFormState>>;
  loading: boolean;
  error: string | null;
  onSubmit: () => Promise<void> | void;
  onEdit: (y: YearRow) => void;
  onDelete: (y: YearRow) => Promise<void> | void;
};

export function YearsTab({
  brands,
  models,
  selectedBrandId,
  setSelectedBrandId,
  selectedModelId,
  setSelectedModelId,
  years,
  form,
  setForm,
  loading,
  error,
  onSubmit,
  onEdit,
  onDelete,
}: Props) {
  const [brandPopoverOpen, setBrandPopoverOpen] = useState(false);
  const [modelPopoverOpen, setModelPopoverOpen] = useState(false);

  const selectedBrand =
    brands.find((b) => b.id === selectedBrandId) || null;

  const filteredModels = selectedBrandId
    ? models.filter((m) => m.brand_id === selectedBrandId)
    : [];

  const selectedModel =
    filteredModels.find((m) => m.id === selectedModelId) || null;

  const filteredYears = selectedModelId
    ? years.filter((y) => y.model_id === selectedModelId)
    : [];

  const isEdit = form.mode === "edit";

  const handleSelectBrand = (value: string) => {
    if (!value) {
      setSelectedBrandId(null);
      setSelectedModelId(null);
      return;
    }
    const idNum = Number(value);
    if (Number.isNaN(idNum)) {
      setSelectedBrandId(null);
      setSelectedModelId(null);
      return;
    }
    setSelectedBrandId(idNum);
    setSelectedModelId(null); // إعادة تعيين الموديل عند تغيير الشركة
  };

  const handleSelectModel = (value: string) => {
    if (!value) {
      setSelectedModelId(null);
      return;
    }
    const idNum = Number(value);
    setSelectedModelId(Number.isNaN(idNum) ? null : idNum);
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* الهيدر */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-700">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
            السنوات (Years)
            <span className="mx-1 h-3 w-px bg-slate-200" />
            <span className="text-slate-500">
              عدد السنوات للموديل الحالي:{" "}
              <span className="font-semibold text-slate-900">
                {selectedModel ? filteredYears.length : 0}
              </span>
            </span>
          </div>
          <p className="text-xs text-slate-500">
            السنوات أو المدى الزمني للموديل المختار (مثال:{" "}
            <span className="font-mono text-[11px]">2006</span> أو{" "}
            <span className="font-mono text-[11px]">1998-2000</span>)، وتُستخدم
            في الفلتر عشان العميل يحدد موديل سيارته بالضبط.
          </p>
          {selectedBrand && selectedModel && (
            <p className="text-[11px] text-slate-400">
              الموديل الحالي:{" "}
              <span className="font-semibold text-slate-800">
                {selectedBrand.name_ar} — {selectedModel.name_ar}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* اختيار الشركة + الموديل – Comboboxes */}
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
        <div className="grid gap-3 md:grid-cols-2">
          {/* الشركة */}
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
                  {selectedBrand ? selectedBrand.name_ar : "اختر شركة..."}
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>

              <PopoverContent align="start" className="w-[240px] p-0">
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
          </div>

          {/* السيارة / الموديل */}
          <div>
            <label className="mb-1 block text-[11px] text-slate-500">
              السيارة
            </label>

            <Popover
              open={modelPopoverOpen}
              onOpenChange={setModelPopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  disabled={!selectedBrandId}
                  className={cn(
                    "w-full justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-900",
                    (!selectedBrandId || !selectedModelId) &&
                      "text-slate-400"
                  )}
                >
                  {selectedModel
                    ? selectedModel.name_ar
                    : selectedBrandId
                    ? "اختر موديل..."
                    : "اختر شركة أولاً"}
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>

              <PopoverContent align="start" className="w-[240px] p-0">
                <Command dir="rtl">
                  <CommandInput
                    placeholder="بحث عن موديل..."
                    className="h-9 text-xs"
                  />
                  <CommandList>
                    <CommandEmpty className="text-[11px]">
                      لا يوجد موديل مطابق.
                    </CommandEmpty>
                    <CommandGroup>
                      {filteredModels.map((m) => (
                        <CommandItem
                          key={m.id}
                          value={String(m.id)}
                          className="text-xs"
                          onSelect={(val) => {
                            if (val === String(selectedModelId ?? "")) {
                              handleSelectModel("");
                            } else {
                              handleSelectModel(val);
                            }
                            setModelPopoverOpen(false);
                          }}
                        >
                          {m.name_ar}
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              selectedModelId === m.id
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
          </div>
        </div>

        <p className="mt-2 text-[10px] text-slate-400">
          لازم تختار الشركة ثم السيارة، بعدها تقدر تضيف السنوات أو مدى السنوات
          المرتبطة بالموديل.
        </p>
      </div>

      {/* فورم السنة – كرت زجاجي */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/80 via-white/80 to-slate-100/70 p-[1px] shadow-[0_14px_45px_rgba(15,23,42,0.12)]">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -top-16 left-[-10%] h-32 w-32 rounded-full bg-[radial-gradient(circle_at_center,#f97316_0,transparent_60%)] blur-2xl" />
          <div className="absolute -bottom-16 right-[-10%] h-32 w-32 rounded-full bg-[radial-gradient(circle_at_center,#22c55e_0,transparent_60%)] blur-2xl" />
        </div>

        <div className="relative rounded-2xl bg-white/80 p-3 backdrop-blur-xl sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-7 items-center rounded-full bg-slate-900/95 px-3 text-[11px] font-medium text-slate-50 shadow-sm">
                {isEdit ? "تعديل سنة / نطاق" : "إضافة سنة / نطاق"}
              </span>
              {isEdit && form.year && (
                <span className="text-[11px] text-slate-500">
                  حالياً تعدّل:{" "}
                  <span className="font-semibold text-slate-800">
                    {form.year}
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
                السنة / المدى
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10"
                value={form.year || ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, year: e.target.value }))
                }
                placeholder='مثال: "2006" أو "1998-2000"'
                disabled={!selectedModelId}
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
                placeholder="مثال: vyPBez"
                disabled={!selectedModelId}
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-slate-500">
                year.id في سلة (اختياري)
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10"
                value={form.salla_year_id || ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    salla_year_id: e.target.value,
                  }))
                }
                placeholder="مثال: 1430249247"
                disabled={!selectedModelId}
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
                disabled={!selectedModelId}
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="hidden text-[11px] text-slate-500 sm:block">
              حاول توحّد شكل السنوات (مثلاً:{" "}
              <span className="font-mono text-[10px]">2006</span> أو{" "}
              <span className="font-mono text-[10px]">2006-2011</span>) عشان
              ما يتلخبط العميل في الفلتر.
            </p>
            <button
              type="button"
              onClick={onSubmit}
              disabled={loading || !selectedModelId}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-slate-50 shadow-sm transition hover:bg-slate-800 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.35)]" />
              {isEdit ? "تحديث السنة" : "حفظ السنة"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-[11px] text-rose-700">
          خطأ: {error}
        </p>
      )}

      {/* جدول السنوات (للموديل المختار فقط) */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60">
        <div className="max-h-[420px] overflow-auto">
       <table className="min-w-full text-xs">
  <thead className="sticky top-0 z-10 bg-slate-100/90 backdrop-blur">
    <tr>
      <th className="px-3 py-2 text-right font-medium text-slate-500">#</th>
      <th className="px-3 py-2 text-right font-medium text-slate-500">
        السنة / المدى
      </th>
      <th className="px-3 py-2 text-right font-medium text-slate-500">slug</th>
      <th className="px-3 py-2 text-right font-medium text-slate-500">
        year.id
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
    {(!selectedBrand || !selectedModel || filteredYears.length === 0) && (
      <tr>
        <td
          colSpan={6}
          className="px-3 py-6 text-center text-[11px] text-slate-400"
        >
          لا توجد سنوات للموديل المختار حتى الآن.
        </td>
      </tr>
    )}

    {selectedBrand &&
      selectedModel &&
      filteredYears.map((y, index) => (
        <tr key={y.id} className="transition hover:bg-slate-50/80">
          <td className="px-3 py-2 text-[11px] text-slate-500">
            {index + 1}
          </td>
          <td className="px-3 py-2 text-xs font-medium text-slate-900">
            {y.year}
          </td>
          <td className="px-3 py-2 text-[11px] text-slate-600">
            {y.slug ? (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-700">
                {y.slug}
              </span>
            ) : (
              <span className="text-slate-300">-</span>
            )}
          </td>
          <td className="px-3 py-2 text-[11px] text-slate-600">
            {y.salla_year_id ? (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 font-mono text-[10px] text-amber-700">
                {y.salla_year_id}
              </span>
            ) : (
              <span className="text-slate-300">-</span>
            )}
          </td>
          <td className="px-3 py-2 text-[11px] text-slate-600">
            {y.sort_order ?? <span className="text-slate-300">-</span>}
          </td>
          <td className="px-3 py-2 text-[11px]">
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => onEdit(y)}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                تعديل
              </button>
              <DeleteConfirmButton
                onConfirm={() => onDelete(y)}
                title="حذف سنة / نطاق"
                description={`هل أنت متأكد أنك تريد حذف السنة / النطاق "${y.year}"؟`}
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
