"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
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
} | null;

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

export default function GuestJourneySheet({
  open,
  onOpenChange,
  guest,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  guest: GuestRow | null;
}) {
  const [items, setItems] = useState<JourneyRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [vehicle, setVehicle] = useState<VehicleProfile>(null);
  const [vehicleLoading, setVehicleLoading] = useState(false);

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
    }
  }

  async function loadVehicle(visitorId: string) {
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
    }
  }

  useEffect(() => {
    if (!open || !guest) return;
    setItems([]);
    setVehicle(null);
    loadJourney(guest.visitor_id);
    loadVehicle(guest.visitor_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, guest?.visitor_id]);

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
              <SheetTitle className="text-base font-semibold">زائر بدون تسجيل دخول</SheetTitle>
              <SheetDescription className="mt-2 text-xs text-muted-foreground">
                <span className="font-mono break-all">visitor_id: {guest?.visitor_id || "—"}</span>
              </SheetDescription>

              {/* ✅ سيارته المحتملة */}
              <div className="mt-3 rounded-2xl border bg-gray-50 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">سيارته المحتملة</div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!guest || vehicleLoading}
                    onClick={() => guest && loadVehicle(guest.visitor_id)}
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
                    <span className="text-xs text-muted-foreground">لا توجد إشارات كافية حتى الآن</span>
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

                      <Badge variant="outline">إشارات 7 أيام: {vehicle.signals_7d}</Badge>

                      {vehicle.last_signal_at ? (
                        <span className="text-xs text-muted-foreground">
                          آخر إشارة: {fmt(vehicle.last_signal_at)}
                        </span>
                      ) : null}
                    </>
                  )}
                </div>
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
              disabled={!guest || loading}
              onClick={() => guest && loadJourney(guest.visitor_id)}
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
