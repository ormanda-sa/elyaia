"use client";

import { useEffect, useState } from "react";
import { ChevronDownIcon } from "lucide-react";

import AnalyticsHeader from "./_components/AnalyticsHeader";
import OverviewRow from "./_components/OverviewRow";
import FunnelRow from "./_components/FunnelRow";
import TopRoutesTable, { RouteRow } from "./_components/TopRoutesTable";
import DailySearchesChart from "./_components/DailySearchesChart";
import DailySearchesTimelineChart from "./_components/DailySearchesTimelineChart";
import WidgetEventsTable, {
  WidgetEventRow,
} from "./_components/widget-events-table";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Counters = {
  brand_select: number;
  model_select: number;
  year_select: number;
  section_select: number;
  keyword_click: number;
  search_submit: number;
};

type OverviewResponse = {
  store_id: string;
  from: string;
  to: string;
  total_events: number;
  counters: Counters;
  top_brand: null;
};

type DeviceInfo = {
  type: string;
  count: number;
};

type BrowserInfo = {
  name: string;
  count: number;
};

export type ClientStats = {
  total_events: number;
  devices: DeviceInfo[];
  browsers: BrowserInfo[];
};

export type PeakHours = {
  counts: number[]; // 0..23
};

// ✅ تنسيق التاريخ من مكوّناته المحلية، بدون UTC
function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`; // YYYY-MM-DD
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [clientStats, setClientStats] = useState<ClientStats | null>(null);
  const [peakHours, setPeakHours] = useState<PeakHours | null>(null);
  const [events, setEvents] = useState<WidgetEventRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [activeQuick, setActiveQuick] = useState<
    "today" | "7d" | "30d" | "month" | null
  >("30d");

  const [activeTab, setActiveTab] = useState<"routes" | "events">("routes");

  useEffect(() => {
    applyQuickRange("30d");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyQuickRange(type: "today" | "7d" | "30d" | "month") {
    const now = new Date();
    let fromDate: Date;
    let toDate: Date = now;

    if (type === "today") {
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      toDate = new Date(fromDate);
    } else if (type === "7d") {
      fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (type === "30d") {
      fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    setFrom(fmtDate(fromDate));
    setTo(fmtDate(toDate));
    setActiveQuick(type);
  }

  useEffect(() => {
    if (!from || !to) return;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const query = new URLSearchParams({
          from,
          to,
        }).toString();

        const [ovRes, routesRes, statsRes, peakRes, eventsRes] =
          await Promise.all([
            fetch(`/api/dashboard/analytics/overview?${query}`),
            fetch(`/api/dashboard/analytics/top-routes?${query}`),
            fetch(`/api/dashboard/analytics/client-stats?${query}`),
            fetch(`/api/dashboard/analytics/peak-hours?${query}`),
            fetch(`/api/dashboard/analytics/events?${query}`),
          ]);

        const ovJson = await ovRes.json();
        const routesJson = await routesRes.json();
        const statsJson = await statsRes.json();
        const peakJson = await peakRes.json();
        const eventsJson = await eventsRes.json();

        if (!ovRes.ok) throw new Error(ovJson.error || "خطأ في الملخص");
        if (!routesRes.ok)
          throw new Error(
            routesJson.error || "خطأ في جلب المسارات الأكثر استخدامًا",
          );
        if (!statsRes.ok)
          throw new Error(
            statsJson.error || "خطأ في جلب إحصائيات الأجهزة والمتصفحات",
          );
        if (!peakRes.ok)
          throw new Error(
            peakJson.error || "خطأ في جلب أوقات الذروة",
          );
        if (!eventsRes.ok)
          throw new Error(
            eventsJson.error || "خطأ في جلب أحداث الفلتر",
          );

        setOverview(ovJson as OverviewResponse);
        setRoutes((routesJson.routes as RouteRow[]) || []);
        setClientStats({
          total_events: statsJson.total_events || 0,
          devices: statsJson.devices || [],
          browsers: statsJson.browsers || [],
        });
        setPeakHours({
          counts: peakJson.counts || [],
        });
        setEvents((eventsJson.events as WidgetEventRow[]) || []);
      } catch (e: any) {
        setError(e.message || "حدث خطأ غير متوقع");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [from, to]);

  return (
    <div className="p-6 space-y-6">
      <AnalyticsHeader storeId={overview?.store_id || ""} />

      {/* فلتر الفترة + أزرار سريعة */}
      <div className="mt-4 mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex flex-col gap-1">
            <span className="px-1 text-[11px] text-slate-500">من</span>
            <DatePopover
              value={from}
              onChange={(val) => {
                setFrom(val);
                setActiveQuick(null);
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="px-1 text-[11px] text-slate-500">إلى</span>
            <DatePopover
              value={to}
              onChange={(val) => {
                setTo(val);
                setActiveQuick(null);
              }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <QuickButton
            label="اليوم"
            active={activeQuick === "today"}
            onClick={() => applyQuickRange("today")}
          />
          <QuickButton
            label="آخر ٧ أيام"
            active={activeQuick === "7d"}
            onClick={() => applyQuickRange("7d")}
          />
          <QuickButton
            label="آخر ٣٠ يوم"
            active={activeQuick === "30d"}
            onClick={() => applyQuickRange("30d")}
          />
          <QuickButton
            label="هذا الشهر"
            active={activeQuick === "month"}
            onClick={() => applyQuickRange("month")}
          />
        </div>

        <span className="text-[11px] text-slate-400">
          الافتراضي: آخر ٣٠ يوم — تغيير التواريخ أو اختيار أحد الأزرار أعلاه
          يحدّث كل الإحصائيات في هذه الصفحة (الكروت، المسارات، الشارتات).
        </span>
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          جاري تحميل بيانات الإحصائيات...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
          حدث خطأ أثناء تحميل البيانات:
          <br />
          <span className="font-mono text-xs">{error}</span>
        </div>
      )}

      {!loading && !error && overview && (
        <>
          {/* الكروت العلوية */}
          <OverviewRow
            totalEvents={overview.total_events}
            counters={overview.counters}
          />

          {/* كروت: أوقات الذروة + نسب الفلتر + الأجهزة */}
          <FunnelRow
            counters={overview.counters}
            from={from}
            to={to}
            clientStats={clientStats}
            peakHours={peakHours}
          />

          {/* الشارتات */}
          <div className="grid gap-4 lg:grid-cols-2">
            <DailySearchesTimelineChart from={from} to={to} />
            <DailySearchesChart from={from} to={to} />
          </div>

          {/* جدول المسارات + الأحداث في تبويب */}
          <div className="mt-4 space-y-3">
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("routes")}
                className={`rounded-full px-3 py-1 transition ${
                  activeTab === "routes"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                المسارات (ملخّص)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("events")}
                className={`rounded-full px-3 py-1 transition ${
                  activeTab === "events"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                جميع الأحداث (تفصيل)
              </button>
            </div>

           {activeTab === "routes" ? (
  <TopRoutesTable routes={routes} />
) : (
  <WidgetEventsTable from={from} to={to} />
)}

          </div>
        </>
      )}
    </div>
  );
}

/* زر سريع للفترات */
type QuickButtonProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

function QuickButton({ label, active, onClick }: QuickButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 transition text-xs ${
        active
          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

/* Date Popover */

type DatePopoverProps = {
  value: string;
  onChange: (val: string) => void;
};

function DatePopover({ value, onChange }: DatePopoverProps) {
  const [open, setOpen] = useState(false);

  const selectedDate = value ? new Date(value) : undefined;

  function handleSelect(date: Date | undefined) {
    if (!date) return;
    onChange(fmtDate(date));
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-40 justify-between rounded-full border-slate-200 bg-white font-normal text-xs text-slate-700"
        >
          {selectedDate ? fmtDate(selectedDate) : "اختر التاريخ"}
          <ChevronDownIcon className="h-4 w-4 text-slate-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto overflow-hidden p-0"
        align="start"
        side="bottom"
      >
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          captionLayout="dropdown"
        />
      </PopoverContent>
    </Popover>
  );
}
