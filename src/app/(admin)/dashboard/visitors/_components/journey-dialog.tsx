"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { VisitorRow } from "./visitors-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLink, X, RefreshCw } from "lucide-react";

type JourneyRow = {
  occurred_at: string;
  path: string | null;
  page_url: string | null;
};

type ProductViewRow = {
  viewed_at: string;
  product_id: string;
  product_title: string | null;
  product_url: string | null;
};

type VehicleProfile = {
  visitor_id: string;
  brand_id: number | null;
  model_id: number | null;
  year_id: number | null;
  brand_name: string | null;
  model_name: string | null;
  year_text: string | null;
  signals_7d: number;
  last_signal_at: string | null;
<<<<<<< HEAD
} | null;

function fmt(dt: string) {
=======

  confidence?: "high" | "medium" | "low";
  score?: number;
  reasons?: string[];
} | null;

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
<<<<<<< HEAD
    return dt;
  }
}

=======
    return String(dt);
  }
}

function confidenceBadge(c?: "high" | "medium" | "low") {
  if (c === "high") return <Badge variant="secondary">ثقة عالية</Badge>;
  if (c === "medium") return <Badge variant="outline">ثقة متوسطة</Badge>;
  if (c === "low") return <Badge variant="outline">ثقة منخفضة</Badge>;
  return null;
}

>>>>>>> b8e0e03 (init)
export default function JourneyDialog({
  open,
  onOpenChange,
  customer,
<<<<<<< HEAD
=======
  from,
  to,
>>>>>>> b8e0e03 (init)
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customer: VisitorRow | null;
<<<<<<< HEAD
=======
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
>>>>>>> b8e0e03 (init)
}) {
  const [tab, setTab] = useState<"journey" | "products">("journey");
  const [journey, setJourney] = useState<JourneyRow[]>([]);
  const [products, setProducts] = useState<ProductViewRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [vehicle, setVehicle] = useState<VehicleProfile>(null);
  const [vehicleLoading, setVehicleLoading] = useState(false);

  const title = useMemo(() => {
    if (!customer) return "رحلة العميل";
    return `${customer.customer_name || "عميل"} — ${customer.salla_customer_id}`;
  }, [customer]);

<<<<<<< HEAD
  async function load(tabName: "journey" | "products", customerId: string) {
    setLoading(true);
    try {
      if (tabName === "journey") {
        const res = await fetch(
          `/api/dashboard/visitors/${customerId}/journey?limit=400`,
          { cache: "no-store" },
        );
        const data = await res.json();
        setJourney(data.items || []);
      } else {
        const res = await fetch(
          `/api/dashboard/visitors/${customerId}/products?limit=400`,
          { cache: "no-store" },
        );
        const data = await res.json();
        setProducts(data.items || []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadVehicleProfile(customerId: string) {
    setVehicleLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/visitors/${customerId}/vehicle-profile`,
=======
  const customerId = customer?.salla_customer_id || null;

  async function load(tabName: "journey" | "products", cid: string) {
  setLoading(true);
  try {
    const qs = new URLSearchParams();
    qs.set("limit", "400");
    qs.set("ts", String(Date.now()));

    // ✅ from/to فقط للرحلة
    if (tabName === "journey") {
      qs.set("from", from);
      qs.set("to", to);

      const res = await fetch(`/api/dashboard/visitors/${cid}/journey?${qs.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setJourney(data.items || []);
      return;
    }

    // ✅ products بدون from/to (يرجع مثل قبل)
    const res = await fetch(`/api/dashboard/visitors/${cid}/products?${qs.toString()}`, {
      cache: "no-store",
    });
    const data = await res.json();
    setProducts(data.items || []);
  } finally {
    setLoading(false);
  }
}


  // ✅ المهم: سيارة العميل المسجل تُجلب بالـ visitor_id من endpoint الضيوف (اللي شغال)
  async function loadVehicleProfile() {
    const visitorId = String(customer?.visitor_id || "").trim();
    if (!visitorId) {
      setVehicle(null);
      return;
    }

    setVehicleLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("from", from);
      qs.set("to", to);
      qs.set("limit", "2000");
      qs.set("ts", String(Date.now()));

      const res = await fetch(
        `/api/dashboard/visitors/guests/${encodeURIComponent(visitorId)}/vehicle-profile?${qs.toString()}`,
>>>>>>> b8e0e03 (init)
        { cache: "no-store" },
      );
      const data = await res.json();
      setVehicle(data.profile || null);
    } finally {
      setVehicleLoading(false);
    }
  }

  useEffect(() => {
<<<<<<< HEAD
    if (!open || !customer) return;
=======
    if (!open || !customerId) return;

>>>>>>> b8e0e03 (init)
    setTab("journey");
    setJourney([]);
    setProducts([]);
    setVehicle(null);
<<<<<<< HEAD
    load("journey", customer.salla_customer_id);
    loadVehicleProfile(customer.salla_customer_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customer?.salla_customer_id]);
=======

    load("journey", customerId);
    loadVehicleProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customerId, from, to]);
>>>>>>> b8e0e03 (init)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="
          p-0 overflow-hidden bg-white
          w-[100vw] sm:w-[100vw] sm:max-w-none
          [&>button.absolute]:hidden
        "
      >
        <SheetHeader className="px-6 py-4 border-b bg-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="text-base font-semibold">{title}</SheetTitle>

              <SheetDescription className="mt-2 text-xs leading-6 text-muted-foreground">
                <span className="whitespace-nowrap">
                  الجوال:{" "}
                  <b className="text-gray-900">{customer?.customer_phone || "—"}</b>
                </span>
                <span className="mx-2">•</span>
                <span className="whitespace-nowrap">
                  الإيميل:{" "}
                  <b className="text-gray-900">{customer?.customer_email || "—"}</b>
                </span>
                <span className="mx-2">•</span>
                <span className="font-mono text-[11px] break-all">
                  visitor_id: {customer?.visitor_id || "—"}
                </span>
              </SheetDescription>

              {/* ✅ سيارته المحتملة */}
              <div className="mt-3 rounded-2xl border bg-gray-50 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">سيارته المحتملة</div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!customer || vehicleLoading}
<<<<<<< HEAD
                    onClick={() => customer && loadVehicleProfile(customer.salla_customer_id)}
=======
                    onClick={() => loadVehicleProfile()}
>>>>>>> b8e0e03 (init)
                  >
                    {vehicleLoading ? "..." : "تحديث"}
                  </Button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {vehicleLoading && (
                    <>
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-6 w-16" />
                    </>
                  )}

                  {!vehicleLoading && !vehicle && (
                    <span className="text-xs text-muted-foreground">
                      لا توجد إشارات كافية حتى الآن
                    </span>
                  )}

                  {!vehicleLoading && vehicle && (
<<<<<<< HEAD
  <>
    {vehicle.brand_name ? <Badge variant="secondary">{vehicle.brand_name}</Badge> : null}

    {vehicle.model_name ? (
      <Badge variant="secondary">{vehicle.model_name}</Badge>
    ) : (
      <Badge variant="destructive">بدون موديل</Badge>
    )}

    {vehicle.year_text ? (
      <Badge variant="secondary">{vehicle.year_text}</Badge>
    ) : (
      <Badge variant="outline">بدون سنة</Badge>
    )}

    <Badge variant="outline">إشارات 7 أيام: {vehicle.signals_7d}</Badge>

    {vehicle.last_signal_at ? (
      <span className="text-xs text-muted-foreground">آخر إشارة: {fmt(vehicle.last_signal_at)}</span>
    ) : null}
  </>
)}

                </div>
=======
                    <>
                      {vehicle.brand_name ? (
                        <Badge variant="secondary">{vehicle.brand_name}</Badge>
                      ) : null}

                      {vehicle.model_name ? (
                        <Badge variant="secondary">{vehicle.model_name}</Badge>
                      ) : (
                        <Badge variant="destructive">بدون موديل</Badge>
                      )}

                      {vehicle.year_text ? (
                        <Badge variant="secondary">{vehicle.year_text}</Badge>
                      ) : (
                        <Badge variant="outline">بدون سنة</Badge>
                      )}

                      {confidenceBadge(vehicle.confidence)}

                      <Badge variant="outline">إشارات: {vehicle.signals_7d}</Badge>

                      {typeof vehicle.score === "number" ? (
                        <Badge variant="outline">Score: {vehicle.score}</Badge>
                      ) : null}

                      {vehicle.last_signal_at ? (
                        <span className="text-xs text-muted-foreground">
                          آخر إشارة: {fmt(vehicle.last_signal_at)}
                        </span>
                      ) : null}
                    </>
                  )}
                </div>

                {!vehicleLoading && vehicle && Array.isArray(vehicle.reasons) && vehicle.reasons.length > 0 && (
                  <div className="mt-3 rounded-xl border bg-white px-3 py-2">
                    <div className="text-xs font-semibold mb-1">ليش اخترناها؟</div>
                    <ul className="text-xs text-muted-foreground list-disc pr-5 space-y-1">
                      {vehicle.reasons.slice(0, 2).map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
>>>>>>> b8e0e03 (init)
              </div>
            </div>

            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </SheetClose>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList>
<<<<<<< HEAD
                <TabsTrigger
                  value="journey"
                  onClick={() => customer && load("journey", customer.salla_customer_id)}
                >
                  المسارات
                </TabsTrigger>
                <TabsTrigger
                  value="products"
                  onClick={() => customer && load("products", customer.salla_customer_id)}
                >
=======
                <TabsTrigger value="journey" onClick={() => customerId && load("journey", customerId)}>
                  المسارات
                </TabsTrigger>
                <TabsTrigger value="products" onClick={() => customerId && load("products", customerId)}>
>>>>>>> b8e0e03 (init)
                  المنتجات التي شاهدها
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              variant="secondary"
              size="sm"
<<<<<<< HEAD
              disabled={!customer || loading}
              onClick={() => {
                if (!customer) return;
                load(tab, customer.salla_customer_id);
              }}
=======
              disabled={!customerId || loading}
              onClick={() => customerId && load(tab, customerId)}
>>>>>>> b8e0e03 (init)
            >
              <RefreshCw className="h-4 w-4 ml-2" />
              تحديث
            </Button>
          </div>
        </SheetHeader>

        <div className="h-[calc(100vh-240px)] overflow-auto bg-gray-50 p-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsContent value="journey" className="m-0">
              <div className="rounded-2xl border bg-white overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">الوقت</TableHead>
                      <TableHead className="w-[240px]">المسار</TableHead>
                      <TableHead>الرابط</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {loading && (
                      <TableRow>
                        <TableCell colSpan={3} className="py-10 text-center">
                          جاري التحميل...
                        </TableCell>
                      </TableRow>
                    )}

                    {!loading &&
                      journey.map((j, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="whitespace-nowrap">{fmt(j.occurred_at)}</TableCell>
                          <TableCell className="font-mono text-xs">{j.path || "—"}</TableCell>
                          <TableCell className="truncate max-w-[520px]">
                            {j.page_url ? (
                              <a
                                className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                                href={j.page_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <span className="truncate">{j.page_url}</span>
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}

                    {!loading && journey.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                          لا توجد بيانات
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="products" className="m-0">
              <div className="rounded-2xl border bg-white overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">الوقت</TableHead>
                      <TableHead>المنتج</TableHead>
                      <TableHead>الرابط</TableHead>
                      <TableHead className="text-left w-[240px]">تسويق</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {loading && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-10 text-center">
                          جاري التحميل...
                        </TableCell>
                      </TableRow>
                    )}

                    {!loading &&
                      products.map((p, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="whitespace-nowrap">{fmt(p.viewed_at)}</TableCell>

                          <TableCell>
                            <div className="font-medium">{p.product_title || p.product_id}</div>
                            <div className="text-xs text-muted-foreground font-mono">{p.product_id}</div>
                          </TableCell>

                          <TableCell className="truncate max-w-[520px]">
                            {p.product_url ? (
                              <a
                                className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                                href={p.product_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <span className="truncate">{p.product_url}</span>
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            ) : (
                              "—"
                            )}
                          </TableCell>

                          <TableCell className="text-left">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/dashboard/price-drop?intent=create&product_id=${encodeURIComponent(
                                  p.product_id,
                                )}&customer_id=${encodeURIComponent(
                                  customer?.salla_customer_id || "",
                                )}&source=visitors_journey`}
                              >
                                <Button size="sm">إنشاء حملة</Button>
                              </Link>

                              <Link
                                href={`/dashboard/price-drop?intent=list&product_id=${encodeURIComponent(
                                  p.product_id,
                                )}&source=visitors_journey`}
                              >
                                <Button size="sm" variant="outline">
                                  عرض الحملات
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}

                    {!loading && products.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                          لا توجد مشاهدات منتجات
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
