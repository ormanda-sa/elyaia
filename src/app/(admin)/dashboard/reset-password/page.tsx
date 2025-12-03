// src/app/(admin)/dashboard/reset-password/page.tsx
"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import Link from "next/link";
import React, {
  useState,
  useEffect,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordInner() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [canUpdate, setCanUpdate] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  // نقرأ التوكن من الـ URL
  const token = searchParams.get("token") || "";

  useEffect(() => {
    if (!token) {
      setCanUpdate(false);
      setError(
        "رابط الاستعادة غير صالح أو منتهي، يرجى طلب رابط جديد من صفحة استعادة كلمة المرور.",
      );
    } else {
      setCanUpdate(true);
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formEl = document.getElementById(
      "darb-reset-form",
    ) as HTMLFormElement | null;
    if (!formEl) return;

    const formData = new FormData(formEl);
    const password = String(formData.get("password") || "");
    const confirm = String(formData.get("confirm") || "");

    if (!password || !confirm) {
      setError("رجاءً أدخل كلمة المرور الجديدة وتأكيدها");
      return;
    }

    if (password !== confirm) {
      setError("تأكيد كلمة المرور غير متطابق");
      return;
    }

    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    if (!canUpdate || !token) {
      setError(
        "لا يمكن تحديث كلمة المرور، يرجى فتح الرابط الصحيح من البريد الإلكتروني.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          passwordConfirm: confirm,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        setError(
          data?.error ||
            "تعذّر تحديث كلمة المرور، حاول مرة أخرى أو أعد طلب رابط الاستعادة.",
        );
      } else {
        setSuccess(
          data?.message ||
            "تم تحديث كلمة المرور بنجاح. سيتم تحويلك إلى صفحة الدخول...",
        );

        // تحويل إلى صفحة تسجيل الدخول بعد النجاح
        setTimeout(() => {
          router.replace("/dashboard/login");
        }, 2000);
      }
    } catch (err) {
      console.error("reset-password fetch error:", err);
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
              تعيين كلمة مرور جديدة
            </h1>
            <p className="text-sm text-slate-500">
              اختر كلمة مرور جديدة قوية وتأكد من حفظها في مكان آمن.
            </p>
          </div>

          {!token && (
            <p className="mb-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              رابط الاستعادة غير صالح أو مفقود. يرجى طلب رابط جديد من صفحة{" "}
              <Link
                href="/dashboard/forgot-password"
                className="underline text-blue-600"
              >
                استعادة كلمة المرور
              </Link>
              .
            </p>
          )}

          <form
            id="darb-reset-form"
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <Label>
                كلمة المرور الجديدة{" "}
                <span className="text-error-500">*</span>
              </Label>
              <Input
                name="password"
                type="password"
                placeholder="أدخل كلمة المرور الجديدة"
              />
            </div>

            <div>
              <Label>
                تأكيد كلمة المرور{" "}
                <span className="text-error-500">*</span>
              </Label>
              <Input
                name="confirm"
                type="password"
                placeholder="أعد إدخال كلمة المرور"
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
              disabled={submitting || !canUpdate}
            >
              {submitting ? "جاري تحديث كلمة المرور..." : "تحديث كلمة المرور"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>جاري تحميل صفحة إعادة تعيين كلمة المرور...</div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
