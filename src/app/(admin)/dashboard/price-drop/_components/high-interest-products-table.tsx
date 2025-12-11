"use client";

import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import {
  ChevronDownIcon,
  TrendingUp,
  Eye,
  Users,
  Clock,
  DollarSign,
  Package,
  User,
  Mail,
  Phone,
  ShoppingBag,
  ArrowUpDown,
} from "lucide-react";

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
import { CustomerProductsDialog } from "./customer-products-dialog";
import { LoadingState } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
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

export type CustomerProduct = {
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

  const [customerProductsOpen, setCustomerProductsOpen] = useState(false);
  const [customerProductsLoading, setCustomerProductsLoading] =
    useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    useState<HighInterestCustomer | null>(null);
  const [customerProducts, setCustomerProducts] = useState<CustomerProduct[]>(
    [],
  );

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

  const withCampaignInfo = items as (HighInterestProduct & {
    has_active_campaign?: boolean;
    new_viewers_count?: number;
    active_campaign_id?: number | null;
  })[];

  const filteredItems = withCampaignInfo.filter((item) => {
    const hasActive = item.has_active_campaign;
    const newViewers = item.new_viewers_count ?? 0;

    if (!hasActive) return true;
    if (hasActive && newViewers <= 0) return false;
    return true;
  });

  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pagedItems = filteredItems.slice(startIndex, endIndex);

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

  const handleCreateCampaignFromCustomerProduct = (p: CustomerProduct) => {
    const product: HighInterestProduct = {
      product_id: p.product_id,
      product_title: p.product_title,
      product_url: p.product_url,
      current_price: p.current_price,
      total_views: p.total_views,
      unique_viewers: 1,
      last_view_at: p.last_view_at,
    } as HighInterestProduct;

    onCreateCampaign(product);
  };

  return (
    <>
      <Card className="rounded-xl shadow-sm border-muted/40">
        <CardHeader className="space-y-4 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-lg font-semibold">
                  المنتجات ذات الاهتمام العالي
                </CardTitle>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                تقدر تشوف المنتجات أو العملاء حسب نفس الفترة والشروط
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border bg-muted/30 p-1">
              <button
                type="button"
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  tab === "products"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setTab("products")}
              >
                <Package className="h-3.5 w-3.5" />
                حسب المنتجات
              </button>
              <button
                type="button"
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  tab === "customers"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setTab("customers")}
              >
                <Users className="h-3.5 w-3.5" />
                حسب العملاء
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 p-3">
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
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">المدة</span>
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

              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">ترتيب حسب</span>
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

              <div className="flex items-center gap-2 rounded-full border bg-background px-3 py-1.5">
                <span className="text-[11px] text-muted-foreground">
                  حد أدنى
                </span>
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3 text-muted-foreground" />
                  <input
                    type="number"
                    min={1}
                    className="h-6 w-14 rounded border bg-background px-1.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-ring"
                    value={minViews}
                    onChange={(e) =>
                      setMinViews(e.target.value ? Number(e.target.value) : 1)
                    }
                  />
                </div>
                <div className="h-3 w-px bg-border" />
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <input
                    type="number"
                    min={1}
                    className="h-6 w-14 rounded border bg-background px-1.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-ring"
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
        </CardHeader>

        <CardContent className="pt-0">
          {tab === "products" && (
            <>
              <div className="overflow-x-auto rounded-xl border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-right font-semibold">
                        <div className="flex items-center gap-2 justify-end">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          المنتج
                        </div>
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        <div className="flex items-center gap-2 justify-end">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          السعر الحالي
                        </div>
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        <div className="flex items-center gap-2 justify-end">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          المشاهدات
                        </div>
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        <div className="flex items-center gap-2 justify-end">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          عدد العملاء
                        </div>
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        <div className="flex items-center gap-2 justify-end">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          آخر مشاهدة
                        </div>
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        العملاء
                      </TableHead>
                      <TableHead className="text-center font-semibold">
                        إجراء
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <LoadingState message="جاري تحميل المنتجات" />
                        </TableCell>
                      </TableRow>
                    )}

                    {!loading && pagedItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <EmptyState
                            icon={Package}
                            title="لا توجد منتجات"
                            description="لا توجد منتجات ضمن هذه المدة أو الشروط"
                          />
                        </TableCell>
                      </TableRow>
                    )}

                    {!loading &&
                      pagedItems.map((item) => {
                        const anyItem = item as any;
                        const hasActive = anyItem
                          .has_active_campaign as boolean | undefined;
                        const newViewers =
                          (anyItem.new_viewers_count as number | undefined) ??
                          0;
                        const activeCampaignId =
                          (anyItem.active_campaign_id as number | undefined) ??
                          null;

                        return (
                          <TableRow
                            key={item.product_id}
                            className="hover:bg-muted/50 transition-colors"
                          >
                            <TableCell className="max-w-[260px]">
                              <div className="flex flex-col gap-1">
                                <span className="line-clamp-2 text-sm font-medium">
                                  {item.product_title || item.product_id}
                                </span>
                                {item.product_url && (
                                  <a
                                    className="text-xs text-blue-500 hover:text-blue-600 underline underline-offset-4 transition-colors"
                                    href={item.product_url}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    عرض في المتجر
                                  </a>
                                )}

                                {hasActive && (
                                  <div className="mt-1 flex flex-col gap-1.5 text-xs">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="inline-flex items-center rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-600">
                                        حملة خصم نشطة
                                      </span>
                                      {newViewers > 0 && (
                                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
                                          {newViewers} عميل جديد
                                        </span>
                                      )}
                                    </div>

                                    {newViewers > 0 && activeCampaignId && (
                                      <button
                                        type="button"
                                        className="inline-flex w-fit items-center rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                                        onClick={async () => {
                                          try {
                                            const res = await fetch(
                                              `/api/dashboard/price-drop/campaigns/${activeCampaignId}`,
                                              {
                                                method: "POST",
                                                headers: {
                                                  "Content-Type":
                                                    "application/json",
                                                },
                                                body: JSON.stringify({
                                                  action: "attach_new_viewers",
                                                }),
                                              },
                                            );
                                            if (!res.ok) {
                                              console.error(
                                                "failed to attach new viewers",
                                              );
                                              return;
                                            }

                                            setItems((prev) =>
                                              prev.map((p) =>
                                                p.product_id === item.product_id
                                                  ? ({
                                                      ...(p as any),
                                                      new_viewers_count: 0,
                                                    } as HighInterestProduct)
                                                  : p,
                                              ),
                                            );
                                          } catch (e) {
                                            console.error(e);
                                          }
                                        }}
                                      >
                                        ضم العملاء الجدد للحملة
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {item.current_price != null ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 font-medium text-green-600">
                                  {item.current_price} ر.س
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 font-medium text-blue-600">
                                {item.total_views}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm">
                              <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-1 font-medium text-purple-600">
                                {item.unique_viewers}
                              </span>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                              {item.last_view_at
                                ? new Date(item.last_view_at).toLocaleString(
                                    "en-GB",
                                  )
                                : "-"}
                            </TableCell>

                            <TableCell className="text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                                onClick={() => onShowVisitors(item)}
                              >
                                <Users className="h-3.5 w-3.5 ml-1" />
                                عرض العملاء
                              </Button>
                            </TableCell>

                            <TableCell className="text-center">
                              <Button
                                size="sm"
                                className="rounded-xl shadow-sm hover:shadow transition-shadow"
                                onClick={() => onCreateCampaign(item)}
                              >
                                <ShoppingBag className="h-3.5 w-3.5 ml-1" />
                                إنشاء حملة خصم
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>

              {!loading && totalItems > 0 && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <button
                      className="h-7 w-7 rounded-lg border bg-background hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => setPage(1)}
                      disabled={safePage === 1}
                    >
                      {"|<"}
                    </button>
                    <button
                      className="h-7 w-7 rounded-lg border bg-background hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                    >
                      {"<"}
                    </button>
                    <span className="px-3 font-medium text-foreground">
                      {safePage} / {totalPages}
                    </span>
                    <button
                      className="h-7 w-7 rounded-lg border bg-background hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={safePage === totalPages}
                    >
                      {">"}
                    </button>
                    <button
                      className="h-7 w-7 rounded-lg border bg-background hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => setPage(totalPages)}
                      disabled={safePage === totalPages}
                    >
                      {">|"}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span>إظهار</span>
                    <select
                      className="h-8 rounded-lg border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
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

          {tab === "customers" && (
            <div className="overflow-x-auto rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-right font-semibold">
                      <div className="flex items-center gap-2 justify-end">
                        <User className="h-4 w-4 text-muted-foreground" />
                        العميل
                      </div>
                    </TableHead>
                    <TableHead className="text-right font-semibold">
                      <div className="flex items-center gap-2 justify-end">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        البريد / الهاتف
                      </div>
                    </TableHead>
                    <TableHead className="text-right font-semibold">
                      <div className="flex items-center gap-2 justify-end">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        عدد المنتجات
                      </div>
                    </TableHead>
                    <TableHead className="text-right font-semibold">
                      <div className="flex items-center gap-2 justify-end">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        إجمالي المشاهدات
                      </div>
                    </TableHead>
                    <TableHead className="text-right font-semibold">
                      <div className="flex items-center gap-2 justify-end">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        آخر زيارة
                      </div>
                    </TableHead>
                    <TableHead className="text-center font-semibold">
                      إجراء
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customersLoading && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <LoadingState message="جاري تحميل العملاء" />
                      </TableCell>
                    </TableRow>
                  )}

                  {!customersLoading && customers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <EmptyState
                          icon={Users}
                          title="لا يوجد عملاء"
                          description="لا يوجد عملاء ضمن هذه المدة أو الشروط"
                        />
                      </TableCell>
                    </TableRow>
                  )}

                  {!customersLoading &&
                    customers.map((c, idx) => (
                      <TableRow
                        key={c.customer_id ?? idx}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <TableCell className="max-w-[220px]">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium">
                              {c.customer_name ||
                                c.customer_email ||
                                c.customer_phone ||
                                "عميل بدون اسم"}
                            </span>
                            {c.customer_id && (
                              <span className="text-[11px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5 w-fit">
                                ID: {c.customer_id}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex flex-col gap-0.5">
                            {c.customer_email && (
                              <div className="flex items-center gap-1.5">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                {c.customer_email}
                              </div>
                            )}
                            {c.customer_phone && (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {c.customer_phone}
                              </div>
                            )}
                            {!c.customer_email && !c.customer_phone && (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-1 font-medium text-orange-600">
                            {c.products_count}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 font-medium text-blue-600">
                            {c.total_views}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {c.last_view_at
                            ? new Date(c.last_view_at).toLocaleString("en-GB")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                            onClick={() => handleShowCustomerProducts(c)}
                          >
                            <Package className="h-3.5 w-3.5 ml-1" />
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

      <CustomerProductsDialog
        open={customerProductsOpen}
        onOpenChange={(open) => {
          setCustomerProductsOpen(open);
          if (!open) {
            setSelectedCustomer(null);
            setCustomerProducts([]);
          }
        }}
        customer={
          selectedCustomer
            ? {
                customer_id: selectedCustomer.customer_id,
                customer_name: selectedCustomer.customer_name,
                customer_email: selectedCustomer.customer_email,
                customer_phone: selectedCustomer.customer_phone,
              }
            : null
        }
        products={customerProducts}
        loading={customerProductsLoading}
        onCreateCampaignFromProduct={handleCreateCampaignFromCustomerProduct}
      />
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
        "h-8 rounded-full px-3 text-xs transition-all hover:scale-105",
        active ? "shadow-sm" : "bg-background hover:bg-accent",
      )}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
