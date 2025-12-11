"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, ShoppingCart } from "lucide-react";

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
    <div className="grid gap-6 md:grid-cols-3">
      <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            الحملات النشطة
          </CardTitle>
          <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-blue-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-600">
            {loading ? "..." : s.active_campaigns}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            عدد العروض اللي شغّالة الآن
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            العملاء المستهدفين (آخر ٧ أيام)
          </CardTitle>
          <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-green-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">
            {loading ? "..." : s.total_targets_last_7d}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            عدد العملاء اللي وصلتهم عروض سعر مؤخّرًا
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            التحويلات من عروض السعر (آخر ٧ أيام)
          </CardTitle>
          <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
            <ShoppingCart className="h-5 w-5 text-orange-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-orange-600">
            {loading ? "..." : s.conversions_last_7d}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            عدد الطلبات اللي جت من حملات نزول السعر
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
