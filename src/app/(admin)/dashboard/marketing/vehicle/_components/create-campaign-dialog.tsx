// FILE: src/app/dashboard/marketing/vehicle/_components/create-campaign-dialog.tsx
"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { VehicleScopePicker } from "./vehicle-scope-picker";

type Audience = "public" | "targeted";
type CampaignType = "message" | "discount";
type ScopeLevel = "brand" | "model" | "year";

export function CreateCampaignDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState<Audience>("public");
  const [type, setType] = useState<CampaignType>("message");

  // ✅ قنوات
  const [sendOnsite, setSendOnsite] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);
  const [sendWhatsapp, setSendWhatsapp] = useState(false);

  // ✅ للمستهدف
  const [onlyCustomers, setOnlyCustomers] = useState(false);
  const [lookbackDays, setLookbackDays] = useState(7);
  const [minSignals, setMinSignals] = useState(1);

  // ✅ عام فقط: فلتر صفحات العرض داخل المتجر
  const [onsitePaths, setOnsitePaths] = useState<string>("");

  // ✅ مستهدف فقط: نطاق الإشارات
  const [scopeLevel, setScopeLevel] = useState<ScopeLevel>("model");
  const [scope, setScope] = useState<any>({ brand: null, model: null, year: null });

  const isPublic = audience === "public";
  const isTargeted = audience === "targeted";

  const scopeReady = useMemo(() => {
    if (!scope.brand?.id) return false;
    if (scopeLevel === "brand") return true;
    if (scopeLevel === "model") return !!scope.model?.id;
    return !!scope.model?.id && !!scope.year?.id;
  }, [scope, scopeLevel]);

  const hint = useMemo(() => {
    const b = scope.brand?.label;
    const m = scope.model?.label;
    const y = scope.year?.label;
    if (scopeLevel === "brand") return b || "";
    if (scopeLevel === "model") return [b, m].filter(Boolean).join(" / ");
    return [b, m, y].filter(Boolean).join(" / ");
  }, [scope, scopeLevel]);

  function setAudienceMode(v: Audience) {
    setAudience(v);

    if (v === "public") {
      // ✅ عام: On-site إجباري + منع email/whatsapp
      setSendOnsite(true);
      setSendEmail(false);
      setSendWhatsapp(false);
    }
  }

  const canSubmit = useMemo(() => {
    // ✅ عام: لازم onsite_paths
    if (isPublic) return !!onsitePaths.trim();
    // ✅ مستهدف: لازم scope جاهز (إشارات)
    return scopeReady;
  }, [isPublic, onsitePaths, scopeReady]);

  async function submit() {
    if (!canSubmit) return;

    setSaving(true);
    try {
      const payload: any = {
        title: title.trim() || (isTargeted ? (hint || "حملة مستهدفة") : "حملة داخل المتجر"),

        audience_mode: audience,
        campaign_type: type,

        // ✅ قواعد القنوات
        send_onsite: isPublic ? true : !!sendOnsite,
        send_email: isPublic ? false : !!sendEmail,
        send_whatsapp: isPublic ? false : !!sendWhatsapp,

        // ✅ إعدادات الاستهداف (للمستهدف فقط)
        only_customers: isPublic ? true : !!onlyCustomers,
        lookback_days: isPublic ? 7 : lookbackDays,
        min_signals: isPublic ? 1 : minSignals,
      };

      if (isPublic) {
        // ✅ عام: يعتمد على الرابط فقط
        payload.scope_level = "model"; // ثابت فقط عشان قيود الجدول
        payload.brand_id = null;
        payload.model_id = null;
        payload.year_id = null;

        payload.onsite_paths = onsitePaths.trim() ? onsitePaths.trim() : null;
      } else {
        // ✅ مستهدف: يعتمد على الإشارات (brand/model/year)
        payload.scope_level = scopeLevel;
        payload.brand_id = scope.brand?.id ?? null;
        payload.model_id = scope.model?.id ?? null;
        payload.year_id = scope.year?.id ?? null;

        // المستهدف ما نعتمد على onsite_paths
        payload.onsite_paths = null;
      }

      const res = await fetch("/api/dashboard/marketing/vehicle/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Create failed");

      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>إنشاء حملة</DialogTitle>
          <DialogDescription>
            {isPublic
              ? "الجمهور العام: تعتمد على رابط/مسار الصفحة (On-site فقط)."
              : "الجمهور المستهدف: يعتمد على إشارات السيارة (ماركة/موديل/سنة) ويمكن إرسال إيميل/واتساب."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left */}
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-2">عنوان الحملة</div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isTargeted ? (hint || "اكتب عنوانًا واضحًا للحملة") : "اكتب عنوانًا واضحًا للحملة"}
              />
            </div>

            {/* ✅ عام: فلتر صفحات */}
            {isPublic && (
              <div className="rounded-2xl border p-4 space-y-2">
                <div className="font-semibold">فلتر صفحات العرض داخل المتجر</div>
                <div className="text-xs text-muted-foreground">
                  اكتب <span className="font-medium">مسار واحد لكل سطر</span>. لازم تحط مسار/رابط واحد على الأقل.
                </div>
                <textarea
                  className="w-full min-h-[140px] rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  value={onsitePaths}
                  onChange={(e) => setOnsitePaths(e.target.value)}
                  placeholder={`https://darb.com.sa/category/VAwynW?filters[category_id]=1316078958
/category/VAwynW
/products`}
                />
                <div className="text-xs text-muted-foreground">
                  تقدر تحط رابط كامل أو مسار فقط. النظام يحوّل الرابط إلى مسار تلقائيًا (مثل{" "}
                  <span className="font-mono">/category/VAwynW</span>).
                </div>
              </div>
            )}

            {/* ✅ مستهدف: نطاق الإشارات */}
            {isTargeted && (
              <div className="rounded-2xl border p-4 space-y-3">
                <div className="font-semibold">نطاق الاستهداف (حسب إشارات السيارة)</div>

                <div>
                  <div className="text-sm font-medium mb-2">مستوى النطاق</div>
                  <div className="flex flex-wrap gap-2">
                    {(["brand", "model", "year"] as ScopeLevel[]).map((s) => (
                      <Button
                        key={s}
                        type="button"
                        variant={scopeLevel === s ? "default" : "secondary"}
                        onClick={() => {
                          setScopeLevel(s);
                          setScope((prev: any) => ({ ...prev, year: null }));
                        }}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>

                <VehicleScopePicker scopeLevel={scopeLevel} value={scope} onChange={setScope} />

                <div className="text-xs text-muted-foreground">
                  هذا الاستهداف يعتمد على <b>visitor_vehicle_signals</b> (مو على الرابط).
                </div>
              </div>
            )}
          </div>

          {/* Right */}
          <div className="space-y-4">
            {/* Audience */}
            <div className="rounded-2xl border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">الجمهور</div>
                <Badge variant={audience === "targeted" ? "default" : "secondary"}>
                  {isPublic ? "عام" : "مستهدف"}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={isPublic ? "default" : "secondary"}
                  onClick={() => setAudienceMode("public")}
                >
                  عام
                </Button>
                <Button
                  type="button"
                  variant={isTargeted ? "default" : "secondary"}
                  onClick={() => setAudienceMode("targeted")}
                >
                  مستهدف
                </Button>
              </div>
            </div>

            {/* Campaign Type */}
            <div className="rounded-2xl border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">نوع الحملة</div>
                <Badge variant={type === "discount" ? "default" : "secondary"}>
                  {type === "discount" ? "خصم" : "رسالة"}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={type === "message" ? "default" : "secondary"}
                  onClick={() => setType("message")}
                >
                  رسالة
                </Button>
                <Button
                  type="button"
                  variant={type === "discount" ? "default" : "secondary"}
                  onClick={() => setType("discount")}
                >
                  خصم
                </Button>
              </div>
            </div>

            {/* Channels */}
            <div className="rounded-2xl border p-4 space-y-3">
              <div className="font-semibold">قنوات الإرسال</div>

              {/* ✅ عام: On-site إجباري */}
              {isPublic ? (
                <div className="flex items-center justify-between text-sm">
                  <span>إظهار داخل المتجر (On-site) — إجباري للجمهور العام</span>
                  <Switch checked={true} onCheckedChange={() => {}} disabled />
                </div>
              ) : (
                <div className="flex items-center justify-between text-sm">
                  <span>إظهار داخل المتجر (On-site)</span>
                  <Switch checked={sendOnsite} onCheckedChange={setSendOnsite} />
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span>إرسال إيميل</span>
                <Switch checked={sendEmail} onCheckedChange={setSendEmail} disabled={isPublic} />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span>إرسال واتساب</span>
                <Switch checked={sendWhatsapp} onCheckedChange={setSendWhatsapp} disabled={isPublic} />
              </div>

              {isPublic && (
                <div className="text-xs text-muted-foreground">
                  الإيميل/الواتساب للجمهور المستهدف فقط.
                </div>
              )}
            </div>

            {/* Targeting settings (targeted only) */}
            {isPublic ? (
              <div className="rounded-2xl border p-4 text-sm text-muted-foreground">
                الجمهور العام لا يستخدم Targets.
              </div>
            ) : (
              <div className="rounded-2xl border p-4 space-y-3">
                <div className="font-semibold">إعدادات الاستهداف</div>

                <div className="flex items-center justify-between text-sm">
                  <span>عملاء مسجلين فقط</span>
                  <Switch checked={onlyCustomers} onCheckedChange={setOnlyCustomers} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Lookback days</div>
                    <Input
                      type="number"
                      value={lookbackDays}
                      onChange={(e) => setLookbackDays(Number(e.target.value || 7))}
                    />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Min signals</div>
                    <Input
                      type="number"
                      value={minSignals}
                      onChange={(e) => setMinSignals(Number(e.target.value || 1))}
                    />
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  ملاحظة: الإيميل/الواتساب يحتاجون بيانات تواصل، فإذا فعلتهم والنظام يقدر يجبر “عملاء فقط” تلقائيًا من الخلف.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={submit} disabled={!canSubmit || saving}>
            {saving ? "جاري الإنشاء..." : "إنشاء"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
