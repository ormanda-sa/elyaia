// src/app/dashboard/forgot-password/page.tsx
"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import Link from "next/link";
import React, { useState } from "react";

export default function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formEl = document.getElementById(
      "darb-forgot-form",
    ) as HTMLFormElement | null;
    if (!formEl) return;

    const formData = new FormData(formEl);
    const email = String(formData.get("email") || "").trim();

    if (!email) {
      setError("رجاءً أدخل البريد الإلكتروني");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        setError(
          data?.error ||
            "تعذّر إرسال رابط الاستعادة، تأكد من البريد أو حاول لاحقاً",
        );
      } else {
        setSuccess(
          data?.message ||
            "تم إرسال رابط استعادة كلمة المرور إلى بريدك (إن كان مسجلاً لدينا).",
        );
      }
    } catch (err) {
      console.error("forgot-password fetch error:", err);
      setError("تعذّر الاتصال بالسيرفر، حاول لاحقاً.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-slate-100 px-4"
      dir="rtl"
    >
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-xs text-slate-500">
          <Link href="/dashboard/login" className="hover:text-brand-600">
            الرجوع لتسجيل الدخول
          </Link>
        </div>

        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 px-6 py-8 sm:px-8">
          <div className="mb-6 text-center md:text-right">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              استعادة كلمة المرور
            </h1>
            <p className="text-sm text-slate-500">
              أدخل البريد الإلكتروني المسجّل لحسابك، وسنرسل لك رابطًا لإعادة
              تعيين كلمة المرور.
            </p>
          </div>

          <form
            id="darb-forgot-form"
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <Label>
                البريد الإلكتروني{" "}
                <span className="text-error-500">*</span>
              </Label>
              <Input
                name="email"
                type="email"
                placeholder="example@store.com"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {success && (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                {success}
              </p>
            )}

            <Button
              className="w-full mt-1 bg-brand-600 hover:bg-brand-700 text-white"
              size="sm"
              disabled={submitting}
            >
              {submitting ? "جاري إرسال الرابط..." : "إرسال رابط الاستعادة"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
