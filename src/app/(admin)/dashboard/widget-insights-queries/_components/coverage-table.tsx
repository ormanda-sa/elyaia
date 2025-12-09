// FILE: src/app/(admin)/dashboard/widget-insights-queries/_components/coverage-table.tsx

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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type CoverageRow = {
  brand_name: string;
  model_name: string;
  has_keyword?: boolean;
  total_count?: number;
};

export function CoverageTable() {
  const [rows, setRows] = useState<CoverageRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [brands, setBrands] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [keywordInput, setKeywordInput] = useState<string>("طقم كشاف");
  const [keyword, setKeyword] = useState<string>("طقم كشاف");

  // جلب الماركات من filter_brands
  const fetchBrands = async () => {
    try {
      const res = await fetch(
        "/api/dashboard/widget-insights-queries/brands",
      );
      const json = await res.json();
      const list: string[] = Array.isArray(json.data) ? json.data : [];
      setBrands(list);
      if (!selectedBrand && list.length > 0) {
        setSelectedBrand(list[0]);
      }
    } catch (err) {
      console.error("brands fetch error", err);
    }
  };

  // جلب نتائج التغطية من API
  const fetchCoverage = async () => {
    if (!selectedBrand || !keyword.trim()) {
      setRows([]);
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams({
        brand: selectedBrand,
        keyword: keyword.trim(),
      });

      const res = await fetch(
        `/api/dashboard/widget-insights-queries/coverage?${params.toString()}`,
      );
      const json = await res.json();
      const data: CoverageRow[] = Array.isArray(json.data) ? json.data : [];
      setRows(data);
    } catch (err) {
      console.error("coverage fetch error", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // أول ما تفتح الصفحة: جيب الماركات
  useEffect(() => {
    fetchBrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // كل ما تغير الماركة أو الكلمة المطبّقة: جيب النتائج
  useEffect(() => {
    if (selectedBrand && keyword.trim()) {
      fetchCoverage();
    } else {
      setRows([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrand, keyword]);

  const handleApply = () => {
    setKeyword(keywordInput.trim());
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <CardTitle className="text-lg">
          فرص الفلتر: موديلات ينقصها كلمة معيّنة
        </CardTitle>

        <div className="flex flex-col sm:flex-row gap-2 text-sm items-stretch sm:items-center">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground whitespace-nowrap">
              الماركة:
            </span>
            <Select
              value={selectedBrand}
              onValueChange={setSelectedBrand}
              disabled={brands.length === 0}
            >
              <SelectTrigger className="h-8 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {brands.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-muted-foreground whitespace-nowrap">
              الكلمة:
            </span>
            <Input
              className="h-8 w-[180px]"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="مثال: طقم كشاف"
            />
            <Button
              type="button"
              className="h-8 px-3 text-xs"
              onClick={handleApply}
            >
              تطبيق
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          يعرض هذا الجدول موديلات الماركة المحددة التي لا تحتوي على الكلمة
          المحددة في الفلتر، بناءً على بيانات استخدام الويدجت.
        </p>

        {loading ? (
          <div className="py-6 text-sm text-muted-foreground">
            جاري تحميل البيانات...
          </div>
        ) : rows.length === 0 ? (
          <div className="py-6 text-sm text-muted-foreground">
            لا توجد موديلات ناقصة لهذه الكلمة في الماركة المحددة، أو لم يتم
            تسجيل بيانات عنها حتى الآن.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>الموديل</TableHead>
                  <TableHead className="w-32 text-center">
                    عدد الاستخدام (لو موجود)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={`${row.model_name}-${idx}`}>
                    <TableCell className="text-center text-xs">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{row.model_name}</div>
                      <div className="text-xs text-muted-foreground">
                        هذا الموديل لا يحتوي على الكلمة{" "}
                        <span className="font-semibold">{keyword}</span> في
                        الفلتر حاليًا.
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm font-semibold">
                      {row.total_count ?? 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
