"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip as ShTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles, CheckCircle2 } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip as ReTooltip,
  LineChart,
  Line,
  YAxis,
} from "recharts";

type Props = { from: string; to: string };

type Payload = {
  ok: boolean;
  totals: { visitors: number; users: number; active_visitors_30m: number };
  spark_30m: { minute: number; count: number }[];
  series: { date: string; visitors_new: number; visitors_returning: number; users: number }[];
  countries: { country_code: string; visitors: number }[];
};

function fmtCompact(n: number) {
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}م`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}ألف`;
  return String(n);
}

export default function VisitorsAnalytics({ from, to }: Props) {
  const [tab, setTab] = useState<"visitors" | "users">("visitors");
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/visitors/analytics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { cache: "no-store" },
      );
      const j = await res.json();
      setData(j);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [from, to]);

  const totals = data?.totals;
  const spark = data?.spark_30m || [];
  const series = data?.series || [];
  const countries = data?.countries || [];

  // أعلى الدول: نعرض اسم كود فقط (مثل GA)
  const topCountries = useMemo(() => {
    return countries.slice(0, 6);
  }, [countries]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* ===== GA-like Active card ===== */}
      <Card className="lg:col-span-4 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <div className="text-[12px] text-muted-foreground font-medium">
                عدد الزوار النشطين خلال آخر 30 دقيقة
              </div>
            </div>

            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
                تحديث
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {/* Big number */}
          <div className="flex items-end justify-between">
            <div className="text-4xl font-semibold leading-none">
              {loading ? "—" : (totals?.active_visitors_30m ?? 0)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              مستخدمون نشطون
            </div>
          </div>

          {/* Spark bars with tooltip like GA */}
          <div className="h-16">
            {loading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spark} margin={{ left: 0, right: 0, top: 6, bottom: 0 }}>
                  <XAxis dataKey="minute" hide />
                  <ReTooltip
                    cursor={{ fillOpacity: 0.06 }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0]?.payload as any;
                      return (
                        <div className="rounded-xl border bg-white px-3 py-2 text-xs shadow-sm">
                          <div className="text-muted-foreground">خلال {30 - (p.minute - 1)} دقيقة</div>
                          <div className="mt-1 font-semibold">مستخدمون نشطون: {p.count}</div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 2, 2]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Countries mini table like GA */}
          <div className="rounded-xl border bg-white">
            <div className="px-3 py-2 text-[12px] text-muted-foreground flex items-center justify-between">
              <span>أعلى الدول</span>
              <span>نشطون</span>
            </div>

            <div className="divide-y">
              {loading ? (
                <>
                  <div className="px-3 py-2"><Skeleton className="h-4 w-full" /></div>
                  <div className="px-3 py-2"><Skeleton className="h-4 w-full" /></div>
                  <div className="px-3 py-2"><Skeleton className="h-4 w-full" /></div>
                </>
              ) : (
                topCountries.map((c) => (
                  <div key={c.country_code} className="px-3 py-2 text-sm flex items-center justify-between">
                    <span className="font-medium">{c.country_code || "NA"}</span>
                    <span className="font-semibold tabular-nums">{c.visitors}</span>
                  </div>
                ))
              )}

              {!loading && topCountries.length === 0 && (
                <div className="px-3 py-6 text-sm text-muted-foreground text-center">
                  لا توجد بيانات
                </div>
              )}
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground">
            من {from} إلى {to}
          </div>
        </CardContent>
      </Card>

      {/* ===== Big chart (GA style) ===== */}
      <Card className="lg:col-span-8 overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-sm font-semibold">الزوار والمستخدمون</div>
            <div className="text-xs text-muted-foreground">جدد / عائدون + المستخدمون</div>
          </div>

          <div className="flex items-center gap-2">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList>
                <TabsTrigger value="visitors">الزوار</TabsTrigger>
                <TabsTrigger value="users">المستخدمون</TabsTrigger>
              </TabsList>
            </Tabs>

            <TooltipProvider>
              <ShTooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                    {loading ? "..." : "تحديث"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>تحديث البيانات</TooltipContent>
              </ShTooltip>
            </TooltipProvider>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-muted-foreground">
              {tab === "visitors" ? "جدد وعائدون" : "المستخدمون"}
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>الزوار: <b className="text-foreground">{loading ? "—" : fmtCompact(totals?.visitors ?? 0)}</b></span>
              <span>المستخدمون: <b className="text-foreground">{loading ? "—" : fmtCompact(totals?.users ?? 0)}</b></span>
            </div>
          </div>

          <div className="h-[320px] w-full">
            {loading ? (
              <Skeleton className="h-[320px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ReTooltip />
                  {tab === "visitors" ? (
                    <>
                      <Line type="monotone" dataKey="visitors_new" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="visitors_returning" strokeWidth={2} dot={false} />
                    </>
                  ) : (
                    <Line type="monotone" dataKey="users" strokeWidth={2} dot={false} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ===== Totals ===== */}
      <Card className="lg:col-span-12">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-xs text-muted-foreground">الزوار</div>
            <div className="text-2xl font-semibold">{loading ? "—" : (totals?.visitors ?? 0)}</div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="text-xs text-muted-foreground">المستخدمون (دخول)</div>
            <div className="text-2xl font-semibold">{loading ? "—" : (totals?.users ?? 0)}</div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="text-xs text-muted-foreground">نشط آخر 30 دقيقة</div>
            <div className="text-2xl font-semibold">{loading ? "—" : (totals?.active_visitors_30m ?? 0)}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
