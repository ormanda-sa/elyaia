"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type MetaData = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  bio?: string;
};

type UserMetaCardProps = {
  data: MetaData;
  onUpdated: (meta: MetaData) => void;
};

export function UserMetaCard({ data, onUpdated }: UserMetaCardProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<MetaData>(data);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange<K extends keyof MetaData>(
    key: K,
    value: MetaData[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/profile/meta", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "فشل حفظ المعلومات الشخصية");
      }

      onUpdated(form);
      setOpen(false);
    } catch (err: any) {
      console.error("meta save error:", err);
      setError(err.message || "خطأ غير متوقع");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card className="rounded-2xl border px-4 py-4 sm:px-6 sm:py-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-slate-900">
            المعلومات الشخصية
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full px-3 text-[11px]"
            onClick={() => {
              setForm(data);
              setOpen(true);
            }}
          >
            تعديل
          </Button>
        </div>

        <div className="grid gap-4 text-[11px] text-slate-600 sm:grid-cols-2 sm:text-xs">
          <div className="space-y-1">
            <div className="font-semibold text-slate-500">الاسم الأول</div>
            <div className="text-slate-900">{data.firstName || "—"}</div>
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-slate-500">اسم العائلة</div>
            <div className="text-slate-900">{data.lastName || "—"}</div>
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-slate-500">
              البريد الإلكتروني
            </div>
            <div className="text-slate-900 break-all">{data.email || "—"}</div>
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-slate-500">رقم الجوال</div>
            <div className="text-slate-900">{data.phone || "—"}</div>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <div className="font-semibold text-slate-500">نبذة قصيرة</div>
            <div className="text-slate-900 whitespace-pre-line">
              {data.bio || "لم يتم إضافة نبذة بعد."}
            </div>
          </div>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-right text-sm">
              تعديل المعلومات الشخصية
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-[11px] text-slate-700">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-right text-[11px]">
                  الاسم الأول
                </label>
                <Input
                  value={form.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  className="h-8 text-[11px]"
                />
              </div>
              <div>
                <label className="mb-1 block text-right text-[11px]">
                  اسم العائلة
                </label>
                <Input
                  value={form.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  className="h-8 text-[11px]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-right text-[11px]">
                البريد الإلكتروني
              </label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="h-8 text-[11px]"
              />
            </div>

            <div>
              <label className="mb-1 block text-right text-[11px]">
                رقم الجوال
              </label>
              <Input
                value={form.phone || ""}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="h-8 text-[11px]"
              />
            </div>

            <div>
              <label className="mb-1 block text-right text-[11px]">
                نبذة قصيرة
              </label>
              <textarea
                value={form.bio || ""}
                onChange={(e) => handleChange("bio", e.target.value)}
                rows={4}
                className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-normal focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            {error && (
              <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex justify-between gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full px-3 text-[11px]"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                إلغاء
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-full px-3 text-[11px]"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
