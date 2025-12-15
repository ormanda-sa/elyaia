// src/app/dashboard/_components/GlobalWeekChart.tsx
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// تحميل ApexChart بدون SSR
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

type WeekPoint = {
  day_ar: string;
  count: number;
};

type GlobalOverviewResponse = {
  range?: {
    from: string;
    to: string;
  };
  weekday_series?: WeekPoint[];
};

type ChartState = {
  counts: number[];
  categories: string[];
  from?: string;
  to?: string;
};

function formatDateGregorian(dateStr?: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function GlobalWeekChart() {
  const [state, setState] = useState<ChartState>({
    counts: [],
    categories: [],
    from: undefined,
    to: undefined,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);

        const res = await fetch("/api/dashboard/global-overview", {
          cache: "no-store",
        });

        const contentType = res.headers.get("content-type") || "";
        if (!res.ok || !contentType.includes("application/json")) {
          const text = await res.text();
          console.error("global-week bad response:", res.status, text);
          return;
        }

        const json: GlobalOverviewResponse = await res.json();

        const weekday = json.weekday_series || [];
        const counts = weekday.map((w) => w.count ?? 0);
        const categories = weekday.map((w) =>
          w.day_ar.replace("ال", ""), // أحد، إثنين...
        );

        if (!cancelled) {
          setState({
            counts,
            categories,
            from: json.range?.from,
            to: json.range?.to,
          });
        }
      } catch (err) {
        console.error("global-week chart error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const { counts, categories, from, to } = state;

  if (!counts.length) {
    return (
      <Card
        className="mt-4 rounded-3xl border border-slate-200 bg-white px-5 pb-4 pt-5 shadow-sm"
        dir="rtl"
      >
        <CardHeader className="pb-1 px-0">
          <CardTitle className="text-sm font-semibold text-slate-900">
            توزيع عمليات البحث حسب اليوم
          </CardTitle>
          <p className="mt-1 text-xs text-slate-500">
            لا توجد بيانات كافية خلال آخر ٣٠ يوم لعرض توزيع عمليات البحث على أيام
            الأسبوع.
          </p>
        </CardHeader>
      </Card>
    );
  }

  const options: ApexOptions = {
    colors: ["#465fff"],
    chart: {
      fontFamily:
        "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      type: "bar",
      height: 260,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "40%", // نفس ستايل Monthly Sales
        borderRadius: 6,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: { enabled: false },
    stroke: {
      show: true,
      width: 4,
      colors: ["transparent"],
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          fontSize: "10px",
          colors: "#9CA3AF",
        },
      },
    },
    legend: { show: false },
    yaxis: {
      labels: {
        formatter: (val) => val.toFixed(0), // أرقام إنجليزي
        style: {
          fontSize: "10px",
          colors: "#9CA3AF",
        },
      },
    },
    grid: {
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    fill: { opacity: 1 },
    tooltip: {
      x: { show: true },
      y: {
        formatter: (val: number) => `${val} عمليات بحث`,
      },
    },
  };

  const series = [
    {
      name: "عمليات البحث",
      data: counts,
    },
  ];

  return (
    <Card
      className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white px-5 pb-4 pt-5 shadow-sm"
      dir="rtl"
    >
      <CardHeader className="pb-1 px-0">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-slate-900">
              توزيع عمليات البحث حسب اليوم
            </CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              اعرف أي أيام الأسبوع فيها أكبر استخدام للفلتر عشان تقدر تحسن أداء
              متجرك وتضبط حملاتك الإعلانية عليها.
            </p>
          </div>

          <div className="text-left text-[11px] text-slate-400 md:text-right">
            هذه الفترة: من{" "}
            <span className="font-medium text-indigo-600">
              {formatDateGregorian(from)}
            </span>{" "}
            إلى{" "}
            <span className="font-medium text-indigo-600">
              {formatDateGregorian(to)}
            </span>
            {loading && (
              <span className="ml-2 text-slate-500">جاري التحديث...</span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="mt-2 px-0">
        {typeof window !== "undefined" && (
          <ReactApexChart
            options={options}
            series={series}
            type="bar"
            height={260}
          />
        )}
      </CardContent>
    </Card>
  );
}
