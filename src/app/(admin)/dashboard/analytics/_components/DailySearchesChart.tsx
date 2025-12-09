"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

// استيراد ReactApexChart بدون SSR
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

type DailyResponse = {
  store_id: string;
  from: string;
  to: string;
  counts: number[]; // [Sun..Sat]
};

type Props = {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
};

// تنسيق ميلادي ثابت YYYY-MM-DD
function formatDateGregorian(dateStr: string) {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DailySearchesChart({ from, to }: Props) {
  const [data, setData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [loading, setLoading] = useState(false);

  // جلب البيانات كل ما تغيّر from/to
  useEffect(() => {
    if (!from || !to) return;

    async function load() {
      try {
        setLoading(true);

        const params = new URLSearchParams({
          from,
          to,
        }).toString();

        const res = await fetch(
          `/api/dashboard/analytics/daily-searches?${params}`,
        );

        const contentType = res.headers.get("content-type") || "";

        if (!res.ok || !contentType.includes("application/json")) {
          const text = await res.text();
          console.error("daily-searches bad response:", res.status, text);
          return;
        }

        const json: DailyResponse = await res.json();
        setData(json.counts || [0, 0, 0, 0, 0, 0, 0]);
      } catch (e) {
        console.error("daily chart error", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [from, to]);

  // ترتيب الأيام (أحد → سبت)
  const categories = [
    "الأحد",
    "الإثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت",
  ];

  const options: ApexOptions = {
    colors: ["#465fff"],
    chart: {
      fontFamily:
        "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      type: "bar",
      height: 220,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "40%",
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
    },
    legend: { show: false },
    yaxis: {
      labels: {
        formatter: (val) => val.toFixed(0),
      },
    },
    grid: {
      yaxis: { lines: { show: true } },
    },
    fill: { opacity: 1 },
    tooltip: {
      x: { show: true },
      y: {
        formatter: (val: number) => `${val} عملية بحث`,
      },
    },
  };

  const series = [
    {
      name: "عمليات البحث",
      data,
    },
  ];

  return (
    <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white px-5 pb-4 pt-5 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            توزيع عمليات البحث حسب اليوم
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            اعرف أي أيام الأسبوع فيها أكبر استخدام للفلتر عشان تركّز حملاتك
            وإعلاناتك عليها.
          </p>
        </div>

        <div className="text-left text-[11px] text-slate-400 md:text-right">
          الفترة الحالية: من{" "}
          {from ? formatDateGregorian(from) : "—"} إلى{" "}
          {to ? formatDateGregorian(to) : "—"}
          {loading && (
            <span className="ml-2 text-slate-500">جاري التحديث...</span>
          )}
        </div>
      </div>

      <div className="mt-4 w-full">
        <div className="w-full">
          {typeof window !== "undefined" && (
            <ReactApexChart
              options={options}
              series={series}
              type="bar"
              height={220}
            />
          )}
        </div>
      </div>
    </div>
  );
}
