"use client";

import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { ChevronDownIcon } from "lucide-react";

import { HighInterestProduct } from "../page";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  onCreateCampaign: (product: HighInterestProduct) => void;
  onShowVisitors: (product: HighInterestProduct) => void;
};

type Preset = "today" | "last7" | "last30" | "thisMonth" | "custom";
type SortKey = "views" | "viewers" | "last" | "price";
type TabKey = "products" | "customers";

type HighInterestCustomer = {
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  total_views: number;
  products_count: number;
  last_view_at: string | null;
};

type CustomerProduct = {
  product_id: string;
  product_title: string | null;
  product_url: string | null;
  current_price: number | null;
  total_views: number;
  last_view_at: string | null;
};

export function HighInterestProductsTable({
  onCreateCampaign,
  onShowVisitors,
}: Props) {
  const [tab, setTab] = useState<TabKey>("products");

  const [items, setItems] = useState<HighInterestProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [customers, setCustomers] = useState<HighInterestCustomer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);

  const [preset, setPreset] = useState<Preset>("last30");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [sort, setSort] = useState<SortKey>("views");

  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [dateOpen, setDateOpen] = useState(false);

  const [minViews, setMinViews] = useState<number>(1);
  const [minViewers, setMinViewers] = useState<number>(1);

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Dialog عرض منتجات العميل
  const [customerProductsOpen, setCustomerProductsOpen] = useState(false);
  const [customerProductsLoading, setCustomerProductsLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    useState<HighInterestCustomer | null>(null);
  const [customerProducts, setCustomerProducts] = useState<CustomerProduct[]>(
    [],
  );

  // تحميل المنتجات (نفس منطقك الأصلي)
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (cancelled) return;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (preset !== "custom") {
          params.set("preset", preset);
        } else if (from && to) {
          params.set("from", from);
          params.set("to", to);
        }
        params.set("sort", sort);
        params.set("min_views", String(minViews || 1));
        params.set("min_viewers", String(minViewers || 1));

        const res = await fetch(
          `/api/dashboard/price-drop/top-products?${params.toString()}`,
        );
        if (!res.ok) throw new Error("failed");
        const data = await res.json();

        setItems(data.items ?? []);

        if (preset !== "custom" && data.range) {
          const fromStr = data.range.from?.slice(0, 10) ?? "";
          const toStr = data.range.to?.slice(0, 10) ?? "";
          setFrom(fromStr);
          setTo(toStr);

          if (fromStr && toStr) {
            setRange({
              from: new Date(fromStr),
              to: new Date(toStr),
            });
          }
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [preset, from, to, sort, minViews, minViewers]);

  // تحميل العملاء لما يكون تبويب العملاء مفتوح
  useEffect(() => {
    if (tab !== "customers") return;

    let cancelled = false;

    async function loadCustomers() {
      if (cancelled) return;
      setCustomersLoading(true);
      try {
        const params = new URLSearchParams();
        if (preset !== "custom") {
          params.set("preset", preset);
        } else if (from && to) {
          params.set("from", from);
          params.set("to", to);
        }
        params.set("min_views", String(minViews || 1));
        params.set("min_viewers", String(minViewers || 1));

        const res = await fetch(
          `/api/dashboard/price-drop/top-customers?${params.toString()}`,
        );
        if (!res.ok) throw new Error("failed");
        const data = await res.json();

        setCustomers(data.items ?? []);
      } catch {
        if (!cancelled) setCustomers([]);
      } finally {
        if (!cancelled) setCustomersLoading(false);
      }
    }

    loadCustomers();
    return () => {
      cancelled = true;
    };
  }, [tab, preset, from, to, minViews, minViewers]);

  // لو تغيّرت الفلاتر رجّع صفحة المنتجات للأولى
  useEffect(() => {
    setPage(1);
  }, [preset, from, to, sort, minViews, minViewers]);

  const formatDate = (d: Date) => d.toLocaleDateString("en-GB");

  const formatRangeLabel = () => {
    if (range?.from && range?.to) {
      return `${formatDate(range.from)} - ${formatDate(range.to)}`;
    }
    if (range?.from) {
      return `${formatDate(range.from)} - ...`;
    }
    return "اختر المدة";
  };

  const applyRange = () => {
    if (!range?.from || !range?.to) return;
    const fromStr = range.from.toISOString().slice(0, 10);
    const toStr = range.to.toISOString().slice(0, 10);
    setFrom(fromStr);
    setTo(toStr);
    setPreset("custom");
    setDateOpen(false);
  };

  // Pagination للمنتجات
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pagedItems = items.slice(startIndex, endIndex);

  // تحميل منتجات عميل معيّن وفتح الـ Dialog
  const handleShowCustomerProducts = async (customer: HighInterestCustomer) => {
    if (!customer.customer_id) return;

    setSelectedCustomer(customer);
    setCustomerProductsOpen(true);
    setCustomerProducts([]);
    setCustomerProductsLoading(true);

    try {
      const params = new URLSearchParams();
      if (preset !== "custom") {
        params.set("preset", preset);
      } else if (from && to) {
        params.set("from", from);
        params.set("to", to);
      }
      params.set("customer_id", customer.customer_id);

      const res = await fetch(
        `/api/dashboard/price-drop/customer-products?${params.toString()}`,
      );
      if (!res.ok) throw new Error("failed");

      const data = await res.json();
      setCustomerProducts((data.items ?? []) as CustomerProduct[]);
    } catch (e) {
      console.error("failed to load customer products", e);
      setCustomerProducts([]);
    } finally {
      setCustomerProductsLoading(false);
    }
  };

  return (
    <>
      <Card className="rounded-2xl">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold">
                المنتجات ذات الاهتمام العالي
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                تقدر تشوف المنتجات أو العملاء حسب نفس الفترة والشروط.
              </p>
            </div>

            {/* Tabs بسيطة */}
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                className={cn(
                  "rounded-full px-3 py-1",
                  tab === "products"
                    ? "bg-primary text-primary-foreground"
                    : "border bg-background text-foreground",
                )}
                onClick={() => setTab("products")}
              >
                حسب المنتجات
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-full px-3 py-1",
                  tab === "customers"
                    ? "bg-primary text-primary-foreground"
                    : "border bg-background text-foreground",
                )}
                onClick={() => setTab("customers")}
              >
                حسب العملاء
              </button>
            </div>
          </div>

          {/* فلاتر التاريخ + الفرز (مشتركة) */}
          <div className="flex flex-wrap items-center justify-between gap-3">
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

            <div className="flex flex-wrap items-center gap-3 text-xs">
              {/* المدة من/إلى */}
              <div className="flex items-center gap-1">
                <span>المدة</span>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-8 w-[220px] justify-between rounded-full px-3 text-xs"
                    >
                      <span className="truncate text-right">
                        {formatRangeLabel()}
                      </span>
                      <ChevronDownIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto overflow-hidden p-0"
                    align="end"
                  >
                    <Calendar
                      mode="range"
                      selected={range}
                      captionLayout="dropdown"
                      numberOfMonths={2}
                      onSelect={(value) => setRange(value)}
                    />
                    <div className="flex items-center justify-end gap-2 border-t px-3 py-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setRange(undefined);
                          setFrom("");
                          setTo("");
                          setPreset("custom");
                        }}
                      >
                        مسح
                      </Button>
                      <Button
                        size="sm"
                        onClick={applyRange}
                        disabled={!range?.from || !range?.to}
                      >
                        تطبيق
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* الترتيب + الحد الأدنى */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span>ترتيب حسب</span>
                  <Select
                    value={sort}
                    onValueChange={(v) => setSort(v as SortKey)}
                  >
                    <SelectTrigger className="h-8 w-[150px] text-xs">
                      <SelectValue placeholder="الترتيب" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="views">عدد المشاهدات</SelectItem>
                      <SelectItem value="viewers">عدد العملاء</SelectItem>
                      <SelectItem value="last">آخر مشاهدة</SelectItem>
                      <SelectItem value="price">السعر الحالي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                  <span>حد أدنى</span>
                  <div className="flex items-center gap-1">
                    <span>مشاهدات</span>
                    <input
                      type="number"
                      min={1}
                      className="h-8 w-16 rounded-full border px-2 text-xs text-right"
                      value={minViews}
                      onChange={(e) =>
                        setMinViews(
                          e.target.value ? Number(e.target.value) : 1,
                        )
                      }
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span>عملاء</span>
                    <input
                      type="number"
                      min={1}
                      className="h-8 w-16 rounded-full border px-2 text-xs text-right"
                      value={minViewers}
                      onChange={(e) =>
                        setMinViewers(
                          e.target.value ? Number(e.target.value) : 1,
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* تبويب المنتجات */}
          {tab === "products" && (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المنتج</TableHead>
                      <TableHead className="text-right">السعر الحالي</TableHead>
                      <TableHead className="text-right">المشاهدات</TableHead>
                      <TableHead className="text-right">عدد العملاء</TableHead>
                      <TableHead className="text-right">آخر مشاهدة</TableHead>
                      <TableHead className="text-center">العملاء</TableHead>
                      <TableHead className="text-center">إجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="py-6 text-center text-sm"
                        >
                          جاري التحميل...
                        </TableCell>
                      </TableRow>
                    )}

                    {!loading && pagedItems.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="py-6 text-center text-sm"
                        >
                          لا توجد منتجات ضمن هذه المدة / الشروط حتى الآن.
                        </TableCell>
                      </TableRow>
                    )}

                    {!loading &&
                      pagedItems.map((item) => (
                        <TableRow key={item.product_id}>
                          <TableCell className="max-w-[260px]">
                            <div className="flex flex-col gap-1">
                              <span className="line-clamp-2 text-sm font-medium">
                                {item.product_title || item.product_id}
                              </span>
                              {item.product_url && (
                                <a
                                  className="text-xs text-muted-foreground underline underline-offset-4"
                                  href={item.product_url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  عرض في المتجر
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {item.current_price != null
                              ? `${item.current_price} ر.س`
                              : "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {item.total_views}
                          </TableCell>
                          <TableCell className="text-sm">
                            {item.unique_viewers}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {item.last_view_at
                              ? new Date(
                                  item.last_view_at,
                                ).toLocaleString("en-GB")
                              : "-"}
                          </TableCell>

                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
                              onClick={() => onShowVisitors(item)}
                            >
                              عرض العملاء
                            </Button>
                          </TableCell>

                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              className="rounded-xl"
                              onClick={() => onCreateCampaign(item)}
                            >
                              إنشاء حملة خصم
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {!loading && totalItems > 0 && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <button
                      className="h-7 w-7 rounded-full border px-1 disabled:opacity-40"
                      onClick={() => setPage(1)}
                      disabled={safePage === 1}
                    >
                      {"|<"}
                    </button>
                    <button
                      className="h-7 w-7 rounded-full border px-1 disabled:opacity-40"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                    >
                      {"<"}
                    </button>
                    <span className="px-2">
                      {safePage} / {totalPages}
                    </span>
                    <button
                      className="h-7 w-7 rounded-full border px-1 disabled:opacity-40"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                    >
                      {">"}
                    </button>
                    <button
                      className="h-7 w-7 rounded-full border px-1 disabled:opacity-40"
                      onClick={() => setPage(totalPages)}
                      disabled={safePage === totalPages}
                    >
                      {">|"}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span>إظهار</span>
                    <select
                      className="h-8 rounded-full border px-2 text-xs"
                      value={pageSize}
                      onChange={(e) => {
                        const size = Number(e.target.value) || 10;
                        setPageSize(size);
                        setPage(1);
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span>
                      صفوف – عرض {startIndex + 1} إلى{" "}
                      {Math.min(endIndex, totalItems)} من {totalItems}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* تبويب العملاء */}
          {tab === "customers" && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-right">
                      البريد / الهاتف
                    </TableHead>
                    <TableHead className="text-right">
                      عدد المنتجات التي زارها
                    </TableHead>
                    <TableHead className="text-right">
                      إجمالي المشاهدات
                    </TableHead>
                    <TableHead className="text-right">آخر زيارة</TableHead>
                    <TableHead className="text-center">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customersLoading && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-6 text-center text-sm"
                      >
                        جاري التحميل...
                      </TableCell>
                    </TableRow>
                  )}

                  {!customersLoading && customers.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-6 text-center text-sm"
                      >
                        لا يوجد عملاء ضمن هذه المدة / الشروط حتى الآن.
                      </TableCell>
                    </TableRow>
                  )}

                  {!customersLoading &&
                    customers.map((c, idx) => (
                      <TableRow key={c.customer_id ?? idx}>
                        <TableCell className="max-w-[220px]">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium">
                              {c.customer_name ||
                                c.customer_email ||
                                c.customer_phone ||
                                "عميل بدون اسم"}
                            </span>
                            {c.customer_id && (
                              <span className="text-[11px] text-muted-foreground">
                                ID: {c.customer_id}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {c.customer_email && <div>{c.customer_email}</div>}
                          {c.customer_phone && (
                            <div className="text-muted-foreground">
                              {c.customer_phone}
                            </div>
                          )}
                          {!c.customer_email && !c.customer_phone && "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {c.products_count}
                        </TableCell>
                        <TableCell className="text-sm">
                          {c.total_views}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {c.last_view_at
                            ? new Date(
                                c.last_view_at,
                              ).toLocaleString("en-GB")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => handleShowCustomerProducts(c)}
                          >
                            عرض المنتجات
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: منتجات العميل */}
      <Dialog
        open={customerProductsOpen}
        onOpenChange={(open) => {
          setCustomerProductsOpen(open);
          if (!open) {
            setSelectedCustomer(null);
            setCustomerProducts([]);
          }
        }}
      >
        <DialogContent className="max-w-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base">
              المنتجات التي زارها العميل{" "}
              {selectedCustomer?.customer_name ||
                selectedCustomer?.customer_email ||
                selectedCustomer?.customer_phone ||
                ""}
            </DialogTitle>
          </DialogHeader>

          {customerProductsLoading && (
            <div className="py-6 text-center text-sm">جاري التحميل...</div>
          )}

          {!customerProductsLoading && customerProducts.length === 0 && (
            <div className="py-6 text-center text-sm">
              لا توجد منتجات ضمن هذه المدة / الشروط لهذا العميل.
            </div>
          )}

          {!customerProductsLoading && customerProducts.length > 0 && (
            <div className="mt-2 max-h-[420px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">المنتج</TableHead>
                    <TableHead className="text-right">السعر الحالي</TableHead>
                    <TableHead className="text-right">
                      عدد المشاهدات من هذا العميل
                    </TableHead>
                    <TableHead className="text-right">آخر زيارة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerProducts.map((p) => (
                    <TableRow key={p.product_id}>
                      <TableCell className="max-w-[260px]">
                        <div className="flex flex-col gap-1">
                          <span className="line-clamp-2 text-sm font-medium">
                            {p.product_title || p.product_id}
                          </span>
                          {p.product_url && (
                            <a
                              className="text-xs text-muted-foreground underline underline-offset-4"
                              href={p.product_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              عرض في المتجر
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {p.current_price != null
                          ? `${p.current_price} ر.س`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {p.total_views}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {p.last_view_at
                          ? new Date(
                              p.last_view_at,
                            ).toLocaleString("en-GB")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
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
