"use client";

type Props = {
  storeId: string;
};

export default function AnalyticsHeader({ storeId }: Props) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          لوحة إحصائيات الفلتر الذكي
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          راقب سلوك عملاءك داخل الفلتر، واعرف أكثر المسارات والكلمات طلبًا،
          عشان تقوّي المخزون والعروض والـ SEO.
        </p>
      </div>
      <div className="text-xs text-right text-slate-500">
        <div className="mb-1">Store ID</div>
        <code className="font-mono text-[11px] bg-slate-100 px-2 py-1 rounded">
          {storeId}
        </code>
      </div>
    </div>
  );
}
