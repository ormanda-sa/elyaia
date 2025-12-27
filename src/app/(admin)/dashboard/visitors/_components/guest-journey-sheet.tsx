"use client";

<<<<<<< HEAD
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose,
=======
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
>>>>>>> b8e0e03 (init)
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
<<<<<<< HEAD
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
=======
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
>>>>>>> b8e0e03 (init)
} from "@/components/ui/table";
import { ExternalLink, X, RefreshCw } from "lucide-react";
import type { GuestRow } from "./guests-table";

type JourneyRow = {
  occurred_at: string;
  path: string | null;
  page_url: string | null;
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
export default function GuestJourneySheet({
  open,
  onOpenChange,
  guest,
<<<<<<< HEAD
=======
  from,
  to,
>>>>>>> b8e0e03 (init)
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  guest: GuestRow | null;
<<<<<<< HEAD
}) {
=======
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}) {
  const activeVisitorId = useMemo(() => guest?.visitor_id || null, [guest?.visitor_id]);

>>>>>>> b8e0e03 (init)
  const [items, setItems] = useState<JourneyRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [vehicle, setVehicle] = useState<VehicleProfile>(null);
  const [vehicleLoading, setVehicleLoading] = useState(false);

<<<<<<< HEAD
  async function loadJourney(visitorId: string) {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/visitors/guests/${encodeURIComponent(visitorId)}/journey?limit=500`,
        { cache: "no-store" },
      );
      const data = await res.json();
      setItems(data.items || []);
    } finally {
      setLoading(false);
=======
  const journeyReqId = useRef(0);
  const vehicleReqId = useRef(0);

  async function loadJourney(visitorId: string) {
    const reqId = ++journeyReqId.current;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/visitors/guests/${encodeURIComponent(visitorId)}/journey?limit=500&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&ts=${Date.now()}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (reqId !== journeyReqId.current) return;
      setItems(data.items || []);
    } finally {
      if (reqId === journeyReqId.current) setLoading(false);
>>>>>>> b8e0e03 (init)
    }
  }

  async function loadVehicle(visitorId: string) {
<<<<<<< HEAD
    setVehicleLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/visitors/guests/${encodeURIComponent(visitorId)}/vehicle-profile`,
        { cache: "no-store" },
      );
      const t = await res.text();
      let data: any = null;
      try { data = JSON.parse(t); } catch { data = null; }
      setVehicle(data?.profile || null);
    } finally {
      setVehicleLoading(false);
=======
    const reqId = ++vehicleReqId.current;
    setVehicleLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/visitors/guests/${encodeURIComponent(visitorId)}/vehicle-profile?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=2000&ts=${Date.now()}`,
        { cache: "no-store" },
      );
      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
      if (reqId !== vehicleReqId.current) return;
      setVehicle(data?.profile || null);
    } finally {
      if (reqId === vehicleReqId.current) setVehicleLoading(false);
>>>>>>> b8e0e03 (init)
    }
  }

  useEffect(() => {
<<<<<<< HEAD
    if (!open || !guest) return;
    setItems([]);
    setVehicle(null);
    loadJourney(guest.visitor_id);
    loadVehicle(guest.visitor_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, guest?.visitor_id]);
=======
    if (!open || !activeVisitorId) return;
    setItems([]);
    setVehicle(null);
    loadJourney(activeVisitorId);
    loadVehicle(activeVisitorId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeVisitorId, from, to]);

  const hasVehicle = Boolean(vehicle && (vehicle.brand_name || vehicle.model_name || vehicle.year_text));
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
<<<<<<< HEAD
              <SheetTitle className="text-base font-semibold">زائر بدون تسجيل دخول</SheetTitle>
              <SheetDescription className="mt-2 text-xs text-muted-foreground">
                <span className="font-mono break-all">visitor_id: {guest?.visitor_id || "—"}</span>
              </SheetDescription>

              {/* ✅ سيارته المحتملة */}
=======
              <SheetTitle className="text-base font-semibold">
                زائر بدون تسجيل دخول
              </SheetTitle>
              <SheetDescription className="mt-2 text-xs text-muted-foreground">
                <span className="font-mono break-all">
                  visitor_id: {activeVisitorId || "—"}
                </span>
              </SheetDescription>

>>>>>>> b8e0e03 (init)
              <div className="mt-3 rounded-2xl border bg-gray-50 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">سيارته المحتملة</div>
                  <Button
                    variant="outline"
                    size="sm"
<<<<<<< HEAD
                    disabled={!guest || vehicleLoading}
                    onClick={() => guest && loadVehicle(guest.visitor_id)}
=======
                    disabled={!activeVisitorId || vehicleLoading}
                    onClick={() => activeVisitorId && loadVehicle(activeVisitorId)}
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
<<<<<<< HEAD
                    <span className="text-xs text-muted-foreground">لا توجد إشارات كافية حتى الآن</span>
=======
                    <span className="text-xs text-muted-foreground">
                      لا توجد إشارات كافية حتى الآن
                    </span>
>>>>>>> b8e0e03 (init)
                  )}

                  {!vehicleLoading && vehicle && (
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

<<<<<<< HEAD
                      <Badge variant="outline">إشارات 7 أيام: {vehicle.signals_7d}</Badge>
=======
                      {confidenceBadge(vehicle.confidence)}

                      <Badge variant="outline">إشارات: {vehicle.signals_7d}</Badge>

                      {typeof vehicle.score === "number" ? (
                        <Badge variant="outline">Score: {vehicle.score}</Badge>
                      ) : null}
>>>>>>> b8e0e03 (init)

                      {vehicle.last_signal_at ? (
                        <span className="text-xs text-muted-foreground">
                          آخر إشارة: {fmt(vehicle.last_signal_at)}
                        </span>
                      ) : null}
                    </>
                  )}
                </div>
<<<<<<< HEAD
=======

                {!vehicleLoading && vehicle && Array.isArray(vehicle.reasons) && vehicle.reasons.length > 0 && (
                  <div className="mt-3 rounded-xl border bg-white px-3 py-2">
                    <div className="text-xs font-semibold mb-1">ليش اخترناها؟</div>
                    <ul className="text-xs text-muted-foreground list-disc pr-5 space-y-1">
                      {vehicle.reasons.slice(0, 2).map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                    {!hasVehicle ? (
                      <div className="mt-2 text-xs text-muted-foreground">
                        ملاحظة: ما لقينا تطابق واضح بين slugs وبين جداول الفلاتر.
                      </div>
                    ) : null}
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

          <div className="mt-4 flex items-center justify-end">
            <Button
              variant="secondary"
              size="sm"
<<<<<<< HEAD
              disabled={!guest || loading}
              onClick={() => guest && loadJourney(guest.visitor_id)}
=======
              disabled={!activeVisitorId || loading}
              onClick={() => activeVisitorId && loadJourney(activeVisitorId)}
>>>>>>> b8e0e03 (init)
            >
              <RefreshCw className="h-4 w-4 ml-2" />
              تحديث
            </Button>
          </div>
        </SheetHeader>

        <div className="h-[calc(100vh-240px)] overflow-auto bg-gray-50 p-6">
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
                  items.map((j, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="whitespace-nowrap">{fmt(j.occurred_at)}</TableCell>
                      <TableCell className="font-mono text-xs">{j.path || "—"}</TableCell>
                      <TableCell className="truncate max-w-[520px]">
                        {j.page_url ? (
<<<<<<< HEAD
                          <a
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                            href={j.page_url}
                            target="_blank"
                            rel="noreferrer"
                          >
=======
                          <a className="inline-flex items-center gap-1 text-blue-600 hover:underline" href={j.page_url} target="_blank" rel="noreferrer">
>>>>>>> b8e0e03 (init)
                            <span className="truncate">{j.page_url}</span>
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}

                {!loading && items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                      لا توجد بيانات
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
