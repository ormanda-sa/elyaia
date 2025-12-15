// src/app/general-manager/stores/[storeId]/_components/StoreSubscriptionsTable.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SubscriptionRow = {
  id: string;
  plan_code: string;
  billing_cycle: string;
  price_cents: number;
  status: string;
  start_at: string;
  end_at: string | null;
};

type StoreSubscriptionsTableProps = {
  subscriptions: SubscriptionRow[];
};

export function StoreSubscriptionsTable({
  subscriptions,
}: StoreSubscriptionsTableProps) {
  return (
    <div className="px-4 lg:px-6">
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="flex items-center justify-between px-4 py-2">
          <div>
            <h2 className="text-sm font-semibold">اشتراكات المتجر</h2>
            <p className="text-[11px] text-muted-foreground">
              سجل خطط الاشتراك والحالات عبر الزمن.
            </p>
          </div>
        </div>
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>الخطة</TableHead>
              <TableHead>الدورة</TableHead>
              <TableHead>السعر (ر.س)</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>تاريخ البداية</TableHead>
              <TableHead>تاريخ النهاية</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="px-4 py-6 text-center text-[11px] text-slate-400"
                >
                  لا توجد اشتراكات مسجلة لهذا المتجر.
                </TableCell>
              </TableRow>
            ) : (
              subscriptions.map((sub) => {
                const statusLabel =
                  sub.status === "active"
                    ? "نشط"
                    : sub.status === "canceled"
                    ? "ملغى"
                    : sub.status === "expired"
                    ? "منتهي"
                    : sub.status;

                return (
                  <TableRow key={sub.id}>
                    <TableCell className="text-[11px]">
                      <Badge variant="outline" className="px-1.5 text-[11px]">
                        {sub.plan_code}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[11px]">
                      {sub.billing_cycle === "monthly"
                        ? "شهري"
                        : sub.billing_cycle === "yearly"
                        ? "سنوي"
                        : sub.billing_cycle}
                    </TableCell>
                    <TableCell className="text-[11px]">
                      {sub.price_cents / 100}
                    </TableCell>
                    <TableCell className="text-[11px]">
                      <Badge variant="outline" className="px-1.5 text-[11px]">
                        {statusLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[10px] text-slate-600">
                      {new Date(sub.start_at).toLocaleString("ar-EG")}
                    </TableCell>
                    <TableCell className="text-[10px] text-slate-600">
                      {sub.end_at
                        ? new Date(sub.end_at).toLocaleString("ar-EG")
                        : "-"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
