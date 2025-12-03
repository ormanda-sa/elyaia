"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input as UiInput } from "@/components/ui/input";

function LoginInner() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // دعوة فتح حساب
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard/filter";

  // ================== تسجيل الدخول بالباسورد ==================
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const formEl = document.getElementById(
      "darb-login-form",
    ) as HTMLFormElement | null;
    if (!formEl) return;

    const formData = new FormData(formEl);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    if (!email || !password) {
      setError("رجاءً أدخل البريد الإلكتروني وكلمة المرور");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          rememberMe,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        const code = json.error || "LOGIN_FAILED";
        if (code === "INVALID_CREDENTIALS") {
          setError("بيانات الدخول غير صحيحة");
        } else if (code === "EMAIL_PASSWORD_REQUIRED") {
          setError("البريد وكلمة المرور مطلوبة");
        } else {
          setError("حدث خطأ أثناء تسجيل الدخول");
        }
        setSubmitting(false);
        return;
      }

      // علامة بسيطة لو عندك حارس في (admin)/layout.tsx
      document.cookie = "logged_in=1; path=/";

      router.replace(redirectTo);
    } catch {
      setError("حدث خطأ غير متوقع، حاول مرة أخرى");
      setSubmitting(false);
    }
  }

  // ================== الدخول عن طريق جوجل ==================
  function handleGoogleLogin() {
    const target = `/api/auth/google/start?redirectTo=${encodeURIComponent(
      redirectTo,
    )}`;
    // نخلي المتصفح يروح مباشرة على مسار جوجل
    window.location.href = target;
  }

  // ================== إرسال طلب فتح حساب ==================
  async function handleInviteSubmit() {
    setInviteError(null);
    setInviteMessage(null);

    const email = inviteEmail.trim();
    if (!email) {
      setInviteError("فضلاً أدخل البريد الإلكتروني.");
      return;
    }

    setInviteSending(true);
    try {
      const res = await fetch("/api/dashboard/store-invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        const code = json.error || "INVITE_FAILED";
        if (code === "EMAIL_EXISTS") {
          setInviteError(
            "هذا البريد مسجّل لدينا من قبل. إذا نسيت كلمة المرور يمكنك استخدام رابط (نسيت كلمة المرور) بالأسفل.",
          );
        } else if (code === "EMAIL_REQUIRED") {
          setInviteError("فضلاً أدخل البريد الإلكتروني.");
        } else {
          setInviteError("تعذّر إرسال الطلب، حاول مرة أخرى.");
        }
        return;
      }

      setInviteMessage(
        "تم استلام طلب فتح الحساب، سنتواصل معك عبر البريد في أقرب وقت.",
      );
      setInviteEmail("");
    } catch (err) {
      console.error(err);
      setInviteError("حدث خطأ في الاتصال، حاول مرة أخرى.");
    } finally {
      setInviteSending(false);
    }
  }

  // ================== JSX ==================
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-slate-100 px-4"
      dir="rtl"
    >
      <div className="w-full max-w-4xl">
        {/* breadcrumb صغير */}
        <div className="mb-6 text-xs text-slate-500">
          <Link href="/" className="hover:text-brand-600">
            الرجوع للواجهة الرئيسية
          </Link>
        </div>

        {/* الكارد الرئيسي */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 grid grid-cols-1 md:grid-cols-2 overflow-hidden">
          {/* الجزء الأيسر – الفورم */}
          <div className="px-6 py-8 sm:px-8 flex flex-col justify-center">
            <div className="mb-6 text-center md:text-right">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                تسجيل دخول لوحة التحكم
              </h1>
              <p className="text-sm text-slate-500">
                أدخل البريد الإلكتروني وكلمة المرور للدخول إلى لوحة إدارة
                الفلتر الذكي لمتجرك.
              </p>
            </div>

            <form
              id="darb-login-form"
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

              <div>
                <Label>
                  كلمة المرور <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="أدخل كلمة المرور"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={rememberMe}
                    onChange={setRememberMe}
                  />
                  <span className="text-gray-700">تذكّرني</span>
                </div>
                <Link
                  href="/dashboard/forgot-password"
                  className="text-brand-500 hover:text-brand-600"
                >
                  نسيت كلمة المرور؟
                </Link>
              </div>

              <Button
                className="w-full mt-1 bg-brand-600 hover:bg-brand-700 text-white"
                size="sm"
                disabled={submitting}
              >
                {submitting ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
              </Button>

              {/* خط فاصل */}
              <div className="flex items-center gap-3 pt-3">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-[11px] text-slate-400">
                  أو استمر باستخدام
                </span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              {/* أزرار إضافية: جوجل + "أنا إنسان" (placeholder) */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                {/* زر جوجل */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="inline-flex items-center justify-center gap-2 h-9 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                >
                  {/* أيقونة بسيطة لحرف G، تقدر تبدلها بـ SVG رسمي لاحقاً */}
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#4285F4] border border-slate-200">
                    G
                  </span>
                  <span>دخول عن طريق جوجل</span>
                </button>

                {/* زر التحقق (placeholder) */}
                <button
                  type="button"
                  className="h-9 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                >
                  ↻ التحقق بأنك إنسان
                </button>

                {/* زر ثالث تقدر تستخدمه لأي شيء لاحقاً */}
                <button
                  type="button"
                  className="h-9 text-xs rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100"
                >
                  خيار آخر
                </button>
              </div>

              {/* دعوة فتح حساب – بدون form متداخل */}
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <p className="pt-2 text-xs text-center text-slate-500">
                  ما عندك حساب؟{" "}
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="text-brand-500 hover:text-brand-600 cursor-pointer underline-offset-2"
                    >
                      تواصل معنا لفتح حساب للمتجر
                    </button>
                  </DialogTrigger>
                </p>

                <DialogContent dir="rtl" className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>طلب فتح حساب للمتجر</DialogTitle>
                    <DialogDescription className="text-[11px]">
                      أدخل بريدك الإلكتروني وسنقوم بمراجعة طلبك والتواصل معك
                      بخصوص تفعيل لوحة التحكم وربطها بمتجرك.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-3 text-right">
                    <div className="space-y-1">
                      <label
                        htmlFor="invite-email"
                        className="text-xs font-medium text-slate-700"
                      >
                        البريد الإلكتروني لصاحب المتجر
                      </label>
                      <UiInput
                        id="invite-email"
                        type="email"
                        placeholder="owner@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>

                    {inviteError && (
                      <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-md px-2 py-1.5">
                        {inviteError}{" "}
                        {inviteError.includes("نسيت كلمة المرور") && (
                          <Link
                            href="/dashboard/forgot-password"
                            className="ml-1 text-brand-600 underline"
                          >
                            نسيت كلمة المرور؟
                          </Link>
                        )}
                      </p>
                    )}

                    {inviteMessage && (
                      <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-2 py-1.5">
                        {inviteMessage}
                      </p>
                    )}

                    <DialogFooter className="mt-1 flex justify-between">
                      <button
                        type="button"
                        onClick={handleInviteSubmit}
                        disabled={inviteSending}
                        className="inline-flex items-center justify-center rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {inviteSending
                          ? "جاري إرسال الطلب..."
                          : "إرسال طلب فتح حساب"}
                      </button>
                    </DialogFooter>
                  </div>
                </DialogContent>
              </Dialog>
            </form>
          </div>

          {/* الجزء الأيمن – مساحة تصميم / صورة */}
          <div className="hidden md:flex items-center justify-center bg-slate-50 border-r border-slate-200">
            <div className="w-40 h-40 rounded-full border border-dashed border-slate-300 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 text-xl">
                د
              </div>
            </div>
          </div>
        </div>

        {/* شروط تحت الكارد */}
        <p className="mt-4 text-[11px] text-center text-slate-400">
          باستخدامك لوحة التحكم، فأنت توافق على{" "}
          <span className="underline cursor-pointer">شروط الاستخدام</span> و{" "}
          <span className="underline cursor-pointer">سياسة الخصوصية</span>.
        </p>
      </div>
    </div>
  );
}

/** هنا نلف الكومبوننت اللي يستخدم useSearchParams داخل Suspense */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
