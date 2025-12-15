// FILE: src/app/dashboard/marketing/vehicle/_components/targets-table.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function fmt(dt?: string | null) {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleString("ar-SA");
  } catch {
    return dt;
  }
}

const TARGET_STATUS_LABELS: Record<string, string> = {
  pending: "بانتظار",
  notified: "تم الإرسال",
  converted: "تم التحويل",
  skipped: "متجاهل",
};

export function TargetsTable({
  campaignId,
  showOnlyCustomers,
}: {
  campaignId: number;
  showOnlyCustomers: boolean;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (status) p.set("status", status);
    p.set("limit", "30");
    if (cursor) p.set("cursor", cursor);
    return p.toString();
  }, [q, status, cursor]);

  async function load(reset = false) {
    setError(null);
    setLoading(true);
    try {
      const base = `/api/dashboard/marketing/vehicle/campaigns/${campaignId}/targets`;
      const url = reset
        ? `${base}?${new URLSearchParams({
            q: q.trim(),
            status,
            limit: "30",
          }).toString()}`
        : `${base}?${params}`;

      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");

      let list = json.items || [];

      // ✅ قفل العرض: إذا عملاء فقط، لا نعرض visitors
      if (showOnlyCustomers) {
        list = list.filter((t: any) => !!t.salla_customer_id);
      }

      setItems(list);
      setNextCursor(json.nextCursor ?? null);
    } catch (e: any) {
      setError(e?.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setCursor(null);
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, q, status, showOnlyCustomers]);

  return (
    <div className="rounded-2xl border p-4 space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="font-semibold">المستهدفون</div>
          <div className="text-xs text-muted-foreground">
            الوضع:{" "}
            <b>{showOnlyCustomers ? "عملاء فقط" : "زوار + عملاء"}</b>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث (اسم/إيميل/جوال/ID)..."
            className="w-[260px]"
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">الحالة: {status || "الكل"}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setStatus("")}>الكل</DropdownMenuItem>
              {["pending", "notified", "converted", "skipped"].map((s) => (
                <DropdownMenuItem key={s} onClick={() => setStatus(s)}>
                  {TARGET_STATUS_LABELS[s] ?? s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="secondary" onClick={() => load(true)}>
            تحديث
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>العميل</TableHead>
              <TableHead>التواصل</TableHead>
              <TableHead>الإشارات</TableHead>
              <TableHead>آخر إشارة</TableHead>
              <TableHead>الحالة</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  تحميل...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  {showOnlyCustomers
                    ? "لا يوجد عملاء مستهدفون (تأكد من ربط العملاء أو أوقف خيار عملاء فقط)."
                    : "لا يوجد مستهدفون حسب الفلاتر."}
                </TableCell>
              </TableRow>
            ) : (
              items.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="font-medium">
                      {t.customer_name || "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t.salla_customer_id
                        ? `ID: ${t.salla_customer_id}`
                        : t.visitor_id
                        ? `Visitor: ${t.visitor_id}`
                        : "—"}
                    </div>
                  </TableCell>

                  <TableCell className="text-xs">
                    <div>{t.customer_email || "—"}</div>
                    <div>{t.customer_phone || "—"}</div>
                  </TableCell>

                  <TableCell>
                    <div className="font-semibold">{t.signals_count ?? 0}</div>
                  </TableCell>

                  <TableCell className="text-xs">{fmt(t.last_signal_at)}</TableCell>

                  <TableCell>
                    <Badge variant="secondary">
                      {TARGET_STATUS_LABELS[t.status] ?? t.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" disabled={!cursor} onClick={() => setCursor(null)}>
          الصفحة الأولى
        </Button>

        <Button disabled={!nextCursor} onClick={() => setCursor(nextCursor)}>
          التالي
        </Button>
      </div>
    </div>
  );
}
