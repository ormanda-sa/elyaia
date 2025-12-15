"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import VisitorsTable, { VisitorRow } from "./visitors-table";
import JourneyDialog from "./journey-dialog";

import GuestsTable, { GuestRow } from "./guests-table";
import GuestJourneySheet from "./guest-journey-sheet";

import DateRangeBar from "./date-range-bar";
 
 import VisitorsSummary from "./visitors-summary";



type Cursor = { cursor_last_seen: string; cursor_customer_id: string } | null;
type GuestCursor = { cursor_last_seen: string; cursor_visitor_id: string } | null;

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toYMD(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function VisitorsPage() {
  const [tab, setTab] = useState<"customers" | "guests">("customers");

  // ===== Date range (applies to both tabs) =====
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return toYMD(d);
  });
  const [dateTo, setDateTo] = useState<string>(() => toYMD(new Date()));

  // =========================
  // Customers (with pagination)
  // =========================
  const [q, setQ] = useState("");
  const [customers, setCustomers] = useState<VisitorRow[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [limit, setLimit] = useState(50);
  const [nextCursor, setNextCursor] = useState<Cursor>(null);
  const [cursorStack, setCursorStack] = useState<Cursor[]>([null]);
  const currentCursor = cursorStack[cursorStack.length - 1] || null;

  const pageNum = useMemo(() => cursorStack.length, [cursorStack.length]);

  const [openCustomer, setOpenCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<VisitorRow | null>(null);

  async function loadCustomers(cursor: Cursor) {
    setLoadingCustomers(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("limit", String(limit));
      params.set("from", dateFrom);
      params.set("to", dateTo);

      if (cursor?.cursor_last_seen && cursor?.cursor_customer_id) {
        params.set("cursor_last_seen", cursor.cursor_last_seen);
        params.set("cursor_customer_id", cursor.cursor_customer_id);
      }

      const res = await fetch(`/api/dashboard/visitors?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();

      setCustomers(data.items || []);
      setNextCursor(data.nextCursor || null);
    } finally {
      setLoadingCustomers(false);
    }
  }

  function resetCustomersPaging() {
    setCursorStack([null]);
  }

  // =========================
  // Guests (with pagination)
  // =========================
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(false);

  const [guestLimit, setGuestLimit] = useState(50);
  const [guestNextCursor, setGuestNextCursor] = useState<GuestCursor>(null);
  const [guestCursorStack, setGuestCursorStack] = useState<GuestCursor[]>([null]);
  const guestCurrentCursor = guestCursorStack[guestCursorStack.length - 1] || null;

  const guestPageNum = useMemo(() => guestCursorStack.length, [guestCursorStack.length]);

  const [openGuest, setOpenGuest] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<GuestRow | null>(null);

  async function loadGuests(cursor: GuestCursor) {
    setLoadingGuests(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(guestLimit));
      params.set("from", dateFrom);
      params.set("to", dateTo);

      if (cursor?.cursor_last_seen && cursor?.cursor_visitor_id) {
        params.set("cursor_last_seen", cursor.cursor_last_seen);
        params.set("cursor_visitor_id", cursor.cursor_visitor_id);
      }

      const res = await fetch(`/api/dashboard/visitors/guests?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();

      setGuests(data.items || []);
      setGuestNextCursor(data.nextCursor || null);
    } finally {
      setLoadingGuests(false);
    }
  }

  function resetGuestsPaging() {
    setGuestCursorStack([null]);
  }

  // =========================
  // Init load
  // =========================
  useEffect(() => {
    loadCustomers(null);
    loadGuests(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reload customers when paging changes
  useEffect(() => {
    if (tab !== "customers") return;
    loadCustomers(currentCursor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursorStack.length, limit, tab]);

  // reload guests when paging changes
  useEffect(() => {
    if (tab !== "guests") return;
    loadGuests(guestCurrentCursor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestCursorStack.length, guestLimit, tab]);

  function applyDate(next: { from: string; to: string }) {
    setDateFrom(next.from);
    setDateTo(next.to);
    resetCustomersPaging();
    resetGuestsPaging();
    // reload current tab after state update
    setTimeout(() => {
      if (tab === "customers") loadCustomers(null);
      else loadGuests(null);
    }, 0);
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-lg font-semibold">الزوار والعملاء</div>
          <div className="text-xs text-muted-foreground">
            فلترة بالتاريخ + صفحات حقيقية (عملاء/ضيوف).
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={() => {
            if (tab === "customers") loadCustomers(currentCursor);
            else loadGuests(guestCurrentCursor);
          }}
        >
          تحديث
        </Button>
      </div>

      {/* Date Range Bar */}
      <DateRangeBar
        from={dateFrom}
        to={dateTo}
        onChange={applyDate}
      />
 
<VisitorsSummary from={dateFrom} to={dateTo} />

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="customers">العملاء</TabsTrigger>
          <TabsTrigger value="guests">زوار بدون تسجيل دخول</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Customers */}
      {tab === "customers" ? (
        <>
          <div className="flex items-center gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="رقم العميل / الجوال / الإيميل / الاسم"
              className="max-w-xl"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  resetCustomersPaging();
                  loadCustomers(null);
                }
              }}
            />
            <Button
              onClick={() => {
                resetCustomersPaging();
                loadCustomers(null);
              }}
              disabled={loadingCustomers}
            >
              {loadingCustomers ? "..." : "بحث"}
            </Button>
          </div>

          <VisitorsTable
            items={customers}
            loading={loadingCustomers}
            onOpenJourney={(row) => {
              setSelectedCustomer(row);
              setOpenCustomer(true);
            }}
          />

          <div className="flex items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={loadingCustomers || cursorStack.length <= 1}
                onClick={() => {
                  if (cursorStack.length <= 1) return;
                  const copy = [...cursorStack];
                  copy.pop();
                  setCursorStack(copy);
                }}
              >
                السابق
              </Button>

              <Button
                variant="outline"
                disabled={loadingCustomers || !nextCursor}
                onClick={() => {
                  if (!nextCursor) return;
                  setCursorStack([...cursorStack, nextCursor]);
                }}
              >
                التالي
              </Button>

              <div className="text-sm text-muted-foreground">الصفحة: {pageNum}</div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-sm text-muted-foreground">إظهار</div>
              <select
                className="h-9 rounded-xl border bg-white px-2 text-sm"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  resetCustomersPaging();
                }}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              <div className="text-sm text-muted-foreground">{customers.length} صف</div>
            </div>
          </div>

          <JourneyDialog open={openCustomer} onOpenChange={setOpenCustomer} customer={selectedCustomer} />
        </>
      ) : (
        <>
          <GuestsTable
            items={guests}
            loading={loadingGuests}
            onOpenJourney={(row) => {
              setSelectedGuest(row);
              setOpenGuest(true);
            }}
          />

          <div className="flex items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={loadingGuests || guestCursorStack.length <= 1}
                onClick={() => {
                  if (guestCursorStack.length <= 1) return;
                  const copy = [...guestCursorStack];
                  copy.pop();
                  setGuestCursorStack(copy);
                }}
              >
                السابق
              </Button>

              <Button
                variant="outline"
                disabled={loadingGuests || !guestNextCursor}
                onClick={() => {
                  if (!guestNextCursor) return;
                  setGuestCursorStack([...guestCursorStack, guestNextCursor]);
                }}
              >
                التالي
              </Button>

              <div className="text-sm text-muted-foreground">الصفحة: {guestPageNum}</div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-sm text-muted-foreground">إظهار</div>
              <select
                className="h-9 rounded-xl border bg-white px-2 text-sm"
                value={guestLimit}
                onChange={(e) => {
                  setGuestLimit(Number(e.target.value));
                  resetGuestsPaging();
                }}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              <div className="text-sm text-muted-foreground">{guests.length} صف</div>
            </div>
          </div>

          <GuestJourneySheet open={openGuest} onOpenChange={setOpenGuest} guest={selectedGuest} />
        </>
      )}
    </div>
  );
}
