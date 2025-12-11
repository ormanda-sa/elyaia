// FILE: src/app/(admin)/dashboard/price-drop/_components/campaign-messages-summary.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { CampaignSummary } from "./campaign-report/campaign-report-types";
import { useCampaignMessages } from "./use-campaign-messages";

type Props = {
  open: boolean;
  campaign: CampaignSummary | null;
};

export function CampaignMessagesSummary({ open, campaign }: Props) {
  const campaignId = campaign?.id ?? null;
  const { data, loading, error } = useCampaignMessages({ campaignId, open });

  async function handleBuildMessages() {
    if (!campaignId) return;
    try {
      const res = await fetch(
        `/api/dashboard/price-drop/campaigns/${campaignId}/messages`,
        {
          method: "POST",
        },
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "FAILED_TO_BUILD_MESSAGES");
      }
      // إعادة التحميل بعد البناء
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء بناء رسائل الحملة");
    }
  }

  async function handleSendEmails() {
    try {
      const res = await fetch(
        `/api/dashboard/price-drop/messages/send-email`,
        { method: "POST" },
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "FAILED_TO_SEND_EMAILS");
      }
      alert(
        `تمت محاولة إرسال الإيميلات.\nنجاح: ${json.sent}\nفشل: ${json.failed}\nتجاوز: ${json.skipped}`,
      );
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء إرسال الإيميلات");
    }
  }

  async function handleSendWhatsapp() {
    try {
      const res = await fetch(
        `/api/dashboard/price-drop/messages/send-whatsapp`,
        { method: "POST" },
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "FAILED_TO_SEND_WHATSAPP");
      }
      alert(
        `تمت محاولة إرسال رسائل الواتساب.\nنجاح: ${json.sent}\nفشل: ${json.failed}\nتجاوز: ${json.skipped}`,
      );
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء إرسال الواتساب");
    }
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">إحصائيات رسائل الحملة</h3>
          <p className="text-[11px] text-muted-foreground">
            بناء وإرسال رسائل Email / WhatsApp للعملاء المستهدفين في هذه الحملة.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={handleBuildMessages}
            disabled={!campaignId || loading}
          >
            بناء رسائل الحملة
          </Button>
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={handleSendEmails}
            disabled={loading}
          >
            إرسال الإيميلات
          </Button>
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={handleSendWhatsapp}
            disabled={loading}
          >
            إرسال رسائل واتساب
          </Button>
        </div>
      </div>

      {loading && (
        <div className="text-[11px] text-muted-foreground">
          جاري تحميل إحصائيات الرسائل...
        </div>
      )}

      {!loading && error && (
        <div className="text-[11px] text-destructive">
          {error}
        </div>
      )}

      {!loading && data && (
        <div className="grid gap-3 md:grid-cols-2">
          <ChannelCard
            title="Email"
            stats={data.email}
          />
          <ChannelCard
            title="WhatsApp"
            stats={data.whatsapp}
          />
        </div>
      )}
    </div>
  );
}

function ChannelCard({
  title,
  stats,
}: {
  title: string;
  stats: { total: number; pending: number; sent: number; failed: number };
}) {
  return (
    <div className="rounded-md border bg-background p-3 text-xs">
      <div className="mb-1 text-[11px] font-semibold">{title}</div>
      <div className="grid grid-cols-4 gap-2">
        <ChannelStat label="إجمالي" value={stats.total} />
        <ChannelStat label="Pending" value={stats.pending} />
        <ChannelStat label="Sent" value={stats.sent} />
        <ChannelStat label="Failed" value={stats.failed} />
      </div>
    </div>
  );
}

function ChannelStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col rounded bg-muted px-2 py-1">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold">{value}</span>
    </div>
  );
}
