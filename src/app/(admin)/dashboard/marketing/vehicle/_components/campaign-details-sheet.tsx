// FILE: src/app/dashboard/marketing/vehicle/_components/campaign-details-sheet.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TargetsTable } from "./targets-table";

function fmt(dt?: string | null) {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleString("ar-SA");
  } catch {
    return dt;
  }
}

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  active: "نشطة",
  paused: "موقوفة مؤقتًا",
  finished: "منتهية",
  cancelled: "ملغية",
};
const STATUS_ORDER = ["draft", "active", "paused", "finished", "cancelled"] as const;

const AUDIENCE_LABELS: Record<string, string> = { public: "عام", targeted: "مستهدف" };
const TYPE_LABELS: Record<string, string> = { message: "رسالة", discount: "خصم" };
const SCOPE_LABELS: Record<string, string> = { brand: "ماركة", model: "موديل", year: "سنة" };

function statusPillClass(status: string) {
  switch (status) {
    case "active":
      return "bg-green-600 text-white border-green-600";
    case "draft":
      return "bg-slate-700 text-white border-slate-700";
    case "paused":
      return "bg-amber-500 text-white border-amber-500";
    case "finished":
      return "bg-blue-600 text-white border-blue-600";
    case "cancelled":
      return "bg-red-600 text-white border-red-600";
    default:
      return "bg-gray-200 text-gray-900 border-gray-200";
  }
}

export function CampaignDetailsSheet({
  campaignId,
  open,
  onOpenChange,
  onChanged,
}: {
  campaignId: number | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onChanged: () => void;
}) {
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyRefresh, setBusyRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<string>("draft");
  const [sendOnsite, setSendOnsite] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [sendWhatsapp, setSendWhatsapp] = useState(false);

  const [onlyCustomers, setOnlyCustomers] = useState(false);
  const [lookbackDays, setLookbackDays] = useState(7);
  const [minSignals, setMinSignals] = useState(1);

  // ✅ جديد: فلتر صفحات العرض داخل المتجر
  const [onsitePaths, setOnsitePaths] = useState<string>("");

  const targeted = useMemo(() => item?.audience_mode === "targeted", [item]);

  // ✅ قفل منطقي: لو Email/WhatsApp ON => لازم عملاء فقط
  const needsCustomerOnly = useMemo(() => !!sendEmail || !!sendWhatsapp, [sendEmail, sendWhatsapp]);

  useEffect(() => {
    if (!targeted) return;
    if (needsCustomerOnly && !onlyCustomers) {
      setOnlyCustomers(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsCustomerOnly, targeted]);

  async function load() {
    if (!campaignId) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/marketing/vehicle/campaigns/${campaignId}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load");

      setItem(json.item);

      // hydrate form
      setTitle(json.item.title ?? "");
      setStatus(json.item.status ?? "draft");
      setSendOnsite(!!json.item.send_onsite);
      setSendEmail(!!json.item.send_email);
      setSendWhatsapp(!!json.item.send_whatsapp);

      setOnlyCustomers(!!json.item.only_customers);
      setLookbackDays(Number(json.item.lookback_days ?? 7));
      setMinSignals(Number(json.item.min_signals ?? 1));

      // ✅ جديد
      setOnsitePaths(String(json.item.onsite_paths ?? "").trim());
    } catch (e: any) {
      setError(e?.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open || !campaignId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campaignId]);

  async function refreshTargets() {
    if (!campaignId) return;
    setBusyRefresh(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/dashboard/marketing/vehicle/campaigns/${campaignId}/refresh-targets`,
        { method: "POST" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "فشل تحديث المستهدفين");

      await load();
      onChanged();
    } catch (e: any) {
      setError(e?.message || "فشل تحديث المستهدفين");
    } finally {
      setBusyRefresh(false);
    }
  }

  // ✅ حفظ + تحديث تلقائي عند تغيير الاستهداف
  async function save() {
    if (!campaignId) return;

    const prev = item
      ? {
          only_customers: !!item.only_customers,
          lookback_days: Number(item.lookback_days ?? 7),
          min_signals: Number(item.min_signals ?? 1),
          onsite_paths: String(item.onsite_paths ?? "").trim(),
        }
      : null;

    setSaving(true);
    setError(null);

    try {
      const payload: any = {
        title,
        status,
        send_onsite: sendOnsite,
        send_email: sendEmail,
        send_whatsapp: sendWhatsapp,

        // ✅ جديد: فلتر صفحات العرض داخل المتجر
        onsite_paths: onsitePaths.trim() ? onsitePaths.trim() : null,
      };

      if (targeted) {
        payload.only_customers = needsCustomerOnly ? true : !!onlyCustomers; // ✅ القفل
        payload.lookback_days = lookbackDays;
        payload.min_signals = minSignals;
      }

      const res = await fetch(`/api/dashboard/marketing/vehicle/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Save failed");

      await load();
      onChanged();

      if (targeted && prev) {
        const newOnlyCustomers = needsCustomerOnly ? true : !!onlyCustomers;
        const targetingChanged =
          prev.only_customers !== newOnlyCustomers ||
          prev.lookback_days !== lookbackDays ||
          prev.min_signals !== minSignals;

        // ✅ إذا تغيّر الاستهداف نحدّث targets
        if (targetingChanged) {
          await refreshTargets();
        }
      }
    } catch (e: any) {
      setError(e?.message || "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="!w-screen !max-w-none !h-screen !rounded-none overflow-y-auto p-0"
      >
        <div className="mx-auto w-full max-w-6xl px-6 py-6">
          <SheetHeader>
            <SheetTitle>تعديل الحملة</SheetTitle>
            <SheetDescription>
              ملاحظة: عند تفعيل (إيميل/واتساب) يتم قفل “عملاء مسجلين فقط” تلقائيًا.
            </SheetDescription>
          </SheetHeader>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="mt-6 text-sm text-muted-foreground">تحميل...</div>
          ) : !item ? (
            <div className="mt-6 text-sm text-muted-foreground">—</div>
          ) : (
            <div className="mt-6 space-y-6">
              {/* Meta */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {SCOPE_LABELS[item.scope_level] ?? item.scope_level}
                </Badge>
                <Badge variant={item.audience_mode === "targeted" ? "default" : "outline"}>
                  {AUDIENCE_LABELS[item.audience_mode] ?? item.audience_mode}
                </Badge>
                <Badge variant={item.campaign_type === "discount" ? "default" : "outline"}>
                  {TYPE_LABELS[item.campaign_type] ?? item.campaign_type}
                </Badge>
                <span
                  className={[
                    "inline-flex items-center rounded-full px-3 py-1 text-xs border",
                    statusPillClass(item.status),
                  ].join(" ")}
                >
                  {STATUS_LABELS[item.status] ?? item.status}
                </span>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <div className="text-sm font-medium">عنوان الحملة</div>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                <div className="text-xs text-muted-foreground">
                  يبدأ: <b>{fmt(item.starts_at)}</b>
                  {item.ends_at ? (
                    <>
                      {" "}
                      • ينتهي: <b>{fmt(item.ends_at)}</b>
                    </>
                  ) : null}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <div className="text-sm font-medium">الحالة</div>
                <ToggleGroup
                  type="single"
                  value={status}
                  onValueChange={(v) => v && setStatus(v)}
                  className="flex flex-wrap gap-2"
                >
                  {STATUS_ORDER.map((s) => (
                    <ToggleGroupItem
                      key={s}
                      value={s}
                      className={[
                        "rounded-xl px-4 py-2 text-sm border transition",
                        "data-[state=off]:bg-muted/40 data-[state=off]:text-foreground data-[state=off]:border-border",
                        "hover:data-[state=off]:bg-muted",
                        s === "active" &&
                          "data-[state=on]:bg-green-600 data-[state=on]:border-green-600 data-[state=on]:text-white",
                        s === "draft" &&
                          "data-[state=on]:bg-slate-700 data-[state=on]:border-slate-700 data-[state=on]:text-white",
                        s === "paused" &&
                          "data-[state=on]:bg-amber-500 data-[state=on]:border-amber-500 data-[state=on]:text-white",
                        s === "finished" &&
                          "data-[state=on]:bg-blue-600 data-[state=on]:border-blue-600 data-[state=on]:text-white",
                        s === "cancelled" &&
                          "data-[state=on]:bg-red-600 data-[state=on]:border-red-600 data-[state=on]:text-white",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {STATUS_LABELS[s]}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              {/* Channels */}
              <div className="rounded-2xl border p-4 space-y-3">
                <div className="font-semibold">قنوات الإرسال</div>
                <div className="flex items-center justify-between text-sm">
                  <span>إظهار داخل المتجر (On-site)</span>
                  <Switch checked={sendOnsite} onCheckedChange={setSendOnsite} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>إرسال إيميل</span>
                  <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>إرسال واتساب</span>
                  <Switch checked={sendWhatsapp} onCheckedChange={setSendWhatsapp} />
                </div>
                {needsCustomerOnly && (
                  <div className="text-xs text-muted-foreground">
                    بما أن الإيميل/الواتساب مفعّل، سيتم استهداف <b>العملاء المسجلين فقط</b>.
                  </div>
                )}
              </div>

              {/* ✅ On-site Paths */}
              <div className="rounded-2xl border p-4 space-y-2">
                <div className="font-semibold">فلتر صفحات العرض داخل المتجر</div>
                <div className="text-xs text-muted-foreground">
                  اكتب <b>مسار واحد لكل سطر</b>. إذا تركته فاضي، الحملة تطلع في كل الصفحات.
                </div>
                <textarea
                  className="w-full min-h-[96px] rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  value={onsitePaths}
                  onChange={(e) => setOnsitePaths(e.target.value)}
                  placeholder={`/category/VAwynW
/products`}
                />
              </div>

              {/* Targeting */}
              {targeted ? (
                <div className="rounded-2xl border p-4 space-y-3">
                  <div className="font-semibold">إعدادات الاستهداف</div>

                  <div className="flex items-center justify-between text-sm">
                    <span>عملاء مسجلين فقط</span>
                    <Switch
                      checked={needsCustomerOnly ? true : onlyCustomers}
                      onCheckedChange={(v) => setOnlyCustomers(v)}
                      disabled={needsCustomerOnly} // ✅ قفل
                    />
                  </div>

                  <div className="text-xs text-muted-foreground">
                    الوضع الحالي:{" "}
                    <b>{(needsCustomerOnly ? true : onlyCustomers) ? "عملاء فقط" : "زوار + عملاء"}</b>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        عدد الأيام (Lookback)
                      </div>
                      <Input
                        type="number"
                        value={lookbackDays}
                        onChange={(e) => setLookbackDays(Number(e.target.value || 7))}
                      />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        أقل إشارات (Min signals)
                      </div>
                      <Input
                        type="number"
                        value={minSignals}
                        onChange={(e) => setMinSignals(Number(e.target.value || 1))}
                      />
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    آخر تحديث: <b>{fmt(item.targets_last_refreshed_at)}</b> • أُضيف آخر تحديث:{" "}
                    <b>{item.targets_last_refreshed_count ?? 0}</b>
                  </div>

                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={refreshTargets}
                    disabled={busyRefresh}
                  >
                    {busyRefresh ? "جاري التحديث..." : "تحديث المستهدفين الآن"}
                  </Button>
                </div>
              ) : (
                <div className="rounded-2xl border p-4 text-sm text-muted-foreground">
                  الجمهور العام لا يستخدم مستهدفين.
                </div>
              )}

              {/* Targets */}
              {targeted && (
                <TargetsTable
                  campaignId={item.id}
                  showOnlyCustomers={needsCustomerOnly ? true : onlyCustomers}
                />
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => onOpenChange(false)}>
                  إغلاق
                </Button>
                <Button onClick={save} disabled={saving}>
                  {saving ? "جاري الحفظ..." : "حفظ التعديل"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
