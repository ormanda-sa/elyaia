"use client";

import { useCallback, useEffect, useState } from "react";
import type { YearKeyword, YearKeywordFormState } from "./YearKeywordsTab";

type Args = {
  storeId: string | null;
  yearId: number | null;
};

export function useYearKeywords({ storeId, yearId }: Args) {
  const [yearKeywords, setYearKeywords] = useState<YearKeyword[]>([]);
  const [form, setForm] = useState<YearKeywordFormState>({ mode: "add" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!storeId || !yearId) {
      setYearKeywords([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(
        `/api/filter/year-keywords?storeId=${encodeURIComponent(storeId)}&yearId=${encodeURIComponent(
          String(yearId),
        )}`,
      );
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "فشل تحميل كلمات السنة");
      setYearKeywords(Array.isArray(data?.yearKeywords) ? data.yearKeywords : []);
    } catch (e: any) {
      setError(e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [storeId, yearId]);

  useEffect(() => {
    setForm({ mode: "add" });
    refresh();
  }, [refresh]);

  const onEdit = useCallback((k: YearKeyword) => {
    setForm({ mode: "edit", id: k.id, name_ar: k.name_ar, sort_order: k.sort_order ?? undefined });
  }, []);

  const onDelete = useCallback(
    async (k: YearKeyword) => {
      if (!storeId) return;
      setLoading(true);
      setError(null);
      try {
        const r = await fetch("/api/filter/year-keywords", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: k.id, store_id: storeId }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "فشل حذف الكلمة");
        await refresh();
      } catch (e: any) {
        setError(e?.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [refresh, storeId],
  );

  const onSubmit = useCallback(async () => {
    if (!storeId || !yearId) return;

    const name = (form.name_ar || "").trim();
    if (!name) {
      setError("اكتب نص الكلمة");
      return;
    }

    // IMPORTANT: ما نسوي update الآن (عشان ما نخرب نمطكم).
    if (form.mode === "edit") {
      setError("التعديل يحتاج endpoint update. ارسل ملف API حق keywords القديم وبسويه نفس نمطك.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/filter/year-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: storeId,
          year_id: yearId,
          name_ar: name,
          sort_order: form.sort_order ?? null,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "فشل حفظ الكلمة");

      setForm({ mode: "add" });
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [form.mode, form.name_ar, form.sort_order, refresh, storeId, yearId]);

  return { yearKeywords, form, setForm, loading, error, refresh, onSubmit, onEdit, onDelete };
}