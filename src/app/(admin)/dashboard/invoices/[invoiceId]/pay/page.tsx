// src/app/dashboard/invoices/[invoiceId]/pay/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Invoice = {
  id: string;
  amount_cents: number;
  status: string;
  issued_at: string;
  due_at: string | null;
  paid_at: string | null;
};

type OverviewResponse = {
  invoices: Invoice[];
};

const MOYASAR_TOKEN_URL = "https://api.moyasar.com/v1/tokens";
const PK = process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY!;

function formatCurrency(amount: number) {
  return `${amount.toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ر.س`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export default function PayInvoicePage() {
  const params = useParams<{ invoiceId: string }>();
  const invoiceId = params.invoiceId;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardMonth, setCardMonth] = useState("");
  const [cardYear, setCardYear] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  async function loadInvoice() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/dashboard/subscriptions/overview", {
        cache: "no-store",
      });
      const json = (await res.json()) as OverviewResponse & {
        error?: string;
      };

      if (!res.ok || (json as any).error) {
        setErrorMsg("تعذر جلب بيانات الفواتير.");
        setInvoice(null);
        return;
      }

      const inv = json.invoices.find((x) => x.id === invoiceId) || null;
      if (!inv) {
        setErrorMsg("لم يتم العثور على الفاتورة.");
        setInvoice(null);
      } else {
        setInvoice(inv);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("خطأ في الاتصال بالسيرفر.");
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      setSuccessMsg("تمت عملية الدفع بنجاح (من بوابة الدفع).");
    } else if (status === "failed") {
      setErrorMsg("فشلت عملية الدفع من بوابة الدفع.");
    }
  }, [searchParams]);

  async function handlePay() {
    if (!invoice) return;

    if (
      !cardName.trim() ||
      !cardNumber.trim() ||
      !cardMonth.trim() ||
      !cardYear.trim() ||
      !cardCvc.trim()
    ) {
      setErrorMsg("الرجاء تعبئة جميع بيانات البطاقة.");
      return;
    }

    setProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1) إنشاء token من Moyasar باستخدام form-urlencoded
      const form = new URLSearchParams();
      form.set("type", "creditcard");
      form.set("name", cardName);
      form.set("number", cardNumber.replace(/\s+/g, ""));
      form.set("month", String(parseInt(cardMonth, 10)));
      form.set("year", String(parseInt(cardYear, 10)));
      form.set("cvc", cardCvc);

      const tokenRes = await fetch(MOYASAR_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " + Buffer.from(PK + ":").toString("base64"),
        },
        body: form.toString(),
      });

      const rawText = await tokenRes.text();
      let tokenJson: any = {};
      try {
        tokenJson = rawText ? JSON.parse(rawText) : {};
      } catch {
        tokenJson = { parse_error: true, raw: rawText };
      }

      if (!tokenRes.ok) {
        console.error(
          "MOYASAR_TOKEN_ERROR",
          tokenRes.status,
          tokenRes.statusText,
          tokenJson,
        );
        setErrorMsg(
          `تعذر إنشاء token من بوابة الدفع (رمز: ${tokenRes.status}). تأكد من المفتاح وبيانات البطاقة.`,
        );
        setProcessing(false);
        return;
      }

      const tokenId = tokenJson.id as string;
      if (!tokenId) {
        setErrorMsg("لم نستلم token صالح من بوابة الدفع.");
        setProcessing(false);
        return;
      }

      // 2) إرسال token إلى API عندك لإنشاء دفع مرتبط بالفاتورة
      const checkoutRes = await fetch("/api/moyasar/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: invoice.id,
          token: tokenId,
        }),
      });

      const checkoutJson = await checkoutRes.json();

      if (!checkoutRes.ok || !checkoutJson.ok) {
        console.error("CHECKOUT_ERROR", checkoutJson);
        setErrorMsg(checkoutJson.message || "تعذر إتمام عملية الدفع.");
        setProcessing(false);
        return;
      }

      setSuccessMsg("تم إرسال عملية الدفع بنجاح إلى بوابة Moyasar.");
      setTimeout(() => {
        router.push("/dashboard/subscriptions");
      }, 1500);
    } catch (err) {
      console.error(err);
      setErrorMsg("خطأ في الاتصال أثناء عملية الدفع.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      {loading ? (
        <Card className="mx-auto max-w-xl">
          <CardHeader>
            <CardTitle>دفع فاتورة الاشتراك</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-sm text-slate-500">
            جاري تحميل بيانات الفاتورة...
          </CardContent>
        </Card>
      ) : !invoice ? (
        <Card className="mx-auto max-w-xl">
          <CardHeader>
            <CardTitle>دفع فاتورة الاشتراك</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-sm text-red-600">
            {errorMsg || "لم يتم العثور على الفاتورة."}
          </CardContent>
        </Card>
      ) : (
        <Card className="mx-auto max-w-xl">
          <CardHeader>
            <CardTitle>دفع فاتورة الاشتراك</CardTitle>
            <CardDescription>
              رقم الفاتورة:{" "}
              <span className="font-mono text-xs text-slate-800">
                #{invoice.id.slice(0, 8)}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {errorMsg && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {successMsg}
              </div>
            )}

            <div className="space-y-1 text-xs text-slate-600">
              <div>
                <span className="font-semibold text-slate-800">
                  المبلغ المستحق:
                </span>{" "}
                {formatCurrency(invoice.amount_cents / 100)}
              </div>
              <div>تاريخ الإصدار: {formatDate(invoice.issued_at)}</div>
              <div>تاريخ الاستحقاق: {formatDate(invoice.due_at)}</div>
              <div>
                حالة الفاتورة:{" "}
                <span className="font-medium text-slate-800">
                  {invoice.status === "paid"
                    ? "مدفوعة"
                    : invoice.status === "unpaid"
                    ? "غير مدفوعة"
                    : invoice.status === "canceled"
                    ? "ملغاة"
                    : invoice.status}
                </span>
              </div>
            </div>

            {invoice.status !== "unpaid" ? (
              <div className="rounded-md bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
                هذه الفاتورة ليست مستحقة حالياً (مدفوعة أو ملغاة).
              </div>
            ) : (
              <>
                <div className="rounded-md bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                  أدخل بيانات البطاقة لإتمام الدفع عبر بوابة Moyasar (بيئة
                  تجريبية). استخدم بيانات بطاقة الاختبار من وثائق Moyasar.
                </div>

                <div className="space-y-3 text-[11px]">
                  <div>
                    <label className="mb-1 block text-slate-700">
                      اسم حامل البطاقة
                    </label>
                    <Input
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="مثال: Ahmed Ali"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-slate-700">
                      رقم البطاقة
                    </label>
                    <Input
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4111 1111 1111 1111"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="mb-1 block text-slate-700">
                        شهر الانتهاء
                      </label>
                      <Input
                        value={cardMonth}
                        onChange={(e) => setCardMonth(e.target.value)}
                        placeholder="01"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="mb-1 block text-slate-700">
                        سنة الانتهاء
                      </label>
                      <Input
                        value={cardYear}
                        onChange={(e) => setCardYear(e.target.value)}
                        placeholder="2026"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="mb-1 block text-slate-700">
                        CVC
                      </label>
                      <Input
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                        placeholder="123"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            {invoice.status === "unpaid" && (
              <Button
                className="w-full"
                disabled={processing}
                onClick={handlePay}
              >
                {processing ? "جاري تنفيذ عملية الدفع..." : "إتمام الدفع الآن"}
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/dashboard/subscriptions")}
            >
              العودة لصفحة الاشتراك والفواتير
            </Button>
          </CardFooter>
        </Card>
      )}
    </main>
  );
}
