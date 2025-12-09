"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

type GlobalOverviewData = {
  totals: {
    total_events: number;
    total_search_submits: number;
    select_events_count: number;
    search_rate: number;
    top_day: string | null;
    top_day_count: number;
  };
};

export function GlobalTopStrip() {
  const [data, setData] = useState<GlobalOverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/dashboard/global-overview", {
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) return;
        if (!cancelled) {
          setData(json as GlobalOverviewData);
        }
      } catch (err) {
        console.error("global-top-strip error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !data) return null;

  const totalEvents = data.totals?.total_events || 0;
  const totalSearch = data.totals?.total_search_submits || 0;
  const searchRate = data.totals?.search_rate || 0;
  const conversionPercent = Math.round(searchRate * 10) / 10;

  const donutStyle: React.CSSProperties = {
    background: `conic-gradient(#4F46E5 ${conversionPercent}%, #E5E7EB ${conversionPercent}% 100%)`,
  };

  return (
    <div
      dir="rtl"
      className="grid gap-4 lg:grid-cols-3"
    >
      {/* عمليات البحث الفعّالة */}
      <Card className="rounded-[24px] border-none bg-emerald-50/70 shadow-sm">
        <CardContent className="flex h-full flex-col justify-between p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-emerald-700">
                عمليات البحث الفعّالة
              </p>
              <p className="text-[11px] text-emerald-600">
                عدد مرات الضغط على زر تنفيذ البحث.
              </p>
            </div>
            <div className="mt-2 h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-6 text-5xl font-semibold text-emerald-800">
            {totalSearch}
          </div>
        </CardContent>
      </Card>

      {/* إجمالي أحداث النقر */}
      <Card className="rounded-[24px] border-none bg-white shadow-sm">
        <CardContent className="flex h-full flex-col justify-between p-5">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-700">
              إجمالي أحداث النقر
            </p>
            <p className="text-[11px] text-slate-500">
              كل حركة داخل الفلتر (اختيار شركة، موديل، سنة، قسم، كلمة بحث).
            </p>
          </div>
          <div className="mt-6 text-5xl font-semibold text-slate-900">
            {totalEvents}
          </div>
        </CardContent>
      </Card>

      {/* FILTER CONVERSION */}
      <Card className="rounded-[24px] border-none bg-white shadow-sm">
        <CardContent className="flex h-full flex-col justify-between p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
            
              <p className="text-xs font-semibold text-slate-800">
                نسبة من دخل الفلتر ووصل لزر البحث
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                من إجمالي{" "}
                <span className="font-semibold text-slate-800">
                  {totalEvents}
                </span>{" "}
                حدث داخل الفلتر، تم تنفيذ{" "}
                <span className="font-semibold text-slate-800">
                  {totalSearch}
                </span>{" "}
                عملية بحث فعّالة. كل ما ارتفعت هالنسبة، معناها أن تصميم الفلتر
                واضح وسلس لعملائك.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center">
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full"
                style={donutStyle}
              >
                <div className="flex h-16 w-16 flex-col items-center justify-center rounded-full bg-white">
                  <div className="text-xs font-semibold text-slate-900">
                    {conversionPercent}%
                  </div>
                  <div className="mt-0.5 text-[9px] text-slate-500">
                    Search Rate
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-6 text-[11px] text-slate-500">
            <div className="flex items-baseline gap-1">
              <span className="text-slate-400">أحداث الفلتر</span>
              <span className="font-semibold text-slate-800">
                {totalEvents}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-slate-400">عمليات البحث</span>
              <span className="font-semibold text-slate-800">
                {totalSearch}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-slate-400">نسبة التحويل</span>
              <span className="font-semibold text-emerald-600">
                {conversionPercent}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
