"use client";

type Counters = {
  brand_select: number;
  model_select: number;
  year_select: number;
  section_select: number;
  keyword_click: number;
  search_submit: number;
};

type Props = {
  totalEvents: number;
  counters: Counters;
};

export default function OverviewRow({ totalEvents, counters }: Props) {
  const searchCount = counters.search_submit;
  const searchRate =
    totalEvents > 0 ? (searchCount / totalEvents) * 100 : 0;

  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {/* كرت FILTER CONVERSION + وصف */}
      <div className="xl:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex-1 flex flex-col justify-between gap-4">
          <div>
            
            <div className="mt-1 text-sm font-semibold text-slate-900">
              نسبة من دخل الفلتر ووصل لزر البحث
            </div>
          </div>
          <p className="text-xs md:text-sm text-slate-500 leading-relaxed">
            من إجمالي{" "}
            <span className="font-semibold text-slate-900">
              {totalEvents.toLocaleString("ar-EG")}
            </span>{" "}
            حدث داخل الفلتر، تم تنفيذ{" "}
            <span className="font-semibold text-slate-900">
              {searchCount.toLocaleString("ar-EG")}
            </span>{" "}
            عملية بحث فعلية. كل ما ارتفعت هالنسبة، معناته الفلتر واضح وسلس
            لعملاءك.
          </p>
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <div className="flex flex-col gap-1">
              <span>أحداث الفلتر</span>
              <span className="font-semibold text-slate-900">
                {totalEvents.toLocaleString("ar-EG")}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span>عمليات البحث</span>
              <span className="font-semibold text-slate-900">
                {searchCount.toLocaleString("ar-EG")}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span>نسبة التحويل</span>
              <span className="font-semibold text-emerald-600">
                {searchRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* الدائرة */}
        <div className="w-40 h-40 rounded-full bg-slate-50 flex items-center justify-center relative">
          <div
            className="absolute inset-2 rounded-full"
            style={{
              background: `conic-gradient(#4f46e5 ${
                searchRate * 3.6
              }deg, #e5e7eb ${searchRate * 3.6}deg)`,
            }}
          />
          <div className="relative rounded-full bg-white w-24 h-24 flex flex-col items-center justify-center shadow-sm">
            <div className="text-lg font-semibold text-slate-900">
              {searchRate.toFixed(1)}%
            </div>
            <div className="text-[10px] text-slate-400">Search Rate</div>
          </div>
        </div>
      </div>

      {/* كرت إجمالي الأحداث */}
      <SummaryCard
        label="إجمالي أحداث الفلتر"
        value={totalEvents}
        hint="كل حركة داخل خطوات الفلتر (ماركة، موديل، سنة، قسم، كلمة، بحث)."
      />

      {/* كرت عمليات البحث */}
      <SummaryCard
        label="عمليات البحث الفعلية"
        value={counters.search_submit}
        hint="عدد مرات الضغط على زر تنفيذ البحث."
        accent="emerald"
      />
    </div>
  );
}

type SummaryCardProps = {
  label: string;
  value: number;
  hint?: string;
  accent?: "default" | "emerald";
};

function SummaryCard({
  label,
  value,
  hint,
  accent = "default",
}: SummaryCardProps) {
  const accentClasses =
    accent === "emerald"
      ? "border-emerald-100 bg-emerald-50/60"
      : "border-slate-200 bg-white";

  return (
    <div
      className={`rounded-3xl px-4 py-3 shadow-sm border ${accentClasses}`}
    >
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">
        {value.toLocaleString("ar-EG")}
      </div>
      {hint && (
        <div className="mt-1 text-[11px] text-slate-500 leading-snug">
          {hint}
        </div>
      )}
    </div>
  );
}
