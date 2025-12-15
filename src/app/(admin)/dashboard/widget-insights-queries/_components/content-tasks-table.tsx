// FILE: src/app/(admin)/dashboard/widget-insights-queries/_components/content-tasks-table.tsx

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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { TaskLinksSection } from "./task-links-section";

type TaskStatus = "open" | "in_progress" | "done" | "dismissed";

type TaskRow = {
  id: number;
  store_id: string;
  query: string;
  search_count: number;
  status: TaskStatus;
  notes: any;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export function ContentTasksTable({ refreshFlag }: { refreshFlag: number }) {
  const [rows, setRows] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("open");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: statusFilter,
      });

      const res = await fetch(
        `/api/dashboard/widget-insights-queries/content-tasks?${params.toString()}`,
      );
      const json = await res.json();
      setRows(json.data || []);
    } catch (err) {
      console.error("content-tasks fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, refreshFlag]);

  const handleUpdateStatus = async (id: number, status: TaskStatus) => {
    try {
      setUpdatingId(id);
      const res = await fetch(
        `/api/dashboard/widget-insights-queries/content-tasks`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status }),
        },
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        console.error("failed to update task status", errJson);
      }

      await fetchData();
    } catch (err) {
      console.error("update task status error", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const statusLabel = (s: TaskStatus) => {
    switch (s) {
      case "open":
        return "مفتوحة";
      case "in_progress":
        return "قيد التنفيذ";
      case "done":
        return "منجزة";
      case "dismissed":
        return "تم التجاهل";
    }
  };

  const statusVariant = (s: TaskStatus) => {
    switch (s) {
      case "open":
        return "default";
      case "in_progress":
        return "secondary";
      case "done":
        return "outline";
      case "dismissed":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <CardTitle className="text-lg">
          مهام المحتوى المقترحة من عبارات البحث
        </CardTitle>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">الحالة:</span>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as TaskStatus | "all")}
          >
            <SelectTrigger className="h-8 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">مفتوحة</SelectItem>
              <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
              <SelectItem value="done">منجزة</SelectItem>
              <SelectItem value="dismissed">تم التجاهل</SelectItem>
              <SelectItem value="all">الكل</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="py-6 text-sm text-muted-foreground">
            جاري تحميل مهام المحتوى...
          </div>
        ) : rows.length === 0 ? (
          <div className="py-6 text-sm text-muted-foreground">
            لا توجد مهام محتوى في الحالة المحددة.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>عبارة البحث</TableHead>
                  <TableHead className="w-28 text-center">
                    عدد البحث
                  </TableHead>
                  <TableHead className="w-28 text-center">الحالة</TableHead>
                  <TableHead className="w-40">تاريخ الإنشاء</TableHead>
                  <TableHead className="w-40">تاريخ الإكمال</TableHead>
                  <TableHead className="w-52">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => {
                  const notes = row.notes || {};
                  const missingModels: string[] = notes.missing_models || [];
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="text-center text-xs">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="text-sm align-top">
                        <div className="font-medium">{row.query}</div>

                        <div className="text-xs text-muted-foreground mt-0.5">
                          مثال: اكتب صفحة أو مقال عن هذه العبارة لأنها تكرّرت{" "}
                          <span className="font-semibold">
                            {row.search_count}
                          </span>{" "}
                          مرات في الويدجت.
                        </div>

                        {(notes.keyword_name ||
                          notes.model_name ||
                          notes.year_value) && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            الكلمة:{" "}
                            <span className="font-semibold">
                              {notes.keyword_name ?? "غير معروفة"}
                            </span>{" "}
                            – الموديل:{" "}
                            <span className="font-semibold">
                              {notes.model_name ?? "غير معروف"}
                            </span>{" "}
                            – السنة:{" "}
                            <span className="font-semibold">
                              {notes.year_value ?? "غير معروفة"}
                            </span>
                          </div>
                        )}

                        {missingModels.length > 0 && (
                          <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1 mt-0.5">
                            <span>هذي الكلمة غير مضافة للموديلات:</span>
                            {missingModels.map((model: string) => (
                              <span
                                key={model}
                                className="flex items-center gap-1 rounded-full bg-error-50 py-0.5 pl-2 pr-2.5 text-[11px] font-medium text-error-600 dark:bg-error-500/15 dark:text-error-500"
                              >
                                {model}
                              </span>
                            ))}
                          </div>
                        )}

                        <TaskLinksSection taskId={row.id} />
                      </TableCell>

                      <TableCell className="text-center text-sm font-semibold">
                        {row.search_count}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={statusVariant(row.status) as any}>
                          {statusLabel(row.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.completed_at
                          ? new Date(row.completed_at).toLocaleString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {row.status !== "done" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={updatingId === row.id}
                              onClick={() =>
                                handleUpdateStatus(row.id, "done")
                              }
                            >
                              تعليم كمكتملة
                            </Button>
                          )}

                          {row.status !== "dismissed" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={updatingId === row.id}
                              onClick={() =>
                                handleUpdateStatus(row.id, "dismissed")
                              }
                            >
                              تجاهل
                            </Button>
                          )}

                          {row.status === "open" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={updatingId === row.id}
                              onClick={() =>
                                handleUpdateStatus(row.id, "in_progress")
                              }
                            >
                              قيد التنفيذ
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
