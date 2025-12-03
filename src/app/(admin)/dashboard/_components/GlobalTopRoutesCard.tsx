// src/app/dashboard/_components/GlobalTopRoutesCard.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

type TopRoute = {
  brand_name: string;
  model_name: string;
  year_label: string;
  section_name: string;
  keyword_name: string;
  count: number;
};

type GlobalOverview = {
  top_routes: TopRoute[];
};

export function GlobalTopRoutesCard() {
  const [data, setData] = useState<GlobalOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/dashboard/global-overview", {
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) return;
        if (!cancelled) {
          setData({ top_routes: json.top_routes || [] });
        }
      } catch (err) {
        console.error("global top routes error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !data) return null;

  const routes = data.top_routes || [];
  const visibleRoutes = routes.slice(0, visibleCount);
  const hasMore = routes.length > visibleCount;

  return (
    <section className="mt-4" dir="rtl">
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">
            أكثر مسارات البحث استخداماً في جميع المتاجر
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-slate-600">
          <p className="text-[11px] text-slate-500">
            هذه أكثر تركيبات (شركة / موديل / سنة / قسم / كلمة) استخدمها
            العملاء داخل الفلتر خلال آخر 30 يوماً، على مستوى كل المتاجر
            المشتركة.
          </p>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right text-[11px]">
                    الشركة
                  </TableHead>
                  <TableHead className="text-right text-[11px]">
                    الموديل
                  </TableHead>
                  <TableHead className="text-right text-[11px]">
                    السنة
                  </TableHead>
                  <TableHead className="text-right text-[11px]">
                    القسم
                  </TableHead>
                  <TableHead className="text-right text-[11px]">
                    الكلمة
                  </TableHead>
                  <TableHead className="text-right text-[11px]">
                    عدد عمليات البحث
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routes.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-4 text-center text-[11px] text-slate-400"
                    >
                      لا توجد بيانات كافية لعرض المسارات الأكثر استخداماً.
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleRoutes.map((r, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-[11px] text-slate-700">
                        {r.brand_name}
                      </TableCell>
                      <TableCell className="text-[11px] text-slate-700">
                        {r.model_name}
                      </TableCell>
                      <TableCell className="text-[11px] text-slate-700">
                        {r.year_label}
                      </TableCell>
                      <TableCell className="text-[11px] text-slate-700">
                        {r.section_name}
                      </TableCell>
                      <TableCell className="text-[11px] text-slate-700">
                        {r.keyword_name}
                      </TableCell>
                      <TableCell className="text-[11px] font-semibold text-slate-900">
                        {r.count.toLocaleString("ar-EG")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-[11px]"
                onClick={() => setVisibleCount((v) => v + 20)}
              >
                عرض المزيد (+20)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
