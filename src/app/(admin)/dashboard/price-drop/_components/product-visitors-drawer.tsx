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
import { User, Mail, Phone, Eye, Calendar, TrendingUp } from "lucide-react";

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
        <SheetHeader className="mb-4 text-right">
          <SheetTitle className="text-lg font-semibold flex items-center gap-2 justify-end">
            <Eye className="h-5 w-5 text-blue-500" />
            العملاء الذين شاهدوا المنتج
          </SheetTitle>
          <div className="mt-2 flex flex-wrap items-center gap-3 justify-end">
            <p className="text-sm text-muted-foreground truncate max-w-md">
              {title}
            </p>
            <div className="flex gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-600">
                <User className="h-3.5 w-3.5" />
                {visitors.length} عميل
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600">
                <TrendingUp className="h-3.5 w-3.5" />
                {totalViews} زيارة
              </span>
            </div>
          </div>
        </SheetHeader>

        {/* الفلاتر */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs bg-muted/30 rounded-xl p-3 border">
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
            <span className="text-muted-foreground">من</span>
            <Input
              type="date"
              className="h-8 w-[150px]"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPreset("custom");
              }}
            />
            <span className="text-muted-foreground">إلى</span>
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
        <div className="flex-1 overflow-auto rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-3">
            <div className="text-sm font-semibold">تفاصيل العملاء</div>
            {loading && (
              <span className="text-xs text-muted-foreground animate-pulse">
                جاري التحميل...
              </span>
            )}
          </div>

          <div className="max-h-full overflow-auto px-3 pb-3">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-right font-semibold">
                    <div className="flex items-center gap-2 justify-end">
                      <User className="h-4 w-4 text-muted-foreground" />
                      العميل
                    </div>
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    <div className="flex items-center gap-2 justify-end">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      الإيميل
                    </div>
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    <div className="flex items-center gap-2 justify-end">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      الجوال
                    </div>
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    <div className="flex items-center gap-2 justify-end">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      عدد الزيارات
                    </div>
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    <div className="flex items-center gap-2 justify-end">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      أول زيارة
                    </div>
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    <div className="flex items-center gap-2 justify-end">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      آخر زيارة
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visitors.length === 0 && !loading && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-12 text-center text-sm text-muted-foreground"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Eye className="h-8 w-8 text-muted-foreground/50" />
                        <span>لا يوجد عملاء في المدة المحددة.</span>
                      </div>
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
                    className="hover:bg-muted/50 transition-colors"
                  >
                    {/* العميل */}
                    <TableCell className="text-sm">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">
                          {v.customer_name ||
                            v.customer_email ||
                            v.customer_phone ||
                            "عميل بدون اسم"}
                        </span>
                        {v.salla_customer_id && (
                          <span className="text-[11px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5 w-fit">
                            ID: {v.salla_customer_id}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* الإيميل */}
                    <TableCell className="text-xs whitespace-nowrap">
                      {v.customer_email || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    {/* الجوال */}
                    <TableCell className="text-xs whitespace-nowrap font-mono">
                      {v.customer_phone || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    {/* عدد الزيارات */}
                    <TableCell className="text-sm">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 font-medium text-blue-600">
                        {v.views_count}
                      </span>
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
        "h-8 rounded-full px-3 text-xs transition-all hover:scale-105",
        active ? "shadow-sm" : "bg-background hover:bg-accent",
      )}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
