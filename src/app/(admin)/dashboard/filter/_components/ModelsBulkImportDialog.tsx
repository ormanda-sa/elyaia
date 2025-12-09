// src/app/(admin)/dashboard/filter/_components/ModelsBulkImportDialog.tsx
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Brand } from "./BrandsTab";
import * as XLSX from "xlsx";

type ModelsBulkImportDialogProps = {
  selectedBrand: Brand | null;
  onImported: () => Promise<void> | void;
};

type RawModelItem = {
  name_ar: string;
  slug?: string | null;
  salla_category_id?: string | null;
  sort_order?: number | string | null;
};

export function ModelsBulkImportDialog({
  selectedBrand,
  onImported,
}: ModelsBulkImportDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [jsonText, setJsonText] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [parsingError, setParsingError] = React.useState<string | null>(null);
  const [importError, setImportError] = React.useState<string | null>(null);
  const [importSuccess, setImportSuccess] = React.useState<string | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);

  const brandId = selectedBrand?.id ?? null;

  function resetState() {
    setJsonText("");
    setFile(null);
    setParsingError(null);
    setImportError(null);
    setImportSuccess(null);
  }

  // ================== تنزيل قالب EXCEL بدل CSV ==================
  function handleDownloadTemplate() {
    // جدول مرتب: أول صف عناوين
    const rows = [
      ["name_ar", "slug", "salla_category_id", "sort_order"],
      ["كامري", "camry", "1499123062", 1],
      ["يارس", "yaris", "1499123063", 2],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "models");

    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "models-template.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ================== قراءة ملف EXCEL وتحويله إلى JSON ==================
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setParsingError(null);
    setImportError(null);
    setImportSuccess(null);

    const f = e.target.files?.[0];
    if (!f) {
      setFile(null);
      return;
    }
    setFile(f);

    try {
      const arrayBuffer = await f.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // نحول الورقة إلى JSON، كل صف = object
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
      });

      if (rawRows.length === 0) {
        setParsingError("الملف لا يحتوي على بيانات.");
        return;
      }

      const items: RawModelItem[] = rawRows.map((row, idx) => {
        const name_ar = (row.name_ar || row["name_ar"] || "").toString().trim();
        if (!name_ar) {
          throw new Error(
            `السطر رقم ${idx + 2} لا يحتوي على name_ar (اسم الموديل).`,
          );
        }

        const slug =
          row.slug !== undefined && row.slug !== null
            ? String(row.slug).trim()
            : "";
        const salla_category_id =
          row.salla_category_id !== undefined && row.salla_category_id !== null
            ? String(row.salla_category_id).trim()
            : "";
        const sort_orderRaw =
          row.sort_order !== undefined && row.sort_order !== null
            ? String(row.sort_order).trim()
            : "";

        return {
          name_ar,
          slug: slug || null,
          salla_category_id: salla_category_id || null,
          sort_order: sort_orderRaw ? Number(sort_orderRaw) : null,
        };
      });

      setJsonText(JSON.stringify(items, null, 2));
      setParsingError(null);
    } catch (err: any) {
      console.error("parse excel error:", err);
      setParsingError(
        err?.message || "تعذّر قراءة ملف Excel، تأكد من استخدام القالب.",
      );
    }
  }

  // ================== تحليل JSON المكتوب يدويًا ==================
  function parseJsonInput(): RawModelItem[] {
    setParsingError(null);

    if (!jsonText.trim()) {
      throw new Error("الرجاء إدخال بيانات JSON أو اختيار ملف.");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      throw new Error("صيغة JSON غير صحيحة، تحقق من الفاصلات والأقواس.");
    }

    if (!Array.isArray(parsed)) {
      throw new Error(
        "توقّعنا مصفوفة JSON من العناصر، مثال: [ { ... }, { ... } ].",
      );
    }

    const items: RawModelItem[] = parsed.map((row: any, idx: number) => {
      const name_ar = (row.name_ar || row.name || "").toString().trim();
      if (!name_ar) {
        throw new Error(`العنصر رقم ${idx + 1} لا يحتوي على name_ar.`);
      }
      return {
        name_ar,
        slug: row.slug ? String(row.slug).trim() : null,
        salla_category_id: row.salla_category_id
          ? String(row.salla_category_id).trim()
          : null,
        sort_order:
          row.sort_order !== undefined && row.sort_order !== null
            ? Number(row.sort_order)
            : null,
      };
    });

    return items;
  }

  // ================== إرسال البيانات إلى API ==================
  async function handleImport() {
    if (!brandId) {
      setImportError("اختر شركة أولاً قبل الاستيراد.");
      return;
    }

    setImportError(null);
    setImportSuccess(null);
    setParsingError(null);
    setIsImporting(true);

    try {
      const items = parseJsonInput();

      if (!items.length) {
        throw new Error("لا توجد عناصر بعد التحليل، تأكد من JSON أو الملف.");
      }

      let successCount = 0;
      let failCount = 0;

      for (const item of items) {
        const payload = {
          brand_id: brandId,
          name_ar: item.name_ar,
          slug: item.slug || null,
          salla_category_id: item.salla_category_id || null,
          sort_order:
            item.sort_order !== undefined && item.sort_order !== null
              ? Number(item.sort_order)
              : null,
        };

        try {
          const res = await fetch("/api/dashboard/models", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            failCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error("import model error:", err);
          failCount++;
        }
      }

      if (successCount === 0) {
        setImportError(
          "تعذّر حفظ أي موديل، تحقق من البيانات أو راجع السجل.",
        );
      } else {
        setImportSuccess(
          `تم استيراد ${successCount} موديل بنجاح، وفشل ${failCount} (إن وجد).`,
        );
        await onImported();
      }
    } catch (err: any) {
      setParsingError(err.message || "خطأ أثناء تحليل البيانات.");
    } finally {
      setIsImporting(false);
    }
  }

  const disabled = !selectedBrand;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetState();
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          className="rounded-full"
          variant="outline"
          disabled={disabled}
        >
          استيراد موديلات (JSON / Excel)
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-right text-sm">
            استيراد موديلات جماعياً
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-[11px] text-slate-700">
          <p className="text-right text-[11px]">
            الشركة الحالية:{" "}
            <span className="font-semibold">
              {selectedBrand?.name_ar || "لم يتم اختيار شركة"}
            </span>
          </p>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-800">
            يمكنك تحميل قالب Excel وتعبئته، أو لصق بيانات JSON مباشرة. الأعمدة
            المتوقعة:
            <span className="font-mono">
              {" "}
              name_ar, slug, salla_category_id, sort_order
            </span>
            .
          </div>

          <div className="space-y-1">
            <label className="block text-right text-[11px] font-medium">
              ملف Excel (.xlsx) (اختياري)
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="h-8 text-[11px]"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full text-[11px]"
                onClick={handleDownloadTemplate}
              >
                تحميل قالب Excel
              </Button>
            </div>
            <p className="text-[10px] text-slate-500">
              افتح القالب في Excel، عدّل/أضف الموديلات، ثم احفظ نفس الملف وارفعه
              هنا.
            </p>
          </div>

          <div className="space-y-1">
            <label className="block text-right text-[11px] font-medium">
              بيانات JSON
            </label>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={10}
              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-mono focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder='[{"name_ar": "موديل 1", "slug": "model-1"}]'
            />
          </div>

          {parsingError && (
            <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {parsingError}
            </p>
          )}

          {importError && (
            <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {importError}
            </p>
          )}

          {importSuccess && (
            <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
              {importSuccess}
            </p>
          )}

          <div className="flex justify-between gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={resetState}
              disabled={isImporting}
            >
              مسح الحقول
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-full"
              onClick={handleImport}
              disabled={isImporting || !brandId}
            >
              {isImporting ? "جاري الاستيراد..." : "بدء الاستيراد"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
