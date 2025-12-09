// FILE: src/app/(admin)/dashboard/price-drop/_components/campaign-report/campaign-report-summary.tsx

"use client";

import { CampaignReportStats } from "./campaign-report-types";

type Props = {
  stats: CampaignReportStats | null | undefined;
};

export function CampaignReportSummary({ stats }: Props) {
  return (
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
