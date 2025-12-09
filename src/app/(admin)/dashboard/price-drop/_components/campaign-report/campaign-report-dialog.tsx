// FILE: src/app/(admin)/dashboard/price-drop/_components/campaign-report/campaign-report-dialog.tsx

"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  CampaignSummary,
  DatePreset,
} from "./campaign-report-types";
import { useCampaignReport } from "./use-campaign-report";
import { CampaignReportHeader } from "./campaign-report-header";
import { CampaignReportFilters } from "./campaign-report-filters";
import { CampaignReportSummary } from "./campaign-report-summary";
import { CampaignReportCustomersTable } from "./campaign-report-customers-table";

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            <CampaignReportHeader campaign={campaign} />
          </DialogTitle>
        </DialogHeader>

        <CampaignReportFilters preset={preset} onChange={setPreset} />

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
      </DialogContent>
    </Dialog>
  );
}
