// FILE: src/app/(admin)/dashboard/price-drop/_components/campaign-report/campaign-report-summary.tsx

"use client";

import {
  CampaignReportStats,
  OnsiteFunnelStats,
} from "./campaign-report-types";

type Props = {
  stats: CampaignReportStats | null | undefined;
  onsite_funnel?: OnsiteFunnelStats | null | undefined; // 👈 اختياري
};

export function CampaignReportSummary({ stats, onsite_funnel }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {/* إجمالي التارجتس */}
      <div className="grid gap-3 md:grid-cols-5">
        <SummaryCard
          label="إجمالي العملاء المستهدفين"
          value={stats?.total_targets ?? 0}
        />
        <SummaryCard
          label="العملاء القدامى (من أول إطلاق)"
          value={stats?.old_targets ?? 0}
        />
        <SummaryCard
          label="العملاء الجدد (انضموا لاحقاً)"
          value={stats?.new_targets ?? 0}
        />
        <SummaryCard
          label="العملاء اللي شافوا On-site"
          value={stats?.onsite_seen_count ?? 0}
        />
        <SummaryCard
          label="التحويلات (Converted)"
          value={stats?.converted_count ?? 0}
        />
      </div>

      {/* Funnel On-site */}
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryCard
          label="ظهور البوب أب (Impressions)"
          value={onsite_funnel?.impressions ?? 0}
        />
        <SummaryCard
          label="نقرات على البوب أب (Clicks)"
          value={onsite_funnel?.clicks ?? 0}
        />
        <SummaryCard
          label="إغلاقات البوب أب (Closes)"
          value={onsite_funnel?.closes ?? 0}
        />
        <SummaryCard
          label="طلبات من On-site (Orders)"
          value={onsite_funnel?.orders ?? 0}
        />
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
