"use client";

import * as React from "react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type RawRow = {
  model: string;       // كورولا
  year: string;        // 2011-2013
  name_ar: string;     // الكلمة
  sort_order?: number | string | null;
};

type Props = {
  disabled?: boolean;
  onImported: () => Promise<void> | void;
};

export function YearKeywordsBulkImportDialogTo({ disabled, onImported }: Props) {
  const [open, setOpen] = React.useState(false);
  const [jsonText, setJsonText] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [parsingError, setParsingError] = React.useState<string | null>(null);
  const [importError, setImportError] = React.useState<string | null>(null);
  const [importSuccess, setImportSuccess] = React.useState<string | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [serverErrors, setServerErrors] = React.useState<Array<{ row: number; reason: string }>>([]);

  function resetState() {
    setJsonText("");
    setFile(null);
    setParsingError(null);
    setImportError(null);
    setImportSuccess(null);
    setServerErrors([]);
  }

  function handleDownloadTemplate() {
    const rows = [
      ["model", "year", "name_ar", "sort_order"],
      ["كورولا", "2011-2013", "باكم فرامل", 1],
      ["كورولا", "2011-2013", "بخاخ بنزين", 2],
      ["كورولا", "2011-2013", "مساعد", 3],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "year_keywords");

    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "year-keywords-by-model-year-template.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setParsingError(null);
    setImportError(null);
    setImportSuccess(null);
    setServerErrors([]);

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

      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (rawRows.length === 0) {
        setParsingError("الملف لا يحتوي على بيانات.");
        return;
      }

      const items: RawRow[] = rawRows.map((row, idx) => {
        const model = (row.model || row["model"] || "").toString().trim();
        const year = (row.year || row["year"] || row.year_range || row["year_range"] || "")
          .toString()
          .trim();
        const name_ar = (row.name_ar || row["name_ar"] || "").toString().trim();

        if (!model) throw new Error(`السطر رقم ${idx + 2} لا يحتوي على model.`);
        if (!year) throw new Error(`السطر رقم ${idx + 2} لا يحتوي على year / year_range.`);
        if (!name_ar) throw new Error(`السطر رقم ${idx + 2} لا يحتوي على name_ar.`);

        const sort_orderRaw =
          row.sort_order !== undefined && row.sort_order !== null
            ? String(row.sort_order).trim()
            : "";

        return {
          model,
          year,
          name_ar,
          sort_order: sort_orderRaw ? Number(sort_orderRaw) : null,
        };
      });

      setJsonText(JSON.stringify(items, null, 2));
      setParsingError(null);
    } catch (err: any) {
      console.error("parse excel error:", err);
      setParsingError(err?.message || "تعذّر قراءة ملف Excel، تأكد من استخدام القالب.");
    }
  }

  function parseJsonInput(): RawRow[] {
    setParsingError(null);

    if (!jsonText.trim()) {
      throw new Error("الرجاء إدخال بيانات JSON أو اختيار ملف.");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      throw new Error("صيغة JSON غير صحيحة، تحقق من الفاصلات والأقواس.");
    }

    if (!Array.isArray(parsed)) {
      throw new Error("توقّعنا مصفوفة JSON: [ { ... }, { ... } ]");
    }

    const items: RawRow[] = parsed.map((row: any, idx: number) => {
      const model = String(row.model || "").trim();
      const year = String(row.year || row.year_range || "").trim();
      const name_ar = String(row.name_ar || "").trim();

      if (!model) throw new Error(`العنصر رقم ${idx + 1} لا يحتوي على model.`);
      if (!year) throw new Error(`العنصر رقم ${idx + 1} لا يحتوي على year/year_range.`);
      if (!name_ar) throw new Error(`العنصر رقم ${idx + 1} لا يحتوي على name_ar.`);

      return {
        model,
        year,
        name_ar,
        sort_order:
          row.sort_order !== undefined && row.sort_order !== null ? Number(row.sort_order) : null,
      };
    });

    return items;
  }

  async function handleImport() {
    setImportError(null);
    setImportSuccess(null);
    setParsingError(null);
    setServerErrors([]);
    setIsImporting(true);

    try {
      const items = parseJsonInput();
      if (!items.length) throw new Error("لا توجد عناصر بعد التحليل.");

      const res = await fetch("/api/dashboard/year-keywords/bulk-by-model-year", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        throw new Error(data?.error || "فشل الاستيراد");
      }

      const successCount = data?.successCount ?? 0;
      const failCount = data?.failCount ?? 0;
      const errors = Array.isArray(data?.errors) ? data.errors : [];

      setServerErrors(errors);

      setImportSuccess(
        `تم استيراد ${successCount} كلمة بنجاح، وفشل ${failCount}.` +
          (errors.length ? ` (اعرضت لك أول ${errors.length} أخطاء)` : ""),
      );

      await onImported();
    } catch (err: any) {
      setParsingError(err?.message || "خطأ أثناء تحليل/استيراد البيانات.");
    } finally {
      setIsImporting(false);
    }
  }

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
         
        >
          استيراد كلمات بتنسيق 3 عمود  (Excel)
        </Button>
      </DialogTrigger>

      <DialogContent dir="rtl" className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-right text-sm">
            استيراد كلمات السنة عبر Excel (model + year + keyword)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-[11px] text-slate-700">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-800">
            قالب Excel يحتوي على الأعمدة:
            <span className="font-mono"> model, year, name_ar, sort_order</span>
            <div className="mt-1 text-[10px]">
              * النظام سيبحث تلقائياً عن (الموديل + السنة) ويجيب <span className="font-mono">year_id</span> ثم يحفظ في{" "}
              <span className="font-mono">filter_year_keywords</span>.
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-right text-[11px] font-medium">
              ملف Excel (.xlsx)
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
              افتح القالب، أضف كل كلمة في سطر مع موديلها وسنتها، ثم احفظ وارفع.
            </p>
          </div>

          <div className="space-y-1">
            <label className="block text-right text-[11px] font-medium">
              JSON (اختياري)
            </label>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={8}
              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-mono focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder='[{"model":"كورولا","year":"2011-2013","name_ar":"مكينة","sort_order":1}]'
            />
          </div>

          {parsingError && (
            <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[11px] text-red-600">
              {parsingError}
            </p>
          )}

          {importError && (
            <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[11px] text-red-600">
              {importError}
            </p>
          )}

          {importSuccess && (
            <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
              {importSuccess}
            </p>
          )}

          {serverErrors.length ? (
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="mb-2 text-[11px] font-medium">أخطاء (أول {serverErrors.length}):</div>
              <div className="max-h-40 overflow-auto text-[10px] text-slate-700">
                {serverErrors.map((e, i) => (
                  <div key={i} className="border-b border-slate-100 py-1">
                    <span className="font-mono">Row {e.row}:</span> {e.reason}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

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
              disabled={isImporting}
            >
              {isImporting ? "جاري الاستيراد..." : "بدء الاستيراد"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}