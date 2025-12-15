// src/app/merchant/onboarding/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function MerchantOnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [domain, setDomain] = useState("");
  const [sallaStoreId, setSallaStoreId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
 
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const emailFromQuery = searchParams.get("email");
    if (emailFromQuery) {
      setEmail(emailFromQuery);
    }
  }, [searchParams]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (
      !storeName ||
      !ownerName ||
      !domain ||
      !sallaStoreId ||
      !email ||
      !password ||
      !passwordConfirm
    ) {
      setErrorMsg("الرجاء تعبئة جميع الحقول.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/merchant/onboarding/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName,
          ownerName,
          domain,
          sallaStoreId,
          email,
          password,
          passwordConfirm,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setErrorMsg(data?.message || "حدث خطأ أثناء التسجيل.");
        console.error("REGISTER ERROR", data);
        setSubmitting(false);
        return;
      }

      setSuccessMsg(
        "تم إنشاء المتجر بنجاح. سيتم تحويلك إلى صفحة تسجيل الدخول..."
      );
      setSubmitting(false);

      const redirectTo = data.redirectTo || "/dashboard/login";

      setTimeout(() => {
        router.push(redirectTo);
      }, 1500);
    } catch (err) {
      console.error(err);
      setErrorMsg("خطأ في الاتصال بالسيرفر.");
      setSubmitting(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-slate-50 px-4"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg md:p-8">
        <h1 className="mb-2 text-center text-xl font-bold md:text-2xl">
          إكمال تسجيل المتجر
        </h1>
        <p className="mb-6 text-center text-sm text-slate-600">
          هذه الصفحة مخصّصة لإكمال تسجيل متجرك في Darb Filters من خلال الدعوة
          التي وصلتك على البريد.
        </p>

        {email && (
          <div className="mb-4 text-center text-xs text-slate-500">
            البريد المستخدم في الدعوة:
            <span className="mx-1 font-semibold">{email}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-800">
              اسم المتجر
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              placeholder="مثال: متجر أورماندا لقطع الغيار"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-800">
              اسم مالك المتجر
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              placeholder="اسم صاحب المتجر"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-800">
              نطاق المتجر (الدومين)
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              placeholder="مثال: ormanda.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-800">
              Salla Store ID
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              placeholder="رقم المتجر في سلة"
              value={sallaStoreId}
              onChange={(e) => setSallaStoreId(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-800">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              className="w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm outline-none focus:border-slate-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly={!!searchParams.get("email")}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-800">
              كلمة المرور
            </label>
            <input
              type="password"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              placeholder="اختر كلمة مرور للحساب"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-800">
              تأكيد كلمة المرور
            </label>
            <input
              type="password"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              placeholder="أعد إدخال كلمة المرور"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-slate-900 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? "جاري إنشاء المتجر..."
              : "إنشاء المتجر وإكمال التسجيل"}
          </button>
        </form>
      </div>
    </div>
  );
}

// 👇 هنا نلف الكومبوننت داخل Suspense زي ما Next 16 يبغى
export default function PageWrapper() {
  return (
    <Suspense fallback={null}>
      <MerchantOnboardingForm />
    </Suspense>
  );
}
