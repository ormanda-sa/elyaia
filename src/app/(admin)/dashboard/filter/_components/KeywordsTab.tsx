"use client";

import { Dispatch, SetStateAction, useState } from "react";
import type { Brand } from "./BrandsTab";
import type { Model } from "./ModelsTab";
import type { Section } from "./SectionsTab";
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

export type Keyword = {
  id: number;
  store_id: string;
  model_id: number;
  section_id: number;
  name_ar: string;
  slug: string | null;
  sort_order: number | null;
};

export type KeywordFormState = {
  mode: "add" | "edit";
  id?: number | null;
  name_ar?: string;
  sort_order?: number | null;
};

type Props = {
  brands: Brand[];
  models: Model[];
  sections: Section[];
  selectedBrandId: number | null;
  setSelectedBrandId: Dispatch<SetStateAction<number | null>>;
  selectedModelId: number | null;
  setSelectedModelId: Dispatch<SetStateAction<number | null>>;
  selectedSectionId: number | null;
  setSelectedSectionId: Dispatch<SetStateAction<number | null>>;
  keywords: Keyword[];
  form: KeywordFormState;
  setForm: Dispatch<SetStateAction<KeywordFormState>>;
  loading: boolean;
  error: string | null;
  onSubmit: () => Promise<void> | void;
  onEdit: (k: Keyword) => void;
  onDelete: (k: Keyword) => Promise<void> | void;
};

export function KeywordsTab({
  brands,
  models,
  sections,
  selectedBrandId,
  setSelectedBrandId,
  selectedModelId,
  setSelectedModelId,
  selectedSectionId,
  setSelectedSectionId,
  keywords,
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
  const [sectionPopoverOpen, setSectionPopoverOpen] = useState(false);

  const selectedBrand =
    brands.find((b) => b.id === selectedBrandId) || null;

  const filteredModels = selectedBrandId
    ? models.filter((m) => m.brand_id === selectedBrandId)
    : [];

  const selectedModel =
    filteredModels.find((m) => m.id === selectedModelId) || null;

  const selectedSection =
    sections.find((s) => s.id === selectedSectionId) || null;

  const hasContext = selectedBrand && selectedModel && selectedSection;
  const isEdit = form.mode === "edit";

  const handleSelectBrand = (value: string) => {
    if (!value) {
      setSelectedBrandId(null);
      setSelectedModelId(null);
      setSelectedSectionId(null);
      return;
    }
    const idNum = Number(value);
    if (Number.isNaN(idNum)) {
      setSelectedBrandId(null);
      setSelectedModelId(null);
      setSelectedSectionId(null);
      return;
    }
    setSelectedBrandId(idNum);
    setSelectedModelId(null);
    setSelectedSectionId(null);
  };

  const handleSelectModel = (value: string) => {
    if (!value) {
      setSelectedModelId(null);
      setSelectedSectionId(null);
      return;
    }
    const idNum = Number(value);
    setSelectedModelId(Number.isNaN(idNum) ? null : idNum);
    setSelectedSectionId(null);
  };

  const handleSelectSection = (value: string) => {
    if (!value) {
      setSelectedSectionId(null);
      return;
    }
    const idNum = Number(value);
    setSelectedSectionId(Number.isNaN(idNum) ? null : idNum);
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* الهيدر */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-700">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            الكلمات (Keywords)
            <span className="mx-1 h-3 w-px bg-slate-200" />
            <span className="text-slate-500">
              إجمالي الكلمات في السياق الحالي:{" "}
              <span className="font-semibold text-slate-900">
                {hasContext ? keywords.length : 0}
              </span>
            </span>
          </div>
          <p className="text-xs text-slate-500">
            الكلمات تظهر في الفلتر كنص نوع القطعة (مثال:{" "}
            <span className="font-mono text-[11px]">
              شمعة أمامية كامري 2006
            </span>
            ، اسطب خلفي، رديتر ماء…)، وهي اللي تخلي الفلتر فعلاً "ذكي".
          </p>
          {hasContext && (
            <p className="text-[11px] text-slate-400">
              السياق الحالي:{" "}
              <span className="font-semibold text-slate-800">
                {selectedBrand!.name_ar} / {selectedModel!.name_ar} /{" "}
                {selectedSection!.name_ar}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* اختيار الشركة + الموديل + القسم – Comboboxes */}
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
        <div className="grid gap-3 md:grid-cols-3">
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

          {/* السيارة */}
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

          {/* القسم */}
          <div>
            <label className="mb-1 block text-[11px] text-slate-500">
              القسم
            </label>

            <Popover
              open={sectionPopoverOpen}
              onOpenChange={setSectionPopoverOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  disabled={!selectedModelId}
                  className={cn(
                    "w-full justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-900",
                    (!selectedModelId || !selectedSectionId) &&
                      "text-slate-400"
                  )}
                >
                  {selectedSection
                    ? selectedSection.name_ar
                    : selectedModelId
                    ? "اختر قسم..."
                    : "اختر سيارة أولاً"}
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>

              <PopoverContent align="start" className="w-[240px] p-0">
                <Command dir="rtl">
                  <CommandInput
                    placeholder="بحث عن قسم..."
                    className="h-9 text-xs"
                  />
                  <CommandList>
                    <CommandEmpty className="text-[11px]">
                      لا يوجد قسم مطابق.
                    </CommandEmpty>
                    <CommandGroup>
                      {sections.map((s) => (
                        <CommandItem
                          key={s.id}
                          value={String(s.id)}
                          className="text-xs"
                          onSelect={(val) => {
                            if (val === String(selectedSectionId ?? "")) {
                              handleSelectSection("");
                            } else {
                              handleSelectSection(val);
                            }
                            setSectionPopoverOpen(false);
                          }}
                        >
                          {s.name_ar}
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              selectedSectionId === s.id
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
          لازم تختار الشركة + السيارة + القسم قبل ما تضيف كلمات، عشان كل كلمة
          تكون مربوطة بسياق واضح في الفلتر.
        </p>
      </div>

      {/* فورم الكلمة – كرت زجاجي */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/80 via-white/80 to-slate-100/70 p-[1px] shadow-[0_14px_45px_rgba(15,23,42,0.12)]">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -top-16 right-[-10%] h-32 w-32 rounded-full bg-[radial-gradient(circle_at_center,#22c55e_0,transparent_60%)] blur-2xl" />
          <div className="absolute -bottom-16 left-[-10%] h-32 w-32 rounded-full bg-[radial-gradient(circle_at_center,#0ea5e9_0,transparent_60%)] blur-2xl" />
        </div>

        <div className="relative rounded-2xl bg-white/80 p-3 backdrop-blur-xl sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-7 items-center rounded-full bg-slate-900/95 px-3 text-[11px] font-medium text-slate-50 shadow-sm">
                {isEdit ? "تعديل كلمة موجودة" : "إضافة كلمة جديدة"}
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

          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="mb-1 block text-[11px] text-slate-500">
                نص الكلمة
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10"
                value={form.name_ar || ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name_ar: e.target.value }))
                }
                placeholder='مثال: "شمعة أمامية كامري 2006"'
                disabled={!hasContext}
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
                disabled={!hasContext}
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="hidden text-[11px] text-slate-500 sm:block">
              حاول تخلي نص الكلمة واضح للعميل، مثلاً:{" "}
              <span className="font-mono text-[10px]">
                "رديتر ماء كامري 2006 أصلي"
              </span>
              ، عشان ما يتوه.
            </p>
            <button
              type="button"
              onClick={onSubmit}
              disabled={loading || !hasContext}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-slate-50 shadow-sm transition hover:bg-slate-800 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.35)]" />
              {isEdit ? "تحديث الكلمة" : "حفظ الكلمة"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-[11px] text-rose-700">
          خطأ: {error}
        </p>
      )}

      {/* جدول الكلمات */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60">
        <div className="max-h-[420px] overflow-auto">
          <table className="min-w-full text-xs">
            <thead className="sticky top-0 z-10 bg-slate-100/90 backdrop-blur">
              <tr>
                <th className="px-3 py-2 text-right font-medium text-slate-500">
                  #
                </th>
                <th className="px-3 py-2 text-right font-medium text-slate-500">
                  الكلمة
                </th>
                <th className="px-3 py-2 text-right font-medium text-slate-500">
                  الترتيب
                </th>
                <th className="px-3 py-2 text-right font-medium text-slate-500">
                  إجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/80">
              {(!hasContext || keywords.length === 0) && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-6 text-center text-[11px] text-slate-400"
                  >
                    لا توجد كلمات للسياق الحالي. اختر شركة، سيارة، وقسم ثم ابدأ
                    بإضافة كلمات.
                  </td>
                </tr>
              )}

              {hasContext &&
                keywords.map((k, index) => (
                  <tr
                    key={k.id}
                    className="transition hover:bg-slate-50/80"
                  >
                    <td className="px-3 py-2 text-[11px] text-slate-500">
                      {index + 1}
                    </td>
                    <td className="px-3 py-2 text-xs font-medium text-slate-900">
                      {k.name_ar}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-600">
                      {k.sort_order ?? (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[11px]">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEdit(k)}
                          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          تعديل
                        </button>
                       <DeleteConfirmButton
  onConfirm={() => onDelete(k)}
  title="حذف كلمة"
  description={`هل أنت متأكد أنك تريد حذف الكلمة "${k.name_ar}" من هذا السياق؟`}
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
