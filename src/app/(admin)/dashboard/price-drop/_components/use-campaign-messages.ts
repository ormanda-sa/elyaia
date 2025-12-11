// FILE: src/app/(admin)/dashboard/price-drop/_components/use-campaign-messages.ts
"use client";

import * as React from "react";

export type CampaignMessagesSummary = {
  email: {
    total: number;
    pending: number;
    sent: number;
    failed: number;
  };
  whatsapp: {
    total: number;
    pending: number;
    sent: number;
    failed: number;
  };
};

type UseCampaignMessagesArgs = {
  campaignId: number | null;
  open: boolean;
};

export function useCampaignMessages({
  campaignId,
  open,
}: UseCampaignMessagesArgs) {
  const [data, setData] = React.useState<CampaignMessagesSummary | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !campaignId) return;
    const controller = new AbortController();

    async function fetchSummary() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/dashboard/price-drop/campaigns/${campaignId}/messages`,
          {
            method: "GET",
            signal: controller.signal,
          },
        );
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "FAILED_TO_FETCH_MESSAGES_SUMMARY");
        }
        setData(json as CampaignMessagesSummary);
      } catch (e: any) {
        if (e.name === "AbortError") return;
        console.error("useCampaignMessages error", e);
        setError(e.message || "حدث خطأ أثناء جلب إحصائيات الرسائل");
      } finally {
        setLoading(false);
      }
    }

    fetchSummary();
    return () => controller.abort();
  }, [campaignId, open]);

  return { data, loading, error };
}
