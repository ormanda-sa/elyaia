// src/app/general-manager/stores/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type StoreRow = {
  id: string;
  name: string;
  domain: string | null;
  owner_email: string | null;
  status: string;
  created_at: string;
  current_plan: string | null;
  trial_days_left: number | null;
};

export default function StoresListPage() {
  const [email, setEmail] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [resultMessage, setResultMessage] = React.useState<string | null>(null);

  const [stores, setStores] = React.useState<StoreRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const [searchText, setSearchText] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [planFilter, setPlanFilter] = React.useState("");
  const [page] = React.useState(1); // مافيه pagination حقيقي حالياً

  async function handleSendInvitation(e: React.FormEvent) {
    e.preventDefault();
    setResultMessage(null);
    if (!email.trim()) {
      setResultMessage("فضلاً أدخل البريد الإلكتروني.");
      return;
    }

    setIsSending(true);
    try {
      await fetch("/api/general-manager/stores/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      setResultMessage("تم إرسال رابط التسجيل إلى البريد (إن وجد).");
      setEmail("");
    } catch (err) {
      console.error(err);
      setResultMessage("تعذّر إرسال الدعوة، حاول مرة أخرى.");
    } finally {
      setIsSending(false);
    }
  }

  async function loadStores(q?: string) {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : "";
      const res = await fetch(`/api/general-manager/stores${params}`);
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setErrorMsg(data?.message || "فشل جلب المتاجر.");
        setStores([]);
      } else {
        setStores(data.stores as StoreRow[]);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("خطأ في الاتصال بالسيرفر.");
      setStores([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadStores();
  }, []);

  const filteredStores = stores.filter((s) => {
    const matchText =
      !searchText ||
      s.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (s.domain ?? "").toLowerCase().includes(searchText.toLowerCase());

    const matchStatus = !statusFilter || s.status === statusFilter;

    const matchPlan =
      !planFilter ||
      (planFilter === "trial" && s.current_plan === "trial") ||
      (planFilter === "paid" && s.current_plan && s.current_plan !== "trial");

    return matchText && matchStatus && matchPlan;
  });

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* العنوان + زر الدعوة */}
      <div className="flex items-center justify-between gap-3 px-4 lg:px-6">
        <div>
          <h1 className="text-lg font-semibold">المتاجر</h1>
          <p className="text-[11px] text-slate-500">
            إدارة المتاجر المتصلة بالنظام وحالة اشتراك كل متجر.
          </p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button
              className="rounded-md px-3 py-1.5 text-xs font-medium"
              size="sm"
            >
              إضافة متجر / إرسال دعوة
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>إضافة متجر / إرسال دعوة</DialogTitle>
              <DialogDescription className="text-[11px]">
                أدخل بريد صاحب المتجر، وسيتم إرسال رابط التسجيل ولوحة
                التهيئة على بريده الإلكتروني.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSendInvitation} className="space-y-3">
              <div className="space-y-1">
                <label
                  htmlFor="invite-email"
                  className="text-xs font-medium text-slate-700"
                >
                  البريد الإلكتروني لصاحب المتجر
                </label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="owner@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              {resultMessage && (
                <p className="text-[11px] text-slate-600">{resultMessage}</p>
              )}

              <DialogFooter className="mt-2">
                <Button type="submit" size="sm" disabled={isSending}>
                  {isSending ? "جاري الإرسال..." : "إرسال رابط التسجيل"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* الفلاتر + الجدول على نفس ستايل الكرت */}
      <div className="px-4 lg:px-6 flex flex-col gap-3">
        {/* الفلاتر */}
        <div className="flex flex-wrap gap-3 text-xs">
          <input
            type="text"
            placeholder="بحث باسم المتجر أو النطاق..."
            className="h-8 rounded-md border px-3 text-xs min-w-[220px]"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") loadStores(searchText);
            }}
          />
          <select
            className="h-8 rounded-md border px-2 text-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">كل الحالات</option>
            <option value="trial">تجريبي</option>
            <option value="active">نشط</option>
            <option value="suspended">موقوف</option>
          </select>
          <select
            className="h-8 rounded-md border px-2 text-xs"
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
          >
            <option value="">كل الخطط</option>
            <option value="trial">تجريبية</option>
            <option value="paid">مدفوعة</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => loadStores(searchText)}
          >
            تحديث
          </Button>
        </div>

        {errorMsg && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
            {errorMsg}
          </div>
        )}

        {/* الكرت + الجدول بنفس نمط الـ DataTable اللي أرسلته */}
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="w-[220px]">المتجر</TableHead>
                <TableHead>النطاق</TableHead>
                <TableHead>البريد</TableHead>
                <TableHead>الخطة الحالية</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>التجربة</TableHead>
                <TableHead className="w-[80px] text-right">
                  إجراءات
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="px-4 py-6 text-center text-slate-400"
                  >
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : filteredStores.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="px-4 py-6 text-center text-slate-400"
                  >
                    لا توجد متاجر حتى الآن.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStores.map((store) => {
                  const statusLabel =
                    store.status === "trial"
                      ? "تجريبي"
                      : store.status === "active"
                      ? "نشط"
                      : store.status === "suspended"
                      ? "موقوف"
                      : store.status;

                  const trialLabel =
                    store.current_plan === "trial"
                      ? store.trial_days_left != null
                        ? `${store.trial_days_left} يوم متبقٍ`
                        : "تجريبي"
                      : "-";

                  return (
                    <TableRow key={store.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-sm">
                            {store.name}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {store.id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[11px] text-slate-600">
                        {store.domain ?? "-"}
                      </TableCell>
                      <TableCell className="text-[11px] text-slate-600">
                        {store.owner_email ?? "-"}
                      </TableCell>
                      <TableCell>
                        {store.current_plan ? (
                          <Badge
                            variant="outline"
                            className="px-1.5 text-[11px]"
                          >
                            {store.current_plan}
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="px-1.5 text-[11px]"
                        >
                          {statusLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[11px]">
                        {trialLabel}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/general-manager/stores/${store.id}`}
                          className="text-[11px] text-blue-600 hover:underline"
                        >
                          التفاصيل
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* تحت الجدول – سطر بسيط بدل لعب pagination حقيقي */}
        <div className="flex items-center justify-between px-1 py-2 text-[11px] text-muted-foreground">
          <div>إجمالي المتاجر: {filteredStores.length}</div>
          <div>الصفحة {page} من 1</div>
        </div>
      </div>
    </div>
  );
}
