// FILE: src/app/(admin)/dashboard/settings/email/page.tsx

"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

type EmailSettings = {
  store_id: string;
  from_name: string | null;
  from_email: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_username: string | null;
  smtp_password: string | null; // "********" في الرد
  use_tls: boolean;
};

export default function EmailSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState<EmailSettings | null>(null);
  const [passwordInput, setPasswordInput] = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/dashboard/email/settings");
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "FAILED_TO_LOAD_EMAIL_SETTINGS");
        }
        setForm(json as EmailSettings);
        setPasswordInput("");
      } catch (e: any) {
        console.error(e);
        setError(e.message || "حدث خطأ أثناء جلب إعدادات الإيميل");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function updateField<K extends keyof EmailSettings>(key: K, value: EmailSettings[K]) {
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
        from_name: form.from_name,
        from_email: form.from_email,
        smtp_host: form.smtp_host,
        smtp_port: form.smtp_port ? Number(form.smtp_port) : null,
        smtp_username: form.smtp_username,
        use_tls: form.use_tls,
      };

      if (passwordInput.trim()) {
        payload.smtp_password = passwordInput.trim();
      } else if (form.smtp_password === "********") {
        payload.smtp_password = "********";
      }

      const res = await fetch("/api/dashboard/email/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json.error || "FAILED_TO_SAVE_EMAIL_SETTINGS");
      }

      setSaved(true);
      setPasswordInput("");
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "حدث خطأ أثناء حفظ إعدادات الإيميل");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!form) return;
    try {
      setTesting(true);
      setError(null);
      const res = await fetch("/api/dashboard/email/test", {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "FAILED_TO_SEND_TEST_EMAIL");
      }
      alert("تم إرسال إيميل الاختبار (تحقق من بريدك).");
    } catch (e: any) {
      console.error(e);
      alert(e.message || "حدث خطأ أثناء إرسال إيميل الاختبار");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">إعدادات البريد الإلكتروني</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ضبط إعدادات SMTP لإرسال حملات Price Drop عبر الإيميل لعملائك.
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
            <h2 className="text-sm font-medium">معلومات المرسل</h2>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="from_name">اسم المرسل</Label>
                <Input
                  id="from_name"
                  value={form.from_name ?? ""}
                  onChange={(e) => updateField("from_name", e.target.value || null)}
                  placeholder="مثال: عروض درب لقطع الغيار"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="from_email">بريد المرسل</Label>
                <Input
                  id="from_email"
                  type="email"
                  value={form.from_email ?? ""}
                  onChange={(e) => updateField("from_email", e.target.value || null)}
                  placeholder="offers@darb.com.sa"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border bg-card p-4">
            <h2 className="text-sm font-medium">إعدادات SMTP</h2>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="smtp_host">SMTP Host</Label>
                <Input
                  id="smtp_host"
                  value={form.smtp_host ?? ""}
                  onChange={(e) => updateField("smtp_host", e.target.value || null)}
                  placeholder="smtp.resend.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="smtp_port">SMTP Port</Label>
                <Input
                  id="smtp_port"
                  type="number"
                  value={form.smtp_port ?? ""}
                  onChange={(e) =>
                    updateField(
                      "smtp_port",
                      e.target.value ? Number(e.target.value) : (null as any),
                    )
                  }
                  placeholder="587"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="smtp_username">SMTP Username</Label>
                <Input
                  id="smtp_username"
                  value={form.smtp_username ?? ""}
                  onChange={(e) =>
                    updateField("smtp_username", e.target.value || null)
                  }
                  placeholder="resend"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="smtp_password">SMTP Password / API Key</Label>
                <Input
                  id="smtp_password"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder={form.smtp_password ? "********" : "كلمة المرور أو API Key"}
                />
                {form.smtp_password && (
                  <p className="text-[10px] text-muted-foreground">
                    اترك الحقل فارغًا إذا لا تريد تغيير كلمة المرور الحالية.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label htmlFor="use_tls">استخدام TLS</Label>
                <p className="text-[11px] text-muted-foreground">
                  يفضّل تركها مفعّلة إلا إذا مزوّد البريد يتطلب غير ذلك.
                </p>
              </div>
              <Switch
                id="use_tls"
                checked={form.use_tls}
                onCheckedChange={(val) => updateField("use_tls", val)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={
                testing ||
                saving ||
                !form.from_email ||
                !form.smtp_host ||
                !form.smtp_port ||
                !form.smtp_username
              }
              onClick={handleTest}
            >
              {testing ? "جارٍ إرسال الاختبار..." : "اختبار الإرسال"}
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
