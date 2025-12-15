"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type VisitorRow = {
  store_id: string;
  salla_customer_id: string;
  visitor_id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  first_linked_at: string;
  last_seen_at: string;
  page_views_count: number;
  product_views_count: number;

  vehicle_brand_name?: string | null;
  vehicle_model_name?: string | null;
  vehicle_year_text?: string | null;
  vehicle_signals_7d?: number | null;
};

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString("ar-SA-u-ca-gregory-nu-latn", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return dt;
  }
}

export default function VisitorsTable({
  items,
  loading,
  onOpenJourney,
}: {
  items: VisitorRow[];
  loading: boolean;
  onOpenJourney: (row: VisitorRow) => void;
}) {
  return (
    <div className="rounded-2xl border bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>العميل</TableHead>
            <TableHead>السيارة</TableHead>
            <TableHead>الجوال</TableHead>
            <TableHead>الإيميل</TableHead>
            <TableHead>آخر ظهور</TableHead>
            <TableHead>زيارات</TableHead>
            <TableHead>مشاهدات منتجات</TableHead>
            <TableHead className="text-left">إجراء</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center">
                جاري التحميل...
              </TableCell>
            </TableRow>
          )}

          {!loading &&
            items.map((r) => {
              const brand = r.vehicle_brand_name || null;
              const model = r.vehicle_model_name || null;
              const year = r.vehicle_year_text || null;
              const hasAny = Boolean(brand || model || year);

              return (
                <TableRow key={`${r.salla_customer_id}-${r.visitor_id}`}>
                  <TableCell>
                    <div className="font-medium">{r.customer_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.salla_customer_id}
                    </div>
                  </TableCell>

                  {/* ✅ السيارة: اعرض الموجود فقط */}
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {brand ? <Badge variant="secondary">{brand}</Badge> : null}
                      {model ? <Badge variant="secondary">{model}</Badge> : null}
                      {year ? <Badge variant="secondary">{year}</Badge> : null}

                      {!hasAny ? <Badge variant="outline">لا توجد بيانات</Badge> : null}

                      {typeof r.vehicle_signals_7d === "number" && r.vehicle_signals_7d > 0 ? (
                        <Badge variant="outline">إشارات: {r.vehicle_signals_7d}</Badge>
                      ) : null}
                    </div>
                  </TableCell>

                  <TableCell>{r.customer_phone || "—"}</TableCell>
                  <TableCell>{r.customer_email || "—"}</TableCell>
                  <TableCell>{fmt(r.last_seen_at)}</TableCell>
                  <TableCell>{r.page_views_count}</TableCell>
                  <TableCell>{r.product_views_count}</TableCell>

                  <TableCell className="text-left">
                    <Button variant="outline" onClick={() => onOpenJourney(r)}>
                      عرض الرحلة
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}

          {!loading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                لا توجد نتائج
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
