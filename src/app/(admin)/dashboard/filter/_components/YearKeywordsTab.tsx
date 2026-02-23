"use client";

import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import type { Brand } from "./BrandsTab";
import type { Model } from "./ModelsTab";
import { DeleteConfirmButton } from "./DeleteConfirmButton";
import { YearKeywordsBulkImportDialog } from "./YearKeywordsBulkImportDialog";
import { YearKeywordsBulkImportDialogTo } from "./YearKeywordsBulkImportDialogTo";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type Year = {
  id: number;
  store_id: string;
  model_id: number;
  year: string;
  sort_order: number | null;
  slug: string | null;
};

export type YearKeyword = {
  id: number;
  store_id: string;
  year_id: number;
  name_ar: string;
  slug: string | null;
  sort_order: number | null;
};

export type YearKeywordFormState = {
  mode: "add" | "edit";
  id?: number | null;
  name_ar?: string;
  sort_order?: number | null;
};

type Props = {
  brands: Brand[];
  models: Model[];
  years: Year[];

  selectedBrandId: number | null;
  setSelectedBrandId: Dispatch<SetStateAction<number | null>>;

  selectedModelId: number | null;
  setSelectedModelId: Dispatch<SetStateAction<number | null>>;

  selectedYearId: number | null;
  setSelectedYearId: Dispatch<SetStateAction<number | null>>;

  yearKeywords: YearKeyword[];
  form: YearKeywordFormState;
  setForm: Dispatch<SetStateAction<YearKeywordFormState>>;

  loading: boolean;
  error: string | null;

  onSubmit: () => Promise<void> | void;
  onEdit: (k: YearKeyword) => void;
  onDelete: (k: YearKeyword) => Promise<void> | void;

  onImported?: () => Promise<void> | void;
};

export function YearKeywordsTab({
  brands,
  models,
  years,
  selectedBrandId,
  setSelectedBrandId,
  selectedModelId,
  setSelectedModelId,
  selectedYearId,
  setSelectedYearId,
  yearKeywords,
  form,
  setForm,
  loading,
  error,
  onSubmit,
  onEdit,
  onDelete,
  onImported,
}: Props) {
  const [brandPopoverOpen, setBrandPopoverOpen] = useState(false);
  const [modelPopoverOpen, setModelPopoverOpen] = useState(false);
  const [yearPopoverOpen, setYearPopoverOpen] = useState(false);

  const selectedBrand = brands.find((b) => b.id === selectedBrandId) || null;

  const filteredModels = useMemo(() => {
    return selectedBrandId ? models.filter((m) => m.brand_id === selectedBrandId) : [];
  }, [models, selectedBrandId]);

  const selectedModel = filteredModels.find((m) => m.id === selectedModelId) || null;

  const filteredYears = useMemo(() => {
    return selectedModelId ? years.filter((y) => y.model_id === selectedModelId) : [];
  }, [years, selectedModelId]);

  const selectedYear = filteredYears.find((y) => y.id === selectedYearId) || null;

  const hasContext = !!(selectedBrand && selectedModel && selectedYear);
  const isEdit = form.mode === "edit";

  const yearId = selectedYear?.id ?? null;
  const yearLabel = selectedYear
    ? `${selectedBrand?.name_ar ?? ""} / ${selectedModel?.name_ar ?? ""} / ${selectedYear.year}`
    : null;

  const handleSelectBrand = (value: string) => {
    if (!value) {
      setSelectedBrandId(null);
      setSelectedModelId(null);
      setSelectedYearId(null);
      return;
    }
    const idNum = Number(value);
    if (Number.isNaN(idNum)) {
      setSelectedBrandId(null);
      setSelectedModelId(null);
      setSelectedYearId(null);
      return;
    }
    setSelectedBrandId(idNum);
    setSelectedModelId(null);
    setSelectedYearId(null);
  };

  const handleSelectModel = (value: string) => {
    if (!value) {
      setSelectedModelId(null);
      setSelectedYearId(null);
      return;
    }
    const idNum = Number(value);
    setSelectedModelId(Number.isNaN(idNum) ? null : idNum);
    setSelectedYearId(null);
  };

  const handleSelectYear = (value: string) => {
    if (!value) {
      setSelectedYearId(null);
      return;
    }
    const idNum = Number(value);
    setSelectedYearId(Number.isNaN(idNum) ? null : idNum);
  };

  // ===============================
  // ✅ تحديد متعدد + حذف جماعي (كما هو)
  // ===============================
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    setSelectedIds(new Set());
    setBulkDeleteError(null);
    setBulkDeleting(false);
  }, [selectedBrandId, selectedModelId, selectedYearId]);

  const selectedCount = selectedIds.size;

  const selectedPreview = useMemo(() => {
    if (!selectedCount) return [];
    const mapById = new Map(yearKeywords.map((k) => [k.id, k]));
    return Array.from(selectedIds)
      .map((id) => mapById.get(id))
      .filter(Boolean)
      .slice(0, 8) as YearKeyword[];
  }, [selectedIds, selectedCount, yearKeywords]);

  async function handleBulkDelete() {
    if (!hasContext || selectedIds.size === 0) return;

    setBulkDeleteError(null);
    setBulkDeleting(true);

    try {
      const ids = Array.from(selectedIds);

      const res = await fetch("/api/dashboard/year-keywords/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        throw new Error(data?.error || "فشل حذف المحدد");
      }

      setSelectedIds(new Set());
      if (onImported) await onImported();
    } catch (e: any) {
      setBulkDeleteError(e?.message || "حدث خطأ أثناء حذف المحدد");
    } finally {
      setBulkDeleting(false);
    }
  }

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ===============================
  // ✅ ترتيب بالسحب (Drag & Drop)
  // ===============================

  // نرتب القائمة بدايةً حسب sort_order ثم الاسم (عشان تكون ثابتة)
  const initialSorted = useMemo(() => {
    const arr = [...yearKeywords];
    arr.sort((a, b) => {
      const ao = a.sort_order ?? 999999;
      const bo = b.sort_order ?? 999999;
      if (ao !== bo) return ao - bo;
      return String(a.name_ar || "").localeCompare(String(b.name_ar || ""), "ar");
    });
    return arr;
  }, [yearKeywords]);

  // قائمة العرض/السحب المحلية
  const [localKeywords, setLocalKeywords] = useState<YearKeyword[]>(initialSorted);

  // إذا تغيّرت البيانات من الأب (إضافة/استيراد/تغيير سنة) نرجّع ترتيبنا من جديد
  useEffect(() => {
    setLocalKeywords(initialSorted);
  }, [initialSorted, selectedYearId]);

  // drag state
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [reorderSaving, setReorderSaving] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);

  function moveItem(arr: YearKeyword[], fromIndex: number, toIndex: number) {
    const next = [...arr];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    return next;
  }

  async function saveReorder(nextList: YearKeyword[]) {
    // يحفظ sort_order تسلسلي 1..N في DB
    setReorderError(null);
    setReorderSaving(true);
    try {
      const orderedIds = nextList.map((k) => k.id);

      const res = await fetch("/api/dashboard/year-keywords/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year_id: yearId, ordered_ids: orderedIds }),
      });

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(data?.error || "فشل حفظ الترتيب");

      // بعد الحفظ: نطلب من الأب يعيد تحميل الكلمات
      if (onImported) await onImported();
    } catch (e: any) {
      setReorderError(e?.message || "حدث خطأ أثناء حفظ ترتيب الصفوف");
    } finally {
      setReorderSaving(false);
    }
  }

  function onDragStartRow(id: number) {
    setDraggingId(id);
  }

  function onDragOverRow(e: React.DragEvent<HTMLTableRowElement>) {
    // لازم تمنع الافتراضي حتى يسمح بالـ drop
    e.preventDefault();
  }

  async function onDropRow(targetId: number) {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }

    const fromIndex = localKeywords.findIndex((k) => k.id === draggingId);
    const toIndex = localKeywords.findIndex((k) => k.id === targetId);
    if (fromIndex < 0 || toIndex < 0) {
      setDraggingId(null);
      return;
    }

    const moved = moveItem(localKeywords, fromIndex, toIndex);

    // ✅ تحديث متسلسل فوراً للعرض (1..N)
    const reNumbered = moved.map((k, idx) => ({
      ...k,
      sort_order: idx + 1,
    }));

    setLocalKeywords(reNumbered);
    setDraggingId(null);

    // ✅ حفظ تلقائي بعد الإفلات
    await saveReorder(reNumbered);
  }

  const isAllSelected =
    hasContext && localKeywords.length > 0 && selectedCount === localKeywords.length;
  const isSomeSelected = selectedCount > 0 && !isAllSelected;

  const toggleAll = () => {
    if (!hasContext || localKeywords.length === 0) return;
    setSelectedIds((prev) => {
      if (prev.size === localKeywords.length) return new Set();
      return new Set(localKeywords.map((k) => k.id));
    });
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* الهيدر */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-700">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            كلمات السنة (Year Keywords)
            <span className="mx-1 h-3 w-px bg-slate-200" />
            <span className="text-slate-500">
              إجمالي الكلمات في السياق الحالي:{" "}
              <span className="font-semibold text-slate-900">
                {hasContext ? localKeywords.length : 0}
              </span>
            </span>
          </div>

          <p className="text-xs text-slate-500">
            هذه الكلمات تُحفظ في جدول{" "}
            <span className="font-mono text-[11px]">filter_year_keywords</span>{" "}
            وتكون مربوطة بـ (الشركة + السيارة + السنة).
          </p>

          {hasContext && (
            <p className="text-[11px] text-slate-400">
              السياق الحالي:{" "}
              <span className="font-semibold text-slate-800">
                {selectedBrand!.name_ar} / {selectedModel!.name_ar} / {selectedYear!.year}
              </span>
            </p>
          )}

          {reorderSaving && (
            <p className="text-[11px] text-slate-500">جاري حفظ ترتيب الصفوف...</p>
          )}
          {reorderError && (
            <p className="text-[11px] text-rose-600">خطأ ترتيب الصفوف: {reorderError}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <YearKeywordsBulkImportDialog
            yearId={yearId}
            yearLabel={yearLabel}
            disabled={!hasContext}
            onImported={async () => {
              if (onImported) await onImported();
            }}
          />
        </div> <div className="flex items-center gap-2">
          <YearKeywordsBulkImportDialogTo
            
          
            disabled={!hasContext}
            onImported={async () => {
              if (onImported) await onImported();
            }}
          />
        </div>
      </div>

      {/* اختيار الشركة + الموديل + السنة */}
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
        <div className="grid gap-3 md:grid-cols-3">
          {/* الشركة */}
          <div>
            <label className="mb-1 block text-[11px] text-slate-500">الشركة</label>

            <Popover open={brandPopoverOpen} onOpenChange={setBrandPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "w-full justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-900",
                    !selectedBrandId && "text-slate-400",
                  )}
                >
                  {selectedBrand ? selectedBrand.name_ar : "اختر شركة..."}
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>

              <PopoverContent align="start" className="w-[240px] p-0">
                <Command dir="rtl">
                  <CommandInput placeholder="بحث عن شركة..." className="h-9 text-xs" />
                  <CommandList>
                    <CommandEmpty className="text-[11px]">لا توجد شركة مطابقة.</CommandEmpty>
                    <CommandGroup>
                      {brands.map((b) => (
                        <CommandItem
                          key={b.id}
                          value={String(b.id)}
                          className="text-xs"
                          onSelect={(val) => {
                            if (val === String(selectedBrandId ?? "")) handleSelectBrand("");
                            else handleSelectBrand(val);
                            setBrandPopoverOpen(false);
                          }}
                        >
                          {b.name_ar}
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              selectedBrandId === b.id ? "opacity-100" : "opacity-0",
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
            <label className="mb-1 block text-[11px] text-slate-500">السيارة</label>

            <Popover open={modelPopoverOpen} onOpenChange={setModelPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  disabled={!selectedBrandId}
                  className={cn(
                    "w-full justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-900",
                    (!selectedBrandId || !selectedModelId) && "text-slate-400",
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
                  <CommandInput placeholder="بحث عن موديل..." className="h-9 text-xs" />
                  <CommandList>
                    <CommandEmpty className="text-[11px]">لا يوجد موديل مطابق.</CommandEmpty>
                    <CommandGroup>
                      {filteredModels.map((m) => (
                        <CommandItem
                          key={m.id}
                          value={String(m.id)}
                          className="text-xs"
                          onSelect={(val) => {
                            if (val === String(selectedModelId ?? "")) handleSelectModel("");
                            else handleSelectModel(val);
                            setModelPopoverOpen(false);
                          }}
                        >
                          {m.name_ar}
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              selectedModelId === m.id ? "opacity-100" : "opacity-0",
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

          {/* السنة */}
          <div>
            <label className="mb-1 block text-[11px] text-slate-500">السنة</label>

            <Popover open={yearPopoverOpen} onOpenChange={setYearPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  disabled={!selectedModelId}
                  className={cn(
                    "w-full justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-900",
                    (!selectedModelId || !selectedYearId) && "text-slate-400",
                  )}
                >
                  {selectedYear ? selectedYear.year : selectedModelId ? "اختر سنة..." : "اختر سيارة أولاً"}
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>

              <PopoverContent align="start" className="w-[240px] p-0">
                <Command dir="rtl">
                  <CommandInput placeholder="بحث عن سنة..." className="h-9 text-xs" />
                  <CommandList>
                    <CommandEmpty className="text-[11px]">لا توجد سنة مطابقة.</CommandEmpty>
                    <CommandGroup>
                      {filteredYears.map((y) => (
                        <CommandItem
                          key={y.id}
                          value={String(y.id)}
                          className="text-xs"
                          onSelect={(val) => {
                            if (val === String(selectedYearId ?? "")) handleSelectYear("");
                            else handleSelectYear(val);
                            setYearPopoverOpen(false);
                          }}
                        >
                          {y.year}
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              selectedYearId === y.id ? "opacity-100" : "opacity-0",
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
          لازم تختار الشركة + السيارة + السنة قبل ما تضيف كلمات، عشان كل كلمة تكون مربوطة بسياق واضح.
        </p>
      </div>

      {/* فورم الكلمة */}
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
                  <span className="font-semibold text-slate-800">{form.name_ar}</span>
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
              <label className="mb-1 block text-[11px] text-slate-500">نص الكلمة</label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10"
                value={form.name_ar || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, name_ar: e.target.value }))}
                placeholder='مثال: "مكينة" / "قير" / "رديتر"...'
                disabled={!hasContext}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-slate-500">الترتيب</label>
              <input
                type="number"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10"
                value={form.sort_order ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    sort_order: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                placeholder="1"
                disabled={!hasContext}
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="hidden text-[11px] text-slate-500 sm:block">
              هذه الكلمات تُحفظ في{" "}
              <span className="font-mono text-[10px]">filter_year_keywords</span>.
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

      {bulkDeleteError && (
        <p className="rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-[11px] text-rose-700">
          خطأ حذف المحدد: {bulkDeleteError}
        </p>
      )}

      {/* جدول الكلمات */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60">
        {/* شريط حذف المحدد */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white/70 px-3 py-2">
          <div className="text-[11px] text-slate-500">
            {selectedCount > 0 ? (
              <>
                تم تحديد{" "}
                <span className="font-semibold text-slate-900">{selectedCount}</span>{" "}
                عنصر
              </>
            ) : (
              <>اسحب الصفوف لترتيبها + أو اختر عناصر للحذف الجماعي</>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                onClick={() => setSelectedIds(new Set())}
                disabled={bulkDeleting}
              >
                إلغاء التحديد
              </button>
            )}

            <DeleteConfirmButton
              onConfirm={handleBulkDelete}
              title="حذف المحدد"
              description={
                `هل أنت متأكد أنك تريد حذف ${selectedCount} كلمة محددة؟` +
                (selectedPreview.length
                  ? `\n\nأمثلة من المحدد:\n- ${selectedPreview.map((k) => k.name_ar).join("\n- ")}`
                  : "")
              }
            >
              {bulkDeleting ? `جاري الحذف... (${selectedCount})` : `حذف المحدد (${selectedCount})`}
            </DeleteConfirmButton>
          </div>
        </div>

        <div className="max-h-[420px] overflow-auto">
          <table className="min-w-full text-xs">
            <thead className="sticky top-0 z-10 bg-slate-100/90 backdrop-blur">
              <tr>
                <th className="px-3 py-2 text-right font-medium text-slate-500">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeSelected;
                    }}
                    onChange={toggleAll}
                    disabled={!hasContext || localKeywords.length === 0 || bulkDeleting}
                    className="h-4 w-4 accent-slate-900"
                    title="تحديد الكل"
                  />
                </th>
                <th className="px-3 py-2 text-right font-medium text-slate-500">#</th>
                <th className="px-3 py-2 text-right font-medium text-slate-500">الكلمة</th>
                <th className="px-3 py-2 text-right font-medium text-slate-500">الترتيب</th>
                <th className="px-3 py-2 text-right font-medium text-slate-500">إجراءات</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white/80">
              {(!hasContext || localKeywords.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-[11px] text-slate-400">
                    لا توجد كلمات للسياق الحالي. اختر شركة، سيارة، وسنة ثم ابدأ بإضافة كلمات.
                  </td>
                </tr>
              )}

              {hasContext &&
                localKeywords.map((k, index) => {
                  const checked = selectedIds.has(k.id);
                  const isDragging = draggingId === k.id;

                  return (
                    <tr
                      key={k.id}
                      draggable={!bulkDeleting && !reorderSaving}
                      onDragStart={() => onDragStartRow(k.id)}
                      onDragOver={onDragOverRow}
                      onDrop={() => onDropRow(k.id)}
                      className={cn(
                        "transition hover:bg-slate-50/80",
                        isDragging && "opacity-60",
                      )}
                      title="اسحب لترتيب الصف"
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOne(k.id)}
                          disabled={bulkDeleting}
                          className="h-4 w-4 accent-slate-900"
                        />
                      </td>

                      {/* # (عرض فقط) */}
                      <td className="px-3 py-2 text-[11px] text-slate-500">{index + 1}</td>

                      <td className="px-3 py-2 text-xs font-medium text-slate-900">
                        <span className="cursor-move select-none">≡</span>{" "}
                        {k.name_ar}
                      </td>

                      {/* sort_order: متسلسل 1..N */}
                      <td className="px-3 py-2 text-[11px] text-slate-600">
                        {index + 1}
                      </td>

                      <td className="px-3 py-2 text-[11px]">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEdit(k)}
                            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                            disabled={bulkDeleting || reorderSaving}
                          >
                            تعديل
                          </button>

                          <DeleteConfirmButton
                            onConfirm={async () => {
                              await onDelete(k);
                              setSelectedIds((prev) => {
                                const next = new Set(prev);
                                next.delete(k.id);
                                return next;
                              });
                            }}
                            title="حذف كلمة"
                            description={`هل أنت متأكد أنك تريد حذف الكلمة "${k.name_ar}" من هذا السياق؟`}
                          >
                            حذف
                          </DeleteConfirmButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}