"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Summary = {
  totals: { visitors: number; users: number; page_views: number };
  top_pages: { path: string; views: number }[];
  top_products: { product_id: string; product_title: string | null; product_url: string | null; views: number }[];
};

export default function VisitorsSummary({ from, to }: { from: string; to: string }) {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/visitors/summary?from=${from}&to=${to}`, { cache: "no-store" });
      const j = await res.json();
      setData(j);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [from, to]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <Card className="lg:col-span-4">
        <CardHeader><CardTitle className="text-sm">الإجمالي</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {loading && <Skeleton className="h-24 w-full" />}
          {!loading && (
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border p-3">
                <div className="text-xs text-muted-foreground">الزوار</div>
                <div className="text-2xl font-semibold">{data?.totals.visitors ?? 0}</div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-xs text-muted-foreground">المستخدمون</div>
                <div className="text-2xl font-semibold">{data?.totals.users ?? 0}</div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-xs text-muted-foreground">مشاهدات</div>
                <div className="text-2xl font-semibold">{data?.totals.page_views ?? 0}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-4">
        <CardHeader><CardTitle className="text-sm">أعلى الصفحات</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {loading && <Skeleton className="h-28 w-full" />}
          {!loading && (data?.top_pages || []).map((p) => (
            <div key={p.path} className="flex items-center justify-between rounded-xl border bg-white px-3 py-2 text-sm">
              <div className="font-mono truncate max-w-[240px]">{p.path}</div>
              <div className="font-semibold">{p.views}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="lg:col-span-4">
        <CardHeader><CardTitle className="text-sm">أعلى المنتجات مشاهدة</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {loading && <Skeleton className="h-28 w-full" />}
          {!loading && (data?.top_products || []).map((p) => (
            <div key={p.product_id} className="flex items-center justify-between rounded-xl border bg-white px-3 py-2 text-sm">
              <div className="truncate max-w-[240px]">{p.product_title || p.product_id}</div>
              <div className="font-semibold">{p.views}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
