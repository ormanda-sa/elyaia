"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

// تحميل ReactApexChart بدون SSR
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

type DayPoint = {
  date: string;   // YYYY-MM-DD
  label?: string; // اختياري من الـ API
  count: number;
};

type GlobalOverviewResponse = {
  range?: {
    from: string;
    to: string;
  };
  daily_series?: DayPoint[];
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

export function GlobalMonthChart() {
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
          console.error("global-month bad response:", res.status, text);
          return;
        }

        const json: GlobalOverviewResponse = await res.json();

        const daily = json.daily_series || [];
        const counts = daily.map((d) => d.count ?? 0);

        // نستخدم رقم اليوم من التاريخ كلـ label (01..30) بالإنجليزي
        const categories = daily.map((d) => {
          const dt = new Date(d.date);
          const day = dt.getDate();
          return String(day).padStart(2, "0");
        });

        if (!cancelled) {
          setState({
            counts,
            categories,
            from: json.range?.from,
            to: json.range?.to,
          });
        }
      } catch (err) {
        console.error("global-month chart error:", err);
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
      <div
        dir="rtl"
        className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white px-5 pb-4 pt-5 shadow-sm"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              استخدام الفلتر خلال آخر ٣٠ يوم (جميع المتاجر)
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              لا توجد عمليات بحث مسجّلة خلال آخر ٣٠ يوم على مستوى جميع المتاجر
              المشتركة.
            </p>
          </div>
        </div>
      </div>
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
        columnWidth: "40%", // زي Monthly Sales
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
        formatter: (val) => val.toFixed(0), // أرقام إنجليزي تلقائيًا
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
    <div
      dir="rtl"
      className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white px-5 pb-4 pt-5 shadow-sm"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            استخدام الفلتر خلال آخر ٣٠ يوم (جميع المتاجر)
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            كل عمود يمثّل عدد عمليات البحث في يوم واحد، على مستوى جميع المتاجر
            المشتركة خلال آخر ٣٠ يوم.
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

      <div className="mt-4 w-full">
        {typeof window !== "undefined" && (
          <ReactApexChart
            options={options}
            series={series}
            type="bar"
            height={260}
          />
        )}
      </div>
    </div>
  );
}
