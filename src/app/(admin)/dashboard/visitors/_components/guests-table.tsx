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

export type GuestRow = {
  store_id: string;
  visitor_id: string;
  last_seen_at: string;
  page_views_count: number;

  vehicle_brand_name?: string | null;
  vehicle_model_name?: string | null;
  vehicle_year_text?: string | null;
  vehicle_signals_7d?: number | null;
};

<<<<<<< HEAD
function fmt(dt: string) {
=======
function fmt(dt?: string | null) {
  if (!dt) return "—";
>>>>>>> b8e0e03 (init)
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

export default function GuestsTable({
  items,
  loading,
  onOpenJourney,
}: {
  items: GuestRow[];
  loading: boolean;
  onOpenJourney: (row: GuestRow) => void;
}) {
  return (
    <div className="rounded-2xl border bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>visitor_id</TableHead>
            <TableHead>السيارة</TableHead>
            <TableHead>آخر ظهور</TableHead>
            <TableHead>زيارات</TableHead>
            <TableHead className="text-left">إجراء</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center">
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

<<<<<<< HEAD
=======
              const signals =
                typeof r.vehicle_signals_7d === "number" ? r.vehicle_signals_7d : 0;

>>>>>>> b8e0e03 (init)
              return (
                <TableRow key={r.visitor_id}>
                  <TableCell className="font-mono text-xs break-all">
                    {r.visitor_id}
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {brand ? <Badge variant="secondary">{brand}</Badge> : null}
                      {model ? <Badge variant="secondary">{model}</Badge> : null}
                      {year ? <Badge variant="secondary">{year}</Badge> : null}

                      {!hasAny ? (
                        <Badge variant="outline">لا توجد بيانات</Badge>
                      ) : null}

<<<<<<< HEAD
                      {typeof r.vehicle_signals_7d === "number" && r.vehicle_signals_7d > 0 ? (
                        <Badge variant="outline">إشارات: {r.vehicle_signals_7d}</Badge>
=======
                      {signals > 0 ? (
                        <Badge variant="outline">إشارات: {signals}</Badge>
>>>>>>> b8e0e03 (init)
                      ) : null}
                    </div>
                  </TableCell>

                  <TableCell>{fmt(r.last_seen_at)}</TableCell>
<<<<<<< HEAD
                  <TableCell>{r.page_views_count}</TableCell>
=======
                  <TableCell>{Number(r.page_views_count || 0)}</TableCell>
>>>>>>> b8e0e03 (init)

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
<<<<<<< HEAD
              <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
=======
              <TableCell
                colSpan={5}
                className="py-10 text-center text-muted-foreground"
              >
>>>>>>> b8e0e03 (init)
                لا يوجد زوار بدون تسجيل دخول
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
