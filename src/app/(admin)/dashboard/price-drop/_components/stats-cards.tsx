"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Stats = {
  active_campaigns: number;
  total_targets_last_7d: number;
  conversions_last_7d: number;
};

export function StatsCards() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/dashboard/price-drop/stats");
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) {
          setStats({
            active_campaigns: 0,
            total_targets_last_7d: 0,
            conversions_last_7d: 0,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const s = stats ?? {
    active_campaigns: 0,
    total_targets_last_7d: 0,
    conversions_last_7d: 0,
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">الحملات النشطة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? "..." : s.active_campaigns}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            عدد العروض اللي شغّالة الآن
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            العملاء المستهدفين (آخر ٧ أيام)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? "..." : s.total_targets_last_7d}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            عدد العملاء اللي وصلتهم عروض سعر مؤخّرًا
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            التحويلات من عروض السعر (آخر ٧ أيام)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {loading ? "..." : s.conversions_last_7d}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            عدد الطلبات اللي جت من حملات نزول السعر
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
