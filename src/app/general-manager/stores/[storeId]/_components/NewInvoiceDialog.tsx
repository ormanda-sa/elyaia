// src/app/general-manager/stores/[storeId]/_components/NewInvoiceDialog.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  storeId: string;
};

export function NewInvoiceDialog({ storeId }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [dueAt, setDueAt] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const router = useRouter();

  async function handleCreate() {
    setErrorMsg(null);
    const parsedAmount = parseFloat(amount.replace(/,/g, ""));
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg("الرجاء إدخال مبلغ صحيح أكبر من صفر");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/general-manager/stores/${storeId}/invoices`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount_cents: Math.round(parsedAmount * 100),
            // لو حبيت تربطها باشتراك معين، أضف subscription_id هنا لاحقاً
            due_at: dueAt || null,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json?.message || "فشل إنشاء الفاتورة");
        return;
      }

      // نحدّث البيانات في الصفحة
      router.refresh();
      setOpen(false);
      setAmount("");
      setDueAt("");
    } catch (err) {
      console.error(err);
      setErrorMsg("حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="rounded-xl">
          إنشاء فاتورة جديدة
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>إنشاء فاتورة جديدة</DialogTitle>
          <DialogDescription>
            أدخل مبلغ الفاتورة وتاريخ الاستحقاق (اختياري). سيتم إنشاء الفاتورة
            بحالة غير مدفوعة (unpaid).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">
              مبلغ الفاتورة (ريال)
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="مثال: 199.00"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">
              تاريخ الاستحقاق (اختياري)
            </label>
            <Input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-red-600 mt-1">{errorMsg}</p>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            إلغاء
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? "جاري الإنشاء..." : "إنشاء الفاتورة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
