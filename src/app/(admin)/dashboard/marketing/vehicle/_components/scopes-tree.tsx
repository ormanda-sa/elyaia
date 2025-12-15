// FILE: src/app/dashboard/marketing/vehicle/_components/create-campaign-dialog.tsx
"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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

  const [sendOnsite, setSendOnsite] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);
  const [sendWhatsapp, setSendWhatsapp] = useState(false);

  const [onlyCustomers, setOnlyCustomers] = useState(true);
  const [lookbackDays, setLookbackDays] = useState(7);
  const [minSignals, setMinSignals] = useState(1);

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
    if (scopeLevel === "model") return [b, m].filter(Boolean).join(" ");
    return [b, m, y].filter(Boolean).join(" ");
  }, [scope, scopeLevel]);

  async function submit() {
    if (!scopeReady) return;
    setSaving(true);
    try {
      const payload: any = {
        title: title.trim() || `حملة: ${hint}`,
        scope_level: scopeLevel,
        brand_id: scope.brand?.id ?? null,
        model_id: scope.model?.id ?? null,
        year_id: scope.year?.id ?? null,
        audience_mode: audience,
        campaign_type: type,
        send_onsite: sendOnsite,
        send_email: sendEmail,
        send_whatsapp: sendWhatsapp,
        only_customers: onlyCustomers,
        lookback_days: lookbackDays,
        min_signals: minSignals,
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

  const disableTargeting = audience !== "targeted";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>إنشاء حملة سيارة</DialogTitle>
          <DialogDescription>
            اختر نطاق الحملة، الجمهور، نوع العرض، والقنوات. (مستهدف = Hybrid Refresh Targets)
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
                      setScope({ ...scope, year: null });
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
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`مثال: عرض ${hint}`} />
            </div>
          </div>

          {/* Right */}
          <div className="space-y-4">
            <div className="rounded-2xl border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">الجمهور</div>
                <Badge variant={audience === "targeted" ? "default" : "secondary"}>{audience}</Badge>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant={audience === "public" ? "default" : "secondary"} onClick={() => setAudience("public")}>
                  عام
                </Button>
                <Button type="button" variant={audience === "targeted" ? "default" : "secondary"} onClick={() => setAudience("targeted")}>
                  مستهدف
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">نوع الحملة</div>
                <Badge variant={type === "discount" ? "default" : "secondary"}>{type}</Badge>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant={type === "message" ? "default" : "secondary"} onClick={() => setType("message")}>
                  رسالة
                </Button>
                <Button type="button" variant={type === "discount" ? "default" : "secondary"} onClick={() => setType("discount")}>
                  خصم
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border p-4 space-y-3">
              <div className="font-semibold">قنوات الإرسال</div>
              <div className="flex items-center justify-between text-sm">
                <span>On-site</span>
                <Switch checked={sendOnsite} onCheckedChange={setSendOnsite} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Email</span>
                <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>WhatsApp</span>
                <Switch checked={sendWhatsapp} onCheckedChange={setSendWhatsapp} />
              </div>
            </div>

            <div className="rounded-2xl border p-4 space-y-3">
              <div className="font-semibold">إعدادات الاستهداف</div>

              <div className="flex items-center justify-between text-sm">
                <span>عملاء مسجلين فقط</span>
                <Switch checked={onlyCustomers} onCheckedChange={setOnlyCustomers} disabled={disableTargeting} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Lookback days</div>
                  <Input
                    type="number"
                    value={lookbackDays}
                    onChange={(e) => setLookbackDays(Number(e.target.value || 7))}
                    disabled={disableTargeting}
                  />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Min signals</div>
                  <Input
                    type="number"
                    value={minSignals}
                    onChange={(e) => setMinSignals(Number(e.target.value || 1))}
                    disabled={disableTargeting}
                  />
                </div>
              </div>

              {disableTargeting && (
                <div className="text-xs text-muted-foreground">
                  الجمهور العام لا يحتاج Targets. (الظهور داخل المتجر يعتمد على صفحات النطاق)
                </div>
              )}
            </div>
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
