"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toYMD(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function parseYMD(s: string) {
  const [y, m, d] = s.split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function fmtYMD(s: string) {
  const d = parseYMD(s);
  if (!d) return s;
  return d.toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

type Preset = "today" | "7d" | "30d" | "month" | "custom";

export default function DateRangeBar({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (next: { from: string; to: string }) => void;
}) {
  const [preset, setPreset] = React.useState<Preset>("custom");

  React.useEffect(() => {
    const today = new Date();
    const todayY = toYMD(today);

    const end = parseYMD(to);
    const start = parseYMD(from);
    if (!start || !end) return;

    const diffDays =
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const monthStart = new Date(end.getFullYear(), end.getMonth(), 1);
    const monthStartY = toYMD(monthStart);

    if (from === todayY && to === todayY) setPreset("today");
    else if (diffDays === 7) setPreset("7d");
    else if (diffDays === 30) setPreset("30d");
    else if (from === monthStartY && to === toYMD(end)) setPreset("month");
    else setPreset("custom");
  }, [from, to]);

  function applyPreset(p: Preset) {
    const today = new Date();
    const end = new Date(today);

    if (p === "today") {
      const d = toYMD(today);
      onChange({ from: d, to: d });
      return;
    }

    if (p === "7d" || p === "30d") {
      const days = p === "7d" ? 7 : 30;
      const start = new Date(today);
      start.setDate(start.getDate() - (days - 1));
      onChange({ from: toYMD(start), to: toYMD(end) });
      return;
    }

    if (p === "month") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      onChange({ from: toYMD(start), to: toYMD(end) });
      return;
    }
  }

  function setFromDate(d?: Date) {
    if (!d) return;
    const nextFrom = toYMD(d);
    const toDate = parseYMD(to);
    if (toDate && d > toDate) onChange({ from: nextFrom, to: nextFrom });
    else onChange({ from: nextFrom, to });
    setPreset("custom");
  }

  function setToDate(d?: Date) {
    if (!d) return;
    const nextTo = toYMD(d);
    const fromDate = parseYMD(from);
    if (fromDate && d < fromDate) onChange({ from: nextTo, to: nextTo });
    else onChange({ from, to: nextTo });
    setPreset("custom");
  }

  const fromDate = parseYMD(from) ?? undefined;
  const toDate = parseYMD(to) ?? undefined;

  return (
    <div className="rounded-2xl border bg-white px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* الأزرار يمين */}
      <ToggleGroup
        type="single"
        value={preset === "custom" ? "" : preset}
        onValueChange={(v) => {
          const p = (v || "custom") as Preset;
          setPreset(p);
          if (p !== "custom") applyPreset(p);
        }}
        className="flex flex-wrap gap-2"
      >
        <ToggleGroupItem value="month" asChild>
          <Button variant={preset === "month" ? "default" : "outline"} size="sm">هذا الشهر</Button>
        </ToggleGroupItem>
        <ToggleGroupItem value="30d" asChild>
          <Button variant={preset === "30d" ? "default" : "outline"} size="sm">آخر 30 يوم</Button>
        </ToggleGroupItem>
        <ToggleGroupItem value="7d" asChild>
          <Button variant={preset === "7d" ? "default" : "outline"} size="sm">آخر 7 أيام</Button>
        </ToggleGroupItem>
        <ToggleGroupItem value="today" asChild>
          <Button variant={preset === "today" ? "default" : "outline"} size="sm">اليوم</Button>
        </ToggleGroupItem>
      </ToggleGroup>

      {/* التاريخ يسار */}
      <div className="flex items-center gap-2 justify-end">
        <div className="text-sm text-muted-foreground">من</div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("h-9 min-w-[160px] justify-between")}>
              <span className="font-medium">{fmtYMD(from)}</span>
              <CalendarIcon className="h-4 w-4 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus />
          </PopoverContent>
        </Popover>

        <div className="text-sm text-muted-foreground">إلى</div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("h-9 min-w-[160px] justify-between")}>
              <span className="font-medium">{fmtYMD(to)}</span>
              <CalendarIcon className="h-4 w-4 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
