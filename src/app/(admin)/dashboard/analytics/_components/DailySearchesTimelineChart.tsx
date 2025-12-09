"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

type TimeseriesResponse = {
  store_id: string;
  from: string;
  to: string;
  labels: string[]; // YYYY-MM-DD
  counts: number[];
};

type Props = {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
};

// تنسيق ميلادي ثابت YYYY-MM-DD
function formatDateYMD(dateStr: string) {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DailySearchesTimelineChart({ from, to }: Props) {
  const [labels, setLabels] = useState<string[]>([]);
  const [data, setData] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

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
          `/api/dashboard/analytics/search-timeseries?${params}`,
        );
        const contentType = res.headers.get("content-type") || "";

        if (!res.ok || !contentType.includes("application/json")) {
          const text = await res.text();
          console.error("timeseries bad response:", res.status, text);
          return;
        }

        const json: TimeseriesResponse = await res.json();
        setLabels(json.labels || []);
        setData(json.counts || []);
      } catch (e) {
        console.error("timeseries error", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [from, to]);

  const options: ApexOptions = {
    colors: ["#4f46e5"],
    chart: {
      fontFamily:
        "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      type: "area",
      height: 260,
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    dataLabels: { enabled: false },
    stroke: {
      curve: "smooth",
      width: 3,
    },
    xaxis: {
      categories: labels.map((d) =>
        // نعرضها بصيغة YYYY-MM-DD
        formatDateYMD(d),
      ),
      labels: {
        style: { fontSize: "11px" },
      },
    },
    yaxis: {
      labels: {
        formatter: (val) => val.toFixed(0),
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 0.9,
        opacityFrom: 0.5,
        opacityTo: 0,
        stops: [0, 80, 100],
      },
    },
    grid: {
      yaxis: { lines: { show: true } },
    },
    tooltip: {
      x: {
        formatter: (val) => String(val),
      },
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
      <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            تطوّر عمليات البحث خلال الفترة
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            راقب كيف تتحرك عمليات البحث يوميًا داخل الفترة المحددة، عشان تعرف
            تأثير الحملات والمواسم على استخدام الفلتر.
          </p>
        </div>
        <div className="text-[11px] text-slate-400">
          الفترة الحالية: من{" "}
          {from ? formatDateYMD(from) : "—"} إلى{" "}
          {to ? formatDateYMD(to) : "—"}
          {loading && (
            <span className="ml-2 text-slate-500">جاري التحديث...</span>
          )}
        </div>
      </div>

      <div className="mt-2 w-full">
        <div className="w-full">
          {typeof window !== "undefined" && (
            <ReactApexChart
              options={options}
              series={series}
              type="area"
              height={260}
            />
          )}
        </div>
      </div>
    </div>
  );
}
