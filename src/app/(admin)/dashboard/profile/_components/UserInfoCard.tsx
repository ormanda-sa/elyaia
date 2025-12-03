"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type BasicData = {
  fullName: string;
  role: string;
  location?: string;
  email?: string;
  avatarUrl?: string | null;
};

type UserInfoCardProps = {
  data: BasicData;
  onUpdated: (basic: BasicData) => void;
};

export function UserInfoCard({ data, onUpdated }: UserInfoCardProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BasicData>(data);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const initials = (data.fullName || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  function handleChange<K extends keyof BasicData>(
    key: K,
    value: BasicData[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/profile/basic", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "فشل حفظ بيانات الحساب");
      }
      onUpdated(form);
      setOpen(false);
    } catch (err: any) {
      console.error("basic save error:", err);
      setError(err.message || "خطأ غير متوقع");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/dashboard/profile/avatar", {
        method: "PUT",
        body: formData,
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "فشل رفع الصورة");
      }

      const newUrl = json.avatarUrl as string;
      onUpdated({ ...data, avatarUrl: newUrl });
    } catch (err: any) {
      console.error("avatar upload error:", err);
      setError(err.message || "فشل رفع الصورة");
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <>
      <Card className="flex flex-col items-start justify-between gap-4 rounded-2xl border px-4 py-4 sm:flex-row sm:items-center sm:px-6 sm:py-5">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative h-14 w-14 sm:h-16 sm:w-16">
            {data.avatarUrl ? (
              <Image
                src={data.avatarUrl}
                alt={data.fullName}
                fill
                className="rounded-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
                {initials}
              </div>
            )}

            {/* زر صغير لتغيير الصورة */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[10px] shadow ring-1 ring-slate-200"
            >
              {avatarUploading ? "..." : "تعديل"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="space-y-0.5 text-right">
            <div className="text-sm font-semibold text-slate-900 sm:text-base">
              {data.fullName}
            </div>
            <div className="text-[11px] text-slate-500 sm:text-xs">
              {data.role}
              {data.location && (
                <>
                  {" "}
                  • <span className="text-slate-400">{data.location}</span>
                </>
              )}
            </div>
            {data.email && (
              <div className="text-[11px] text-slate-500 sm:text-xs">
                {data.email}
              </div>
            )}
          </div>
        </div>

        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
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
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-right text-sm">
              تعديل بيانات الحساب
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-[11px] text-slate-700">
            <div>
              <label className="mb-1 block text-right text-[11px]">
                الاسم الكامل
              </label>
              <Input
                value={form.fullName}
                onChange={(e) => handleChange("fullName", e.target.value)}
                className="h-8 text-[11px]"
              />
            </div>
            <div>
              <label className="mb-1 block text-right text-[11px]">
                المسمى الوظيفي / الدور
              </label>
              <Input
                value={form.role}
                onChange={(e) => handleChange("role", e.target.value)}
                className="h-8 text-[11px]"
              />
            </div>
            <div>
              <label className="mb-1 block text-right text-[11px]">
                الموقع (اختياري)
              </label>
              <Input
                value={form.location || ""}
                onChange={(e) => handleChange("location", e.target.value)}
                className="h-8 text-[11px]"
              />
            </div>
            <div>
              <label className="mb-1 block text-right text-[11px]">
                البريد الإلكتروني
              </label>
              <Input
                type="email"
                value={form.email || ""}
                onChange={(e) => handleChange("email", e.target.value)}
                className="h-8 text-[11px]"
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
