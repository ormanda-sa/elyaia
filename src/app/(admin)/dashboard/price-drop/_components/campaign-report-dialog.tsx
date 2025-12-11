// FILE: src/app/(admin)/dashboard/price-drop/_components/campaign-report-dialog.tsx

"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { Button } from "@/components/ui/button";

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

  const campaignId = campaign?.id ?? null;

  async function handleBuildMessages() {
    if (!campaignId) return;
    try {
      const res = await fetch(
        `/api/dashboard/price-drop/campaigns/${campaignId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("[build-messages] error", json);
        alert("تعذر بناء رسائل الحملة، تأكد من وجود عملاء مستهدفين.");
        return;
      }

      const createdEmail = json.created_email ?? 0;
      const createdWhatsapp = json.created_whatsapp ?? 0;

      alert(
        `تم بناء رسائل الحملة.\nإيميل: ${createdEmail}\nواتساب: ${createdWhatsapp}`,
      );
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء بناء رسائل الحملة.");
    }
  }

  async function handleSendEmails() {
    try {
      const res = await fetch(
        `/api/dashboard/price-drop/messages/send-email`,
        { method: "POST" },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("[send-email] error", json);
        alert("تعذر إرسال الإيميلات، راجع إعدادات SMTP أو سجل الأخطاء.");
        return;
      }
      alert(
        `تمت محاولة إرسال الإيميلات.\nنجاح: ${json.sent}\nفشل: ${json.failed}\nتجاوز: ${json.skipped}`,
      );
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء إرسال الإيميلات.");
    }
  }

  async function handleSendWhatsapp() {
    try {
      const res = await fetch(
        `/api/dashboard/price-drop/messages/send-whatsapp`,
        { method: "POST" },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("[send-whatsapp] error", json);
        alert("تعذر إرسال رسائل الواتساب، راجع إعدادات الواتساب أو سجل الأخطاء.");
        return;
      }
      alert(
        `تمت محاولة إرسال رسائل الواتساب.\nنجاح: ${json.sent}\nفشل: ${json.failed}\nتجاوز: ${json.skipped}`,
      );
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء إرسال رسائل الواتساب.");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="data-[state=open]:animate-in data-[state=closed]:animate-out fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] min-h-[95vh] flex-col overflow-hidden rounded-t-3xl border-t bg-background px-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom"
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
              {/* كروت الإحصائيات + الفانل */}
              <CampaignReportSummary
                stats={data.stats}
                onsite_funnel={data.onsite_funnel}
              />

              {/* قسم رسائل الحملة */}
              <div className="rounded-lg border bg-card p-3 text-xs">
                <div className="mb-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-medium">
                      رسائل الحملة (Email / WhatsApp)
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      استخدم الأزرار لبناء رسائل الحملة من العملاء المستهدفين ثم إرسالها حسب القنوات المفعّلة.
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!campaignId}
                      onClick={handleBuildMessages}
                    >
                      بناء رسائل الحملة
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleSendEmails}
                    >
                      إرسال الإيميلات
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleSendWhatsapp}
                    >
                      إرسال رسائل واتساب
                    </Button>
                  </div>
                </div>
              </div>

              {/* جدول العملاء */}
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
