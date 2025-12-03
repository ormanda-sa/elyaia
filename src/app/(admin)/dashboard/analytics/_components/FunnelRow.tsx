"use client";

import type { ClientStats, PeakHours } from "../page";

type Counters = {
  brand_select: number;
  model_select: number;
  year_select: number;
  section_select: number;
  keyword_click: number;
  search_submit: number;
};

type Props = {
  counters: Counters;
  from: string;
  to: string;
  clientStats: ClientStats | null;
  peakHours: PeakHours | null;
};

export default function FunnelRow({
  counters,
  clientStats,
  peakHours,
}: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
          {/* نسب التفاعل داخل الفلتر */}
      <DetailCard title="نِسَب التفاعل داخل الفلتر">
        <RatiosList counters={counters} />
      </DetailCard>

      {/* كرت أوقات الذروة */}
      <DetailCard title="أوقات الذروة لاستخدام الفلتر">
        <PeakHoursBlock peakHours={peakHours} />
      </DetailCard>

    

      {/* الأجهزة والمتصفحات */}
      <DetailCard title="الأجهزة والمتصفحات">
        <ClientStatsBlock stats={clientStats} />
      </DetailCard>
    </div>
  );
}

/* ========== Peak Hours Block ========== */

function PeakHoursBlock({ peakHours }: { peakHours: PeakHours | null }) {
  if (!peakHours || !peakHours.counts || peakHours.counts.length === 0) {
    return (
      <div className="text-xs text-slate-500">
        لا توجد بيانات كافية عن أوقات الذروة في الفترة الحالية.
      </div>
    );
  }

  const counts = peakHours.counts;
  const total = counts.reduce((s, v) => s + v, 0);

  if (total === 0) {
    return (
      <div className="text-xs text-slate-500">
        لا توجد عمليات بحث كافية لحساب أوقات الذروة.
      </div>
    );
  }

  // نطلع أعلى 3 ساعات
  const withIndex = counts.map((c, i) => ({ hour: i, count: c }));
  const top = withIndex
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  function fmtHour(h: number) {
    const hh = h % 24;
    const suffix = hh < 12 ? "ص" : "م";
    const hour12 = hh % 12 === 0 ? 12 : hh % 12;
    return `${hour12}:00 ${suffix}`;
  }

  return (
    <div className="space-y-2 text-xs text-slate-700">
      {top.length === 0 ? (
        <div className="text-xs text-slate-500">
          كل الساعات متقاربة، لا توجد ذروة واضحة.
        </div>
      ) : (
        top.map((t) => (
          <div
            key={t.hour}
            className="flex items-center justify-between"
          >
            <span>{fmtHour(t.hour)}</span>
            <span className="font-mono text-[11px] text-slate-500">
              {t.count.toLocaleString("en-US")} (
              {((t.count / total) * 100).toFixed(1)}%)
            </span>
          </div>
        ))
      )}
      <div className="mt-1 text-[10px] text-slate-400">
        أوقات الذروة محسوبة من عدد عمليات البحث (search_submit) خلال الفترة.
      </div>
    </div>
  );
}

/* ========== Client Stats Block ========== */

function ClientStatsBlock({ stats }: { stats: ClientStats | null }) {
  if (!stats || stats.total_events === 0) {
    return (
      <div className="text-xs text-slate-500">
        لا توجد بيانات كافية عن الأجهزة والمتصفحات في الفترة الحالية.
      </div>
    );
  }

  const total = stats.total_events || 1;

  return (
    <div className="space-y-3 text-sm text-slate-700">
      <div>
        <div className="text-xs text-slate-500 mb-1">
          توزيع الأجهزة (من عمليات البحث)
        </div>
        {stats.devices.length === 0 ? (
          <div className="text-xs text-slate-400">
            لا توجد بيانات أجهزة كافية.
          </div>
        ) : (
          stats.devices.map((d) => (
            <div
              key={d.type}
              className="flex items-center justify-between text-xs"
            >
              <span>
                {d.type === "mobile"
                  ? "جوال"
                  : d.type === "desktop"
                  ? "كمبيوتر"
                  : d.type === "tablet"
                  ? "جهاز لوحي"
                  : "أخرى"}
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                {d.count.toLocaleString("en-US")} (
                {((d.count / total) * 100).toFixed(1)}%)
              </span>
            </div>
          ))
        )}
      </div>

      <div>
        <div className="mt-2 text-xs text-slate-500 mb-1">
          أكثر المتصفحات استخدامًا
        </div>
        {stats.browsers.length === 0 ? (
          <div className="text-xs text-slate-400">
            لا توجد بيانات متصفحات كافية.
          </div>
        ) : (
          stats.browsers.map((b) => (
            <div
              key={b.name}
              className="flex items-center justify-between text-xs"
            >
              <span>{b.name}</span>
              <span className="font-mono text-[11px] text-slate-500">
                {b.count.toLocaleString("en-US")}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ========== كروت + نسب ========== */

type DetailCardProps = {
  title: string;
  children: React.ReactNode;
};

function DetailCard({ title, children }: DetailCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-slate-900">
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

type DetailRowProps = {
  label: string;
  value: number;
};

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between text-sm text-slate-700">
      <span>{label}</span>
      <span className="font-medium">
        {value.toLocaleString("en-US")}
      </span>
    </div>
  );
}

function RatiosList({ counters }: { counters: Counters }) {
  const total =
    counters.brand_select +
    counters.model_select +
    counters.year_select +
    counters.section_select +
    counters.keyword_click +
    counters.search_submit;

  function ratio(v: number) {
    if (!total) return "0%";
    return ((v / total) * 100).toFixed(1) + "%";
  }

  const rows: { label: string; value: number }[] = [
    { label: "اختيار الماركة", value: counters.brand_select },
    { label: "اختيار الموديل", value: counters.model_select },
    { label: "اختيار السنة", value: counters.year_select },
    { label: "اختيار القسم", value: counters.section_select },
    { label: "نقرات الكلمات", value: counters.keyword_click },
    { label: "عمليات البحث", value: counters.search_submit },
  ];

  return (
    <div className="space-y-1 text-sm text-slate-700">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between rounded-lg px-2 py-1"
        >
          <span className="text-slate-700">{row.label}</span>
          <span className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
            {/* العدد */}
            <span className="min-w-[32px] text-right">
              {row.value.toLocaleString("en-US")}
            </span>
            {/* الفاصل */}
            <span className="text-slate-300">/</span>
            {/* النسبة */}
            <span className="min-w-[42px] text-right">
              {ratio(row.value)}
            </span>
          </span>
        </div>
      ))}
      <div className="mt-1 text-[10px] text-slate-400">
        العدد = عدد الأحداث لكل خطوة، النسبة = نسبة هذه الخطوة من إجمالي
        تفاعل الفلتر في الفترة المحددة.
      </div>
    </div>
  );
}
