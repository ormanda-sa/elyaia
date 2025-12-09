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
import type { Model } from "./ModelsTab";
import type { Section } from "./SectionsTab";
import * as XLSX from "xlsx";

type KeywordsBulkImportDialogProps = {
  selectedBrand: Brand | null;
  selectedModel: Model | null;
  selectedSection: Section | null;
  onImported: () => Promise<void> | void;
};

type RawKeywordItem = {
  name_ar: string;
  sort_order?: number | string | null;
};

export function KeywordsBulkImportDialog({
  selectedBrand,
  selectedModel,
  selectedSection,
  onImported,
}: KeywordsBulkImportDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [jsonText, setJsonText] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [parsingError, setParsingError] = React.useState<string | null>(null);
  const [importError, setImportError] = React.useState<string | null>(null);
  const [importSuccess, setImportSuccess] = React.useState<string | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);

  const modelId = selectedModel?.id ?? null;
  const sectionId = selectedSection?.id ?? null;

  function resetState() {
    setJsonText("");
    setFile(null);
    setParsingError(null);
    setImportError(null);
    setImportSuccess(null);
  }

  // تحميل قالب Excel للكلمات
  function handleDownloadTemplate() {
    // أعمدة: name_ar, sort_order
    const rows = [
      ["name_ar", "sort_order"],
      ["طقم فحمات أمامية كامري 2006", 1],
      ["رديتر ماء كامري 2006", 2],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "keywords");

    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "keywords-template.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // قراءة ملف Excel وتحويله إلى JSON
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

      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
      });

      if (rawRows.length === 0) {
        setParsingError("الملف لا يحتوي على بيانات.");
        return;
      }

      const items: RawKeywordItem[] = rawRows.map((row, idx) => {
        const name_ar = (row.name_ar || row["name_ar"] || "")
          .toString()
          .trim();
        if (!name_ar) {
          throw new Error(
            `السطر رقم ${idx + 2} لا يحتوي على name_ar (نص الكلمة).`,
          );
        }

        const sort_orderRaw =
          row.sort_order !== undefined && row.sort_order !== null
            ? String(row.sort_order).trim()
            : "";

        return {
          name_ar,
          sort_order: sort_orderRaw ? Number(sort_orderRaw) : null,
        };
      });

      setJsonText(JSON.stringify(items, null, 2));
      setParsingError(null);
    } catch (err: any) {
      console.error("parse keywords excel error:", err);
      setParsingError(
        err?.message || "تعذّر قراءة ملف Excel، تأكد من استخدام القالب.",
      );
    }
  }

  // تحليل JSON اليدوي
  function parseJsonInput(): RawKeywordItem[] {
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

    const items: RawKeywordItem[] = parsed.map((row: any, idx: number) => {
      const name_ar = (row.name_ar || "").toString().trim();
      if (!name_ar) {
        throw new Error(`العنصر رقم ${idx + 1} لا يحتوي على name_ar.`);
      }
      return {
        name_ar,
        sort_order:
          row.sort_order !== undefined && row.sort_order !== null
            ? Number(row.sort_order)
            : null,
      };
    });

    return items;
  }

  // إرسال البيانات إلى API
  async function handleImport() {
    if (!modelId || !sectionId) {
      setImportError("اختر الشركة والموديل والقسم أولاً قبل الاستيراد.");
      return;
    }

    setImportError(null);
    setImportSuccess(null);
    setParsingError(null);
    setIsImporting(true);

    try {
      const items = parseJsonInput();

      if (!items.length) {
        throw new Error("لا توجد عناصر بعد التحليل، تأكد من الملف أو JSON.");
      }

      let successCount = 0;
      let failCount = 0;

      for (const item of items) {
        const payload = {
          model_id: modelId,
          section_id: sectionId,
          name_ar: item.name_ar,
          sort_order:
            item.sort_order !== undefined && item.sort_order !== null
              ? Number(item.sort_order)
              : null,
        };

        try {
          const res = await fetch("/api/dashboard/keywords", {
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
          console.error("import keyword error:", err);
          failCount++;
        }
      }

      if (successCount === 0) {
        setImportError(
          "تعذّر حفظ أي كلمة، تحقق من البيانات أو راجع السجل.",
        );
      } else {
        setImportSuccess(
          `تم استيراد ${successCount} كلمة بنجاح، وفشل ${failCount} (إن وجد).`,
        );
        await onImported();
      }
    } catch (err: any) {
      setParsingError(err.message || "خطأ أثناء تحليل البيانات.");
    } finally {
      setIsImporting(false);
    }
  }

  const disabled = !selectedBrand || !selectedModel || !selectedSection;

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
          استيراد كلمات (JSON / Excel)
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-right text-sm">
            استيراد كلمات للموديل والقسم
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-[11px] text-slate-700">
          <p className="text-right text-[11px]">
            الشركة:{" "}
            <span className="font-semibold">
              {selectedBrand?.name_ar || "غير محددة"}
            </span>{" "}
            — الموديل:{" "}
            <span className="font-semibold">
              {selectedModel?.name_ar || "غير محدد"}
            </span>{" "}
            — القسم:{" "}
            <span className="font-semibold">
              {selectedSection?.name_ar || "غير محدد"}
            </span>
          </p>

          {!modelId || !sectionId ? (
            <p className="rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2 text-[11px] text-yellow-800">
              اختر الشركة + الموديل + القسم من أعلى تبويب الكلمات قبل الاستيراد.
            </p>
          ) : null}

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-800">
            قالب Excel يحتوي على الأعمدة:
            <span className="font-mono"> name_ar, sort_order</span>. مثال:
            <pre className="mt-1 overflow-x-auto rounded-md bg-white px-2 py-1 text-[10px] text-slate-800">
{`[
  {
    "name_ar": "طقم فحمات أمامية كامري 2006",
    "sort_order": 1
  }
]`}
            </pre>
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
              افتح القالب في Excel، أضف كل كلمة في سطر مع ترتيبها، ثم احفظ وارفع
              نفس الملف هنا.
            </p>
          </div>

          <div className="space-y-1">
            <label className="block text-right text-[11px] font-medium">
              بيانات JSON (اختياري)
            </label>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={8}
              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-mono focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder='[{"name_ar": "طقم فحمات أمامية كامري 2006", "sort_order": 1}]'
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
              disabled={isImporting || !modelId || !sectionId}
            >
              {isImporting ? "جاري الاستيراد..." : "بدء الاستيراد"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
