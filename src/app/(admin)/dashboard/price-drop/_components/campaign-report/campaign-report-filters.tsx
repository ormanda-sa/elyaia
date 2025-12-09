// FILE: src/app/(admin)/dashboard/price-drop/_components/campaign-report/campaign-report-filters.tsx

"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePreset } from "./campaign-report-types";

type Props = {
  preset: DatePreset;
  onChange: (preset: DatePreset) => void;
};

export function CampaignReportFilters({ preset, onChange }: Props) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">الفترة:</span>
        <Tabs
          value={preset}
          onValueChange={(v) => onChange(v as DatePreset)}
          className="w-auto"
        >
          <TabsList>
            <TabsTrigger value="7d">آخر ٧ أيام</TabsTrigger>
            <TabsTrigger value="30d">آخر ٣٠ يوم</TabsTrigger>
            <TabsTrigger value="all">من بداية الحملة</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* مكان جاهز للـ custom range مستقبلاً */}
      {/* <div className="text-xs text-muted-foreground">
        مدى مخصص (لاحقاً)
      </div> */}
    </div>
  );
}
