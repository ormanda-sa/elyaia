"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import {
  CampaignSummary,
  DatePreset,
} from "./campaign-report/campaign-report-types";
import { useCampaignReport } from "./campaign-report/use-campaign-report";
import { CampaignReportHeader } from "./campaign-report/campaign-report-header";
import { CampaignReportFilters } from "./campaign-report/campaign-report-filters";
import { CampaignReportSummary } from "./campaign-report/campaign-report-summary";
import { CampaignReportCustomersTable } from "./campaign-report/campaign-report-customers-table";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: CampaignSummary | null;
};

export function CampaignReportDialog({ open, onOpenChange, campaign }: Props) {
  const [preset, setPreset] = React.useState<DatePreset>("7d");

  const { data, loading, error } = useCampaignReport({
    open,
    campaign,
    preset,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto flex max-h-[90vh] min-h-[95vh] flex-col overflow-hidden rounded-t-3xl border-t bg-background px-6"
      >
        <SheetHeader className="mb-3 flex flex-col gap-1.5 p-4 text-right">
          <SheetTitle className="text-base font-semibold">
            تقرير الحملة
          </SheetTitle>

          {/* هيدر الحملة (اسم، صورة، حالة، قنوات) */}
          <CampaignReportHeader campaign={campaign} />
        </SheetHeader>

        {/* فلتر الفترات */}
        <CampaignReportFilters preset={preset} onChange={setPreset} />

        {/* المحتوى الرئيسي */}
        <div className="flex-1 overflow-auto pb-4">
          {loading && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              جاري تحميل تقرير الحملة...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {!loading && !error && data && (
            <div className="flex flex-col gap-6">
              <CampaignReportSummary stats={data.stats} />
              <CampaignReportCustomersTable
                customers={data.customers}
                campaign={data.campaign}
              />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
