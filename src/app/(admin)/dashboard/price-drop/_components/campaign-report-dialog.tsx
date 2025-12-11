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
import {
  Hammer,
  Send,
  MessageCircle,
  Loader2,
} from "lucide-react";

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
        alert(
          "تعذر إرسال رسائل الواتساب، راجع إعدادات الواتساب أو سجل الأخطاء.",
        );
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
        className="data-[state=open]:animate-in data-[state=closed]:animate-out fixed inset-x-0 bottom-0 z-50 flex max-h-[96vh] min-h-[96vh] flex-col overflow-hidden rounded-t-3xl border-t bg-gradient-to-b from-gray-50 to-white shadow-2xl transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom"
      >
        <SheetHeader className="mb-2 flex flex-col gap-3 border-b bg-white px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <SheetTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              تقرير الحملة
            </SheetTitle>

            <CampaignReportFilters preset={preset} onChange={setPreset} />
          </div>

          <CampaignReportHeader campaign={campaign} />
        </SheetHeader>

        <div className="flex-1 overflow-auto px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                <p className="text-sm font-medium text-gray-600">
                  جاري تحميل تقرير الحملة...
                </p>
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </div>
            </div>
          )}

          {!loading && !error && data && (
            <div className="flex flex-col gap-5">
              <CampaignReportSummary
                stats={data.stats}
                onsite_funnel={data.onsite_funnel}
                email_funnel={(data as any).email_funnel}
              />

              <div className="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-100 to-orange-50 border border-orange-200">
                      <Hammer className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        رسائل الحملة (Email / WhatsApp)
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        استخدم الأزرار لبناء رسائل الحملة من العملاء المستهدفين
                        ثم إرسالها حسب القنوات المفعّلة.
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!campaignId}
                      onClick={handleBuildMessages}
                      className="inline-flex items-center gap-1.5 text-xs font-medium shadow-sm hover:shadow transition-all"
                    >
                      <Hammer className="h-3.5 w-3.5" />
                      بناء رسائل الحملة
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleSendEmails}
                      className="inline-flex items-center gap-1.5 text-xs font-medium shadow-sm hover:shadow transition-all"
                    >
                      <Send className="h-3.5 w-3.5" />
                      إرسال الإيميلات
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleSendWhatsapp}
                      className="inline-flex items-center gap-1.5 text-xs font-medium shadow-sm hover:shadow transition-all"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      إرسال رسائل واتساب
                    </Button>
                  </div>
                </div>
              </div>

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
