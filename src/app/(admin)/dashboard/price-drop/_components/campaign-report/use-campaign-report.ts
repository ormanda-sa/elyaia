// FILE: src/app/(admin)/dashboard/price-drop/_components/campaign-report/use-campaign-report.ts

"use client";

import * as React from "react";
import {
  CampaignReportData,
  CampaignSummary,
  DatePreset,
} from "./campaign-report-types";

type UseCampaignReportArgs = {
  open: boolean;
  campaign: CampaignSummary | null;
  preset: DatePreset;
};

export function useCampaignReport({
  open,
  campaign,
  preset,
}: UseCampaignReportArgs) {
  const [data, setData] = React.useState<CampaignReportData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const campaignId = campaign?.id;
    if (!open || !campaignId) return;

    const controller = new AbortController();

    async function fetchReport() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();

        if (preset === "7d") {
          const to = new Date();
          const from = new Date();
          from.setDate(from.getDate() - 7);
          params.set("from", from.toISOString());
          params.set("to", to.toISOString());
        } else if (preset === "30d") {
          const to = new Date();
          const from = new Date();
          from.setDate(from.getDate() - 30);
          params.set("from", from.toISOString());
          params.set("to", to.toISOString());
        } else if (preset === "all") {
          if (campaign?.starts_at) {
            params.set("from", new Date(campaign.starts_at).toISOString());
          }
          // نخلي to فاضي → يعني لليوم
        }

        const url = `/api/dashboard/price-drop/campaigns/${campaignId}/report?${params.toString()}`;

        const res = await fetch(url, {
          method: "GET",
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "FAILED_TO_FETCH_REPORT");
        }

        const json = (await res.json()) as CampaignReportData;
        setData(json);
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.error("useCampaignReport error", err);
        setError(err.message || "حدث خطأ أثناء جلب تقرير الحملة");
      } finally {
        setLoading(false);
      }
    }

    fetchReport();

    return () => controller.abort();
  }, [open, campaign?.id, campaign?.starts_at, preset]);

  return { data, loading, error };
}
