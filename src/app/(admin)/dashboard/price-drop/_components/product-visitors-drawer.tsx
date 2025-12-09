"use client";

import { useEffect, useState } from "react";
import { HighInterestProduct } from "../page";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Visitor = {
  salla_customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  first_view_at: string;
  last_view_at: string;
  views_count: number;
};

type Preset = "today" | "last7" | "last30" | "thisMonth" | "custom";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: HighInterestProduct | null;
};

export function ProductVisitorsDrawer({ open, onOpenChange, product }: Props) {
  const [preset, setPreset] = useState<Preset>("last30");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !product) return;

    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("product_id", String(product!.product_id));
        if (preset !== "custom") {
          params.set("preset", preset);
        } else if (from && to) {
          params.set("from", from);
          params.set("to", to);
        }

        const res = await fetch(
          `/api/dashboard/price-drop/product-visitors?${params.toString()}`,
        );
        if (!res.ok) throw new Error("failed");
        const data = await res.json();

        setVisitors(
          (data.visitors ?? []).map((v: any) => ({
            ...v,
            views_count: Number(v.views_count ?? 0),
          })),
        );

        if (preset !== "custom" && data.range) {
          setFrom(data.range.from?.slice(0, 10) ?? "");
          setTo(data.range.to?.slice(0, 10) ?? "");
        }
      } catch (e) {
        console.error(e);
        setVisitors([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [open, product, preset, from, to]);

  const title = product?.product_title || product?.product_id || "";

  const totalViews = visitors.reduce(
    (sum, v) => sum + (v.views_count || 0),
    0,
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex max-h-[90vh] min-h-[60vh] flex-col overflow-hidden rounded-t-3xl border-t bg-background px-6"
      >
        <SheetHeader className="mb-3 text-right">
          <SheetTitle className="text-base font-semibold">
            العملاء الذين شاهدوا المنتج
          </SheetTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {title} — عدد العملاء: {visitors.length} — عدد الزيارات:{" "}
            {totalViews}
          </p>
        </SheetHeader>

        {/* الفلاتر */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap gap-2">
            <PresetChip
              label="اليوم"
              active={preset === "today"}
              onClick={() => setPreset("today")}
            />
            <PresetChip
              label="آخر ٧ أيام"
              active={preset === "last7"}
              onClick={() => setPreset("last7")}
            />
            <PresetChip
              label="آخر ٣٠ يوم"
              active={preset === "last30"}
              onClick={() => setPreset("last30")}
            />
            <PresetChip
              label="هذا الشهر"
              active={preset === "thisMonth"}
              onClick={() => setPreset("thisMonth")}
            />
            <PresetChip
              label="تاريخ مخصص"
              active={preset === "custom"}
              onClick={() => setPreset("custom")}
            />
          </div>

          <div className="flex items-center gap-2">
            <span>من</span>
            <Input
              type="date"
              className="h-8 w-[150px]"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPreset("custom");
              }}
            />
            <span>إلى</span>
            <Input
              type="date"
              className="h-8 w-[150px]"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPreset("custom");
              }}
            />
          </div>
        </div>

        {/* جدول الزوار */}
        <div className="flex-1 overflow-auto rounded-2xl border bg-card">
          <div className="flex items-center justify-between px-5 py-3">
            <div className="text-sm font-medium">تفاصيل العملاء</div>
            {loading && (
              <span className="text-xs text-muted-foreground">
                جاري التحميل...
              </span>
            )}
          </div>

          <div className="max-h-full overflow-auto px-3 pb-3">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* من اليمين لليسار: العميل | الإيميل | الجوال | عدد الزيارات | أول زيارة | آخر زيارة */}
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">الإيميل</TableHead>
                  <TableHead className="text-right">الجوال</TableHead>
                  <TableHead className="text-right">عدد الزيارات</TableHead>
                  <TableHead className="text-right">أول زيارة</TableHead>
                  <TableHead className="text-right">آخر زيارة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visitors.length === 0 && !loading && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      لا يوجد عملاء في المدة المحددة.
                    </TableCell>
                  </TableRow>
                )}

                {visitors.map((v) => (
                  <TableRow
                    key={
                      v.salla_customer_id ||
                      v.customer_email ||
                      v.first_view_at
                    }
                  >
                    {/* العميل */}
                    <TableCell className="text-sm">
                      <div className="flex flex-col gap-1">
                        <span>
                          {v.customer_name ||
                            v.customer_email ||
                            v.customer_phone ||
                            "عميل بدون اسم"}
                        </span>
                        {v.salla_customer_id && (
                          <span className="text-[11px] text-muted-foreground">
                            ID: {v.salla_customer_id}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* الإيميل */}
                    <TableCell className="text-xs whitespace-nowrap">
                      {v.customer_email || "-"}
                    </TableCell>

                    {/* الجوال */}
                    <TableCell className="text-xs whitespace-nowrap">
                      {v.customer_phone || "-"}
                    </TableCell>

                    {/* عدد الزيارات */}
                    <TableCell className="text-sm font-medium">
                      {v.views_count}
                    </TableCell>

                    {/* أول زيارة */}
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(v.first_view_at)}
                    </TableCell>

                    {/* آخر زيارة */}
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(v.last_view_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("en-GB");
  } catch {
    return value;
  }
}

type PresetChipProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

function PresetChip({ label, active, onClick }: PresetChipProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      className={cn(
        "h-8 rounded-full px-3 text-xs",
        active ? "" : "bg-background",
      )}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
