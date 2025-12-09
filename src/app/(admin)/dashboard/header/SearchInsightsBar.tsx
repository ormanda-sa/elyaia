// src/components/header/SearchInsightsBar.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import Link from "next/link";

type KeywordInsight = {
  type: "keyword";
  query: string;
  keyword: {
    id: number;
    name_ar: string;
    model_id: number | null;
    model_name: string | null;
    brand_id: number | null;
    brand_name: string | null;
    section_id: number | null;
    section_name: string | null;
  };
  stats: {
    total_searches_30d: number;
    top_day: string | null;
  };
  route: {
    exists: boolean;
    target_url: string | null;
  };
};

type ModelInsight = {
  type: "model";
  query: string;
  model: {
    id: number;
    name_ar: string;
    brand_id: number | null;
    brand_name: string | null;
  };
  stats: {
    total_searches_30d: number;
    top_day: string | null;
  };
};

type NoneInsight = {
  type: "none";
  query: string;
  message: string;
};

type InsightResult = KeywordInsight | ModelInsight | NoneInsight | null;

export function SearchInsightsBar() {
  const [query, setQuery] = useState("");
  const [insight, setInsight] = useState<InsightResult>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      setInsight(null);
      setOpen(false);
      return;
    }

    setLoading(true);
    setError(null);
    setInsight(null);
    setOpen(true);

    try {
      const res = await fetch(
        `/api/dashboard/search-insights?q=${encodeURIComponent(q)}`,
        { cache: "no-store" },
      );
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json?.error || "فشل في جلب النتائج");
        return;
      }

      setInsight(json as InsightResult);
    } catch (err) {
      console.error("search-insights client error:", err);
      setError("حدث خطأ أثناء الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  // إغلاق البوب-اب عند الضغط خارج الحقل
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={wrapperRef} dir="rtl">
      {/* حقل البحث */}
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <span className="absolute -translate-y-1/2 left-4 top-1/2 pointer-events-none">
            <svg
              className="fill-gray-500 dark:fill-gray-400"
              width={20}
              height={20}
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
                fill=""
              />
            </svg>
          </span>

          <Input
            type="text"
            placeholder="ابحث عن موديل أو كلمة فلتر..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[430px]"
          />

          <button
            type="submit"
            className="absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-[7px] py-[4.5px] text-xs text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400"
            disabled={loading}
          >
            {loading ? "..." : "بحث"}
          </button>
        </div>
      </form>

      {/* بوب-اب النتيجة */}
      {open && (error || insight) && (
        <div className="absolute right-0 mt-2 w-[360px] rounded-2xl border border-slate-200 bg-white p-3 text-[11px] text-slate-700 shadow-theme-lg dark:border-slate-700 dark:bg-gray-900">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-700 dark:border-red-500/40 dark:bg-red-500/10">
              {error}
            </div>
          )}

          {!error && insight && insight.type === "keyword" && (
            <div className="space-y-1">
              <div className="font-semibold text-slate-900">
                كلمة فلتر: {insight.keyword.name_ar}
              </div>
              <div className="text-slate-600">
                الموديل:{" "}
                <span className="font-medium">
                  {insight.keyword.brand_name
                    ? `${insight.keyword.brand_name} / `
                    : ""}
                  {insight.keyword.model_name || "—"}
                </span>
              </div>
              {insight.keyword.section_name && (
                <div className="text-slate-600">
                  القسم:{" "}
                  <span className="font-medium">
                    {insight.keyword.section_name}
                  </span>
                </div>
              )}
              <div>
                الاستخدام آخر 30 يوم:{" "}
                <span className="font-semibold">
                  {insight.stats.total_searches_30d}
                </span>
              </div>
              {insight.stats.top_day && (
                <div>
                  أكثر يوم استخدام:{" "}
                  <span className="font-semibold">
                    {insight.stats.top_day}
                  </span>
                </div>
              )}
              <div className="pt-1">
                {insight.route.exists ? (
                  <span className="text-emerald-700">
                    ✅ هذه الكلمة مربوطة برابط:
                    <span className="font-mono">
                      {" "}
                      {insight.route.target_url}
                    </span>
                  </span>
                ) : (
                  <span className="text-amber-700">
                    ⚠ لا يوجد Route لهذه الكلمة، يفضّل ضبط توجيه لها.
                  </span>
                )}
              </div>
              <div className="pt-2">
                <Link
                  href={`/dashboard/filter?tab=keywords`}
                  className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                >
                  ضبط هذه الكلمة في الفلتر
                </Link>
              </div>
            </div>
          )}

          {!error && insight && insight.type === "model" && (
            <div className="space-y-1">
              <div className="font-semibold text-slate-900">
                موديل: {insight.model.name_ar}
              </div>
              {insight.model.brand_name && (
                <div className="text-slate-600">
                  الشركة:{" "}
                  <span className="font-medium">
                    {insight.model.brand_name}
                  </span>
                </div>
              )}
              <div>
                الاستخدام لهذا الموديل آخر 30 يوم:{" "}
                <span className="font-semibold">
                  {insight.stats.total_searches_30d}
                </span>
              </div>
              {insight.stats.top_day && (
                <div>
                  أكثر يوم بحثاً:{" "}
                  <span className="font-semibold">
                    {insight.stats.top_day}
                  </span>
                </div>
              )}

              <div className="pt-2">
                <Link
                  href={`/dashboard/filter?tab=models`}
                  className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                >
                  إدارة فلتر هذا الموديل
                </Link>
              </div>
            </div>
          )}

          {!error && insight && insight.type === "none" && (
            <div className="text-slate-600">
              {insight.message || "لم يتم العثور على نتيجة مطابقة."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
