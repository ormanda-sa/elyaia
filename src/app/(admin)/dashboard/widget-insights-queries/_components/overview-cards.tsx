// FILE: src/app/(admin)/dashboard/widget-insights-queries/_components/overview-cards.tsx

"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type OverviewData = {
  days: number;
  queriesCount: number;
  searchesSum: number;
  tasks: {
    open: number;
    in_progress: number;
    done: number;
    dismissed: number;
  };
};

export function OverviewCards({ days }: { days: number }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        days: String(days),
      });
      const res = await fetch(
        `/api/dashboard/widget-insights-queries/overview?${params.toString()}`,
      );
      const json = await res.json();
      setData(json.data || null);
    } catch (err) {
      console.error("overview fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  const { queriesCount, searchesSum, tasks } = data;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-normal text-muted-foreground">
            عبارات البحث في آخر {data.days} يوم
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {queriesCount.toLocaleString("ar-SA")}
          </div>
          <p className="text-xs text-muted-foreground">
            مجموع العبارات المختلفة التي استخدمها الزوّار في الويدجت.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-normal text-muted-foreground">
            إجمالي مرّات البحث في الويدجت
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {searchesSum.toLocaleString("ar-SA")}
          </div>
          <p className="text-xs text-muted-foreground">
            مجموع عدد المرّات التي تم فيها استخدام عبارات الفلتر في الفترة
            المحددة.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-normal text-muted-foreground">
            حالة مهام المحتوى
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 text-xs">
            <span>
              مفتوحة:{" "}
              <span className="font-semibold">{tasks.open ?? 0}</span>
            </span>
            <span>
              قيد التنفيذ:{" "}
              <span className="font-semibold">
                {tasks.in_progress ?? 0}
              </span>
            </span>
            <span>
              منجزة:{" "}
              <span className="font-semibold">{tasks.done ?? 0}</span>
            </span>
            <span>
              متجاهلة:{" "}
              <span className="font-semibold">
                {tasks.dismissed ?? 0}
              </span>
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
