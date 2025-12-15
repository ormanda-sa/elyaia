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
  Dialog,
  DialogContent,
  DialogHeader as DialogHeaderRoot,
  DialogTitle as DialogTitleRoot,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Card,
  CardHeader as CHeader,
  CardTitle as CTitle,
  CardContent as CContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

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

type EmailTemplate = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  subject_template: string;
  html_template: string;
  is_default: boolean;
};

export function CampaignReportDialog({ open, onOpenChange, campaign }: Props) {
  const [preset, setPreset] = React.useState<DatePreset>("7d");

  const { data, loading, error } = useCampaignReport({
    open,
    campaign,
    preset,
  });

  const campaignId = campaign?.id ?? null;

  // ====================== بناء رسائل الحملة (كما هو) ====================== //

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

  // ====================== بوب-أب إرسال الإيميلات ====================== //

  const [emailDialogOpen, setEmailDialogOpen] = React.useState(false);
  const [templates, setTemplates] = React.useState<EmailTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = React.useState(false);
  const [templatesError, setTemplatesError] = React.useState<string | null>(
    null,
  );
  const [selectedTemplate, setSelectedTemplate] = React.useState<
    EmailTemplate | null
  >(null);
  const [sendingEmails, setSendingEmails] = React.useState(false);
  const [previewLogoUrl, setPreviewLogoUrl] = React.useState<string | null>(
    null,
  );

  function handleOpenSendEmails() {
    if (!campaignId) return;
    setEmailDialogOpen(true);
  }

  // جلب القوالب + إعدادات الإيميل (الشعار) عند فتح البوب أب
  React.useEffect(() => {
    if (!emailDialogOpen) return;

    (async () => {
      try {
        setTemplatesLoading(true);
        setTemplatesError(null);

        const [tplRes, settingsRes] = await Promise.all([
          fetch("/api/dashboard/settings/email/templates"),
          fetch("/api/dashboard/email/settings"),
        ]);

        const tplJson = await tplRes.json().catch(() => []);
        if (tplRes.ok) {
          const list = tplJson as EmailTemplate[];
          setTemplates(list);
          const def = list.find((t) => t.is_default);
          setSelectedTemplate(def ?? list[0] ?? null);
        } else {
          setTemplatesError(
            (tplJson as any).error || "تعذر جلب قوالب البريد الإلكتروني",
          );
        }

        const settingsJson = await settingsRes
          .json()
          .catch(() => ({} as any));
        if (settingsRes.ok && settingsJson.logo_url) {
          setPreviewLogoUrl(settingsJson.logo_url as string);
        } else {
          setPreviewLogoUrl(null);
        }
      } catch (e: any) {
        console.error("[send-email-dialog] load error", e);
        setTemplatesError("تعذر تحميل بيانات الإرسال");
      } finally {
        setTemplatesLoading(false);
      }
    })();
  }, [emailDialogOpen]);

  // لما يختار قالب من القائمة: نغيره + نخليه افتراضي في email_templates
  const handleTemplateChange = async (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const id = Number(e.target.value);
    if (!id || Number.isNaN(id)) {
      setSelectedTemplate(null);
      return;
    }

    const tpl = templates.find((t) => t.id === id) || null;
    setSelectedTemplate(tpl);

    try {
      await fetch(`/api/dashboard/settings/email/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: true }),
      });

      // نحدّث الـ state عشان تظهر (افتراضي) مباشرة
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, is_default: true } : { ...t, is_default: false },
        ),
      );
    } catch (err) {
      console.error("[set-default-template] error", err);
    }
  };

  async function handleConfirmSendEmails() {
    if (!campaignId || !selectedTemplate) return;

    try {
      setSendingEmails(true);
      const res = await fetch(
        `/api/dashboard/price-drop/messages/send-email?campaign_id=${campaignId}&template_id=${selectedTemplate.id}`,
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
      setEmailDialogOpen(false);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "حدث خطأ أثناء إرسال الإيميلات.");
    } finally {
      setSendingEmails(false);
    }
  }

  // ====================== إرسال واتساب (كما هو) ====================== //

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

  // ====================== واجهة تقرير الحملة (نفس كودك) ====================== //

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="data-[state=open]:animate-in data-[state=closed]:animate-out fixed inset-x-0 bottom-0 z-50 flex max-h-[96vh] min-h-[96vh] flex-col overflow-hidden rounded-t-3xl border-t bg-gradient-to-b from-gray-50 to-white shadow-2xl transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom"
        >
          <SheetHeader className="mb-2 border-b bg-white px-4 py-2.5 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-2">
              <SheetTitle className="text-base font-bold text-gray-900 flex items-center gap-2 shrink-0">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                  <svg
                    className="h-3.5 w-3.5 text-white"
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

          <div className="flex-1 overflow-auto px-4 py-3">
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
              <div className="flex flex-col gap-3">
                <CampaignReportSummary
                  stats={data.stats}
                  onsite_funnel={data.onsite_funnel}
                  email_funnel={(data as any).email_funnel}
                />

                <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:shadow transition-shadow">
                  <div className="mb-2 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-100 to-orange-50 border border-orange-200">
                        <Hammer className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-900">
                          رسائل الحملة (Email / WhatsApp)
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
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
                        onClick={handleOpenSendEmails}
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

      {/* =================== بوب-أب إرسال الإيميلات =================== */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent
          className="!fixed !inset-0 !left-0 !top-0 !w-screen !h-screen !max-w-none !translate-x-0 !translate-y-0 !rounded-none p-0 overflow-hidden"
        >
          <DialogHeaderRoot className="px-5 py-3 border-b bg-gray-50">
            <DialogTitleRoot className="text-base font-semibold">
              إرسال الإيميلات للحملة
            </DialogTitleRoot>
            <DialogDescription className="text-[12px] text-gray-500">
              اختر قالب الإيميل، وشاهد شكله على اليسار قبل الإرسال.
            </DialogDescription>
          </DialogHeaderRoot>

          {/* عمودين: يسار معاينة كبيرة، يمين فورم صغير */}
          <div className="flex max-h-[75vh] overflow-hidden">
            {/* يسار: المعاينة — تاخذ أغلب العرض */}
            <div className="flex-1 bg-muted/40 p-4 overflow-y-auto flex justify-center">
              {selectedTemplate && campaign ? (
                <Card className="max-w-[430px] w-full border bg-white shadow-sm">
                  <CHeader>
                    <div className="text-[11px] text-muted-foreground mb-1">
                      من: offers@darb.com.sa
                    </div>
                    <CTitle className="text-sm font-semibold">
                      {applyPreviewTemplate(
                        selectedTemplate.subject_template,
                        buildPreviewCtx(campaign, previewLogoUrl),
                      )}
                    </CTitle>
                  </CHeader>
                  <CContent>
                    <div
                      className="rounded-md bg-white p-3 text-[12px] leading-relaxed"
                      dir="rtl"
                      dangerouslySetInnerHTML={{
                        __html: applyPreviewTemplate(
                          selectedTemplate.html_template,
                          buildPreviewCtx(campaign, previewLogoUrl),
                        ),
                      }}
                    />
                  </CContent>
                </Card>
              ) : (
                <div className="flex items-center justify-center text-[12px] text-gray-400">
                  اختر قالبًا من الجهة اليمنى لمشاهدة المعاينة.
                </div>
              )}
            </div>

            {/* يمين: اختيار القالب + معلومات الحملة — عرض أقل */}
            <div className="w-[320px] shrink-0 border-l bg-white p-4 text-[11px] overflow-y-auto">
              <div className="mb-4 space-y-1.5">
                <Label className="text-xs">اختر القالب</Label>
                {templatesLoading ? (
                  <p className="text-muted-foreground">جاري تحميل القوالب...</p>
                ) : templatesError ? (
                  <p className="text-destructive">{templatesError}</p>
                ) : templates.length === 0 ? (
                  <div className="space-y-2 mt-1">
                    <p>لا يوجد أي قالب بريد إلكتروني.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        (window.location.href =
                          "/dashboard/settings/templates")
                      }
                    >
                      الذهاب إلى صفحة القوالب
                    </Button>
                  </div>
                ) : (
                  <select
                    className="mt-1 h-8 w-full rounded-md border bg-white px-2 text-xs"
                    value={selectedTemplate?.id ?? ""}
                    onChange={handleTemplateChange}
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.is_default ? "(افتراضي)" : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="mb-4 space-y-1.5">
                <Label className="text-xs">معلومات الحملة</Label>
                {campaign ? (
                  <div className="mt-1 rounded-md border bg-gray-50 p-2">
                    <div className="font-semibold">
                      {campaign.product_title || "المنتج"}
                    </div>
                    <div className="mt-1 text-[11px] text-gray-600">
                      يبدأ: {campaign.starts_at}
                      <br />
                      ينتهي: {campaign.ends_at ?? "غير محدد"}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    لا توجد حملة محددة لعرض تفاصيلها.
                  </p>
                )}
              </div>

              <div className="space-y-1.5 text-gray-600">
                <Label className="text-xs">ملاحظات قبل الإرسال</Label>
                <ul className="mt-1 list-disc pr-4 space-y-1">
                  <li>
                    سيتم الإرسال لكل Target حالته pending في هذه الحملة.
                  </li>
                  <li>تأكد من شكل المعاينة على اليسار قبل الضغط على إرسال.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* أزرار أسفل البوب-أب */}
          <div className="flex items-center justify-end gap-2 border-t bg-gray-50 px-4 py-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEmailDialogOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmSendEmails}
              disabled={!selectedTemplate || sendingEmails}
            >
              {sendingEmails && (
                <Loader2 className="ml-1 h-3 w-3 animate-spin" />
              )}
              إرسال الحملة
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ================= Helpers للمعاينة ================= //

function buildPreviewCtx(
  campaign: CampaignSummary,
  logoUrl: string | null,
): Record<string, string> {
  return {
    product_title: campaign.product_title || "",
    product_image_url: (campaign as any).product_image_url || "",
    new_price: (campaign as any).new_price?.toString() ?? "",
    original_price: (campaign as any).original_price?.toString() ?? "",
    tracking_url: campaign.product_url || "#",
    store_name: "متجر درب",
    store_logo_url:
      logoUrl ||
      "https://dummyimage.com/140x40/111827/f9fafb&text=DARB+LOGO",
    coupon_code: (campaign as any).coupon_code ?? "",
    discount_percent: (campaign as any).discount_percent?.toString() ?? "",
    discount_type: (campaign as any).discount_type || "price",
    ends_at: campaign.ends_at ?? "",
  };
}

function applyPreviewTemplate(str: string, ctx: Record<string, string>) {
  let out = str || "";

  // شرط الكوبون في المعاينة
  out = out.replace(
    /{{#if_coupon}}([\s\S]*?){{\/if_coupon}}/g,
    ctx.discount_type === "coupon" && ctx.coupon_code ? "$1" : "",
  );

  for (const key of Object.keys(ctx)) {
    const re = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    out = out.replace(re, ctx[key] ?? "");
  }

  return out;
}
