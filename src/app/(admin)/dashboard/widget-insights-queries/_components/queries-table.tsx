// FILE: src/app/(admin)/dashboard/widget-insights-queries/_components/queries-table.tsx

"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type QueryRow = {
  store_id: string;
  query: string;
  normalized_query: string | null;
  keyword_id: number | null;
  model_id: number | null;
  year_id: number | null;
  keyword_name: string | null;
  model_name: string | null;
  year_value: string | null;
  brand_name?: string | null;
  count: number;
  first_seen_at: string;
  last_seen_at: string;
  missing_models?: string[] | null;
};

type QueriesResponse = {
  data: QueryRow[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    days: number;
  };
};

const DAYS_OPTIONS = ["1", "10", "30", "60", "90", "180"];
const PAGE_SIZE_OPTIONS = ["10", "25", "50", "100"];

export function QueriesTable() {
  const [rows, setRows] = useState<QueryRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [days, setDays] = useState("30");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("50");
  const [total, setTotal] = useState(0);

  const fetchData = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        days,
        page: String(page),
        pageSize,
      });

      const res = await fetch(
        `/api/dashboard/widget-insights-queries/queries?${params.toString()}`,
      );
      const json: QueriesResponse = await res.json();

      setRows(json.data || []);
      setTotal(json.meta?.total || 0);
    } catch (err) {
      console.error("queries fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, page, pageSize]);

  const numericPageSize = parseInt(pageSize, 10) || 50;
  const totalPages = Math.max(Math.ceil(total / numericPageSize), 1);
  const currentFrom = total === 0 ? 0 : (page - 1) * numericPageSize + 1;
  const currentTo = Math.min(page * numericPageSize, total);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const handleChangePageSize = (value: string) => {
    setPageSize(value);
    setPage(1); // نرجع لأول صفحة
  };

  const handleChangeDays = (value: string) => {
    setDays(value);
    setPage(1);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <CardTitle className="text-lg">
          عبارات البحث الأكثر استخدامًا داخل الويدجت
        </CardTitle>

        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">الفترة:</span>
            <Select value={days} onValueChange={handleChangeDays}>
              <SelectTrigger className="h-8 w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">آخر 1 يوم</SelectItem>
                <SelectItem value="10">آخر 10 أيام</SelectItem>
                <SelectItem value="30">آخر 30 يوم</SelectItem>
                <SelectItem value="60">آخر 60 يوم</SelectItem>
                <SelectItem value="90">آخر 90 يوم</SelectItem>
                <SelectItem value="180">آخر 180 يوم</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="py-6 text-sm text-muted-foreground">
            جاري تحميل العبارات...
          </div>
        ) : rows.length === 0 ? (
          <div className="py-6 text-sm text-muted-foreground">
            لا توجد عبارات بحث كافية في الفترة المحددة.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>عبارة البحث</TableHead>
                    <TableHead className="w-24 text-center">
                      عدد المرات
                    </TableHead>
                    <TableHead className="w-40">أول ظهور</TableHead>
                    <TableHead className="w-40">آخر ظهور</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow key={`${row.query}-${idx}`}>
                      <TableCell className="text-center text-xs">
                        {currentFrom + idx}
                      </TableCell>

                      <TableCell className="text-sm">
                        <div className="font-medium">{row.query}</div>

                        {row.missing_models &&
                          row.missing_models.length > 0 && (
                            <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1 mt-0.5">
                              <span>هذي الكلمة غير مضافة للموديلات:</span>
                              {row.missing_models.map((model) => (
                                <span
                                  key={model}
                                  className="flex items-center gap-1 rounded-full bg-error-50 py-0.5 pl-2 pr-2.5 text-[11px] font-medium text-error-600 dark:bg-error-500/15 dark:text-error-500"
                                >
                                  {model}
                                </span>
                              ))}
                            </div>
                          )}
                      </TableCell>

                      <TableCell className="text-center text-sm font-semibold">
                        {row.count}
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(row.first_seen_at).toLocaleString()}
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(row.last_seen_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>إظهار</span>
                <Select value={pageSize} onValueChange={handleChangePageSize}>
                  <SelectTrigger className="h-8 w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>سطر.</span>
              </div>

              <div className="flex items-center gap-2">
                <span>
                  عرض {currentFrom} إلى {currentTo} من{" "}
                  {total.toLocaleString("ar-SA")} حدث
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setPage(1)}
                  disabled={!canPrev}
                >
                  {"|<"}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => canPrev && setPage(page - 1)}
                  disabled={!canPrev}
                >
                  {"<"}
                </Button>
                <span className="px-2">
                  صفحة {page} من {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => canNext && setPage(page + 1)}
                  disabled={!canNext}
                >
                  {">"}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setPage(totalPages)}
                  disabled={!canNext}
                >
                  {">|"}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
