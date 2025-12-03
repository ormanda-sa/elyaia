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

type AddressData = {
  country?: string;
  city?: string;
  street?: string;
  postalCode?: string;
  taxId?: string;
};

type UserAddressCardProps = {
  data: AddressData;
  onUpdated: (address: AddressData) => void;
};

export function UserAddressCard({ data, onUpdated }: UserAddressCardProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AddressData>(data);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange<K extends keyof AddressData>(
    key: K,
    value: AddressData[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/profile/address", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "فشل حفظ العنوان");
      }
      onUpdated(form);
      setOpen(false);
    } catch (err: any) {
      console.error("address save error:", err);
      setError(err.message || "خطأ غير متوقع");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card className="rounded-2xl border px-4 py-4 sm:px-6 sm:py-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-slate-900">العنوان</div>
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
            <div className="font-semibold text-slate-500">الدولة</div>
            <div className="text-slate-900">{data.country || "—"}</div>
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-slate-500">
              المدينة / المنطقة
            </div>
            <div className="text-slate-900">{data.city || "—"}</div>
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-slate-500">
              الشارع / التفاصيل
            </div>
            <div className="text-slate-900">{data.street || "—"}</div>
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-slate-500">الرمز البريدي</div>
            <div className="text-slate-900">{data.postalCode || "—"}</div>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <div className="font-semibold text-slate-500">الرقم الضريبي</div>
            <div className="text-slate-900">{data.taxId || "—"}</div>
          </div>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-right text-sm">
              تعديل العنوان
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-[11px] text-slate-700">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-right text-[11px]">
                  الدولة
                </label>
                <Input
                  value={form.country || ""}
                  onChange={(e) => handleChange("country", e.target.value)}
                  className="h-8 text-[11px]"
                />
              </div>
              <div>
                <label className="mb-1 block text-right text-[11px]">
                  المدينة / المنطقة
                </label>
                <Input
                  value={form.city || ""}
                  onChange={(e) => handleChange("city", e.target.value)}
                  className="h-8 text-[11px]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-right text-[11px]">
                الشارع / التفاصيل
              </label>
              <Input
                value={form.street || ""}
                onChange={(e) => handleChange("street", e.target.value)}
                className="h-8 text-[11px]"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-right text-[11px]">
                  الرمز البريدي
                </label>
                <Input
                  value={form.postalCode || ""}
                  onChange={(e) => handleChange("postalCode", e.target.value)}
                  className="h-8 text-[11px]"
                />
              </div>
              <div>
                <label className="mb-1 block text-right text-[11px]">
                  الرقم الضريبي
                </label>
                <Input
                  value={form.taxId || ""}
                  onChange={(e) => handleChange("taxId", e.target.value)}
                  className="h-8 text-[11px]"
                />
              </div>
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
