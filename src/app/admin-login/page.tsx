"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = "email" | "code";

export default function AdminLoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    if (!email.trim()) {
      setErrorMsg("فضلاً أدخل البريد الإلكتروني.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/general-manager/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data?.error || "تعذر إرسال كود التحقق.");
        return;
      }

      setInfoMsg("تم إرسال كود التحقق إلى بريدك الإلكتروني.");
      setStep("code");
    } catch (err) {
      console.error(err);
      setErrorMsg("حدث خطأ غير متوقع.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    if (!code.trim() || code.trim().length !== 6) {
      setErrorMsg("فضلاً أدخل كود التحقق المكوّن من 6 أرقام.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/general-manager/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data?.error || "تعذر التحقق من الكود.");
        return;
      }

      router.push("/general-manager");
    } catch (err) {
      console.error(err);
      setErrorMsg("حدث خطأ غير متوقع.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (!email.trim()) return;
    setErrorMsg(null);
    setInfoMsg(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/general-manager/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error || "تعذر إعادة إرسال الكود.");
        return;
      }
      setInfoMsg("تم إعادة إرسال الكود إلى بريدك.");
    } catch (err) {
      console.error(err);
      setErrorMsg("حدث خطأ غير متوقع.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-muted"
    >
      <Card className="w-full max-w-sm shadow-lg">
        {step === "email" && (
          <>
            <CardHeader>
              <CardTitle className="text-right">تسجيل دخول المدير العام</CardTitle>
              <CardDescription className="text-xs text-right">
                أدخل بريدك الإلكتروني لنرسل لك كود التحقق لمرة واحدة.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendCode} className="space-y-4 text-right">
                <div className="space-y-1">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                {errorMsg && (
                  <p className="text-xs text-red-500 text-right">{errorMsg}</p>
                )}
                {infoMsg && (
                  <p className="text-xs text-muted-foreground text-right">
                    {infoMsg}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "جاري الإرسال..." : "إرسال كود التحقق"}
                </Button>
              </form>
            </CardContent>
          </>
        )}

        {step === "code" && (
          <>
            <CardHeader>
              <CardTitle>Enter verification code</CardTitle>
              <CardDescription>
                We sent a 6-digit code to your email: {email}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyCode}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="otp">Verification code</FieldLabel>
                    <InputOTP
                      maxLength={6}
                      id="otp"
                      value={code}
                      onChange={(val) => setCode(val)}
                      disabled={isLoading}
                      required
                    >
                      <InputOTPGroup className="gap-2.5 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border">
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                    <FieldDescription>
                      Enter the 6-digit code sent to your email.
                    </FieldDescription>
                  </Field>

                  {errorMsg && (
                    <p className="text-xs text-red-500 text-right mt-2">
                      {errorMsg}
                    </p>
                  )}
                  {infoMsg && (
                    <p className="text-xs text-muted-foreground text-right mt-1">
                      {infoMsg}
                    </p>
                  )}

                  <FieldGroup className="mt-4 space-y-2">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Verifying..." : "Verify"}
                    </Button>
                    <FieldDescription className="text-center">
                      Didn&apos;t receive the code?{" "}
                      <button
                        type="button"
                        className="underline"
                        onClick={handleResend}
                        disabled={isLoading}
                      >
                        Resend
                      </button>
                    </FieldDescription>
                    <FieldDescription className="text-center">
                      بريدك خطأ؟{" "}
                      <button
                        type="button"
                        className="underline"
                        onClick={() => setStep("email")}
                        disabled={isLoading}
                      >
                        تغيـير البريد
                      </button>
                    </FieldDescription>
                  </FieldGroup>
                </FieldGroup>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
