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

type ScopeLevel = "brand" | "model" | "year";
type Audience = "public" | "targeted";
type CampaignType = "message" | "discount";

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

  const [scopeLevel, setScopeLevel] = useState<ScopeLevel>("model");
  const [scope, setScope] = useState<any>({ brand: null, model: null, year: null });

  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState<Audience>("public");
  const [type, setType] = useState<CampaignType>("message");

  // ✅ On-site: إجباري فقط للجمهور العام (public)، اختياري للمستهدف (targeted)
  const [sendOnsite, setSendOnsite] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);
  const [sendWhatsapp, setSendWhatsapp] = useState(false);

  // ✅ للمستهدف: الافتراضي زوار + عملاء (أفضل للـ On-site)
  const [onlyCustomers, setOnlyCustomers] = useState(false);
  const [lookbackDays, setLookbackDays] = useState(7);
  const [minSignals, setMinSignals] = useState(1);

  // ✅ فلتر صفحات العرض داخل المتجر (سطر لكل مسار)
  const [onsitePaths, setOnsitePaths] = useState<string>("");

  const isPublic = audience === "public";

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
      // ✅ public: On-site إجباري + منع email/whatsapp
      setSendOnsite(true);
      setSendEmail(false);
      setSendWhatsapp(false);
    }
    // targeted: لا نجبر on-site
  }

  async function submit() {
    if (!scopeReady) return;
    setSaving(true);
    try {
      const payload: any = {
        title: title.trim() || hint || "حملة سيارة",
        scope_level: scopeLevel,
        brand_id: scope.brand?.id ?? null,
        model_id: scope.model?.id ?? null,
        year_id: scope.year?.id ?? null,

        audience_mode: audience,
        campaign_type: type,

        // ✅ قواعد القنوات
        send_onsite: isPublic ? true : !!sendOnsite,
        send_email: isPublic ? false : !!sendEmail,
        send_whatsapp: isPublic ? false : !!sendWhatsapp,

        // ✅ targets فقط للمستهدف (والعام لا يستخدمها)
        only_customers: isPublic ? true : !!onlyCustomers,
        lookback_days: isPublic ? 7 : lookbackDays,
        min_signals: isPublic ? 1 : minSignals,

        // ✅ فلتر صفحات العرض داخل المتجر (اختياري)
        // سطر لكل مسار مثل: /category/VAwynW
        onsite_paths: onsitePaths.trim() ? onsitePaths.trim() : null,
      };

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
          <DialogTitle>إنشاء حملة سيارة</DialogTitle>
          <DialogDescription>
            (ملاحظة: On-site إجباري للجمهور العام فقط)
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left */}
          <div className="space-y-4">
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

            <div>
              <div className="text-sm font-medium mb-2">عنوان الحملة</div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={hint || "اكتب عنوانًا واضحًا للحملة"}
              />
            </div>
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
                  variant={!isPublic ? "default" : "secondary"}
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

              {/* ✅ public: إجباري + disabled */}
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

            {/* ✅ On-site paths (فلتر الصفحات) */}
            <div className="rounded-2xl border p-4 space-y-2">
              <div className="font-semibold">فلتر صفحات العرض داخل المتجر</div>
              <div className="text-xs text-muted-foreground">
                اكتب <span className="font-medium">مسار واحد لكل سطر</span>. إذا تركته فاضي، الحملة تطلع في كل الصفحات.
              </div>
              <textarea
                className="w-full min-h-[96px] rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={onsitePaths}
                onChange={(e) => setOnsitePaths(e.target.value)}
                placeholder={`/category/VAwynW
/products`}
              />
              <div className="text-xs text-muted-foreground">
                مثال: لو تبغاها على قسم محدد في سلة، غالبًا المسار يكون مثل <span className="font-mono">/category/VAwynW</span>.
              </div>
            </div>

            {/* Targeting */}
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
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={submit} disabled={!scopeReady || saving}>
            {saving ? "جاري الإنشاء..." : "إنشاء"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
