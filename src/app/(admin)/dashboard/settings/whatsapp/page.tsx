// FILE: src/app/(admin)/dashboard/settings/whatsapp/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type WhatsappSettings = {
  store_id: string;
  provider: string;
  from_number: string | null;
  api_url: string | null;
  api_key: string | null; // "********" في الرد
};

export default function WhatsappSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState<WhatsappSettings | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/dashboard/whatsapp/settings");
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "FAILED_TO_LOAD_WHATSAPP_SETTINGS");
        }
        setForm(json as WhatsappSettings);
        setApiKeyInput("");
      } catch (e: any) {
        console.error(e);
        setError(e.message || "حدث خطأ أثناء جلب إعدادات الواتساب");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function updateField<K extends keyof WhatsappSettings>(
    key: K,
    value: WhatsappSettings[K],
  ) {
    if (!form) return;
    setForm({ ...form, [key]: value });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;

    try {
      setSaving(true);
      setError(null);
      setSaved(false);

      const payload: any = {
        provider: form.provider,
        from_number: form.from_number,
        api_url: form.api_url,
      };

      if (apiKeyInput.trim()) {
        payload.api_key = apiKeyInput.trim();
      } else if (form.api_key === "********") {
        payload.api_key = "********";
      }

      const res = await fetch("/api/dashboard/whatsapp/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json.error || "FAILED_TO_SAVE_WHATSAPP_SETTINGS");
      }

      setSaved(true);
      setApiKeyInput("");
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "حدث خطأ أثناء حفظ إعدادات الواتساب");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">إعدادات الواتساب</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ضبط إعدادات مزوّد الواتساب لإرسال حملات Price Drop عبر الواتساب لعملائك.
        </p>
      </div>

      {loading && (
        <div className="text-sm text-muted-foreground">جاري تحميل الإعدادات...</div>
      )}

      {!loading && error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && form && (
        <form onSubmit={handleSave} className="space-y-6 max-w-xl">
          <div className="space-y-4 rounded-lg border bg-card p-4">
            <h2 className="text-sm font-medium">بيانات المزوّد</h2>

            <div className="space-y-1.5">
              <Label htmlFor="provider">مزود الخدمة</Label>
              <Input
                id="provider"
                value={form.provider}
                onChange={(e) => updateField("provider", e.target.value)}
                placeholder="generic / ultramsg / twilio ..."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="from_number">رقم الإرسال (From)</Label>
              <Input
                id="from_number"
                value={form.from_number ?? ""}
                onChange={(e) =>
                  updateField("from_number", e.target.value || null)
                }
                placeholder="+9665XXXXXXXX"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="api_url">API URL</Label>
              <Input
                id="api_url"
                value={form.api_url ?? ""}
                onChange={(e) =>
                  updateField("api_url", e.target.value || null)
                }
                placeholder="https://api.example.com/send-whatsapp"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="api_key">API Key / Token</Label>
              <Input
                id="api_key"
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={form.api_key ? "********" : "API Key من مزود الخدمة"}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
            </Button>
            {saved && (
              <span className="text-xs text-emerald-600">تم الحفظ بنجاح ✅</span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
