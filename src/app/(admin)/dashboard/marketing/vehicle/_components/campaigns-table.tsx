// FILE: src/app/dashboard/marketing/vehicle/_components/campaigns-table.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function fmt(dt?: string | null) {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleString("ar-SA");
  } catch {
    return dt;
  }
}

function totalTargets(c: any) {
  const arr = c?.marketing_campaigns_targets;
  if (Array.isArray(arr) && arr[0]?.count != null) return Number(arr[0].count) || 0;
  if (arr?.count != null) return Number(arr.count) || 0;
  return 0;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  active: "نشطة",
  paused: "موقوفة مؤقتًا",
  finished: "منتهية",
  cancelled: "ملغية",
};

function statusBadgeClass(status: string) {
  switch (status) {
    case "active":
      return "bg-green-600 text-white border-green-600";
    case "draft":
      return "bg-slate-700 text-white border-slate-700";
    case "paused":
      return "bg-amber-500 text-white border-amber-500";
    case "finished":
      return "bg-blue-600 text-white border-blue-600";
    case "cancelled":
      return "bg-red-600 text-white border-red-600";
    default:
      return "bg-gray-200 text-gray-900 border-gray-200";
  }
}

const AUDIENCE_LABELS: Record<string, string> = {
  public: "عام",
  targeted: "مستهدف",
};

const SCOPE_LABELS: Record<string, string> = {
  brand: "ماركة",
  model: "موديل",
  year: "سنة",
};

const TYPE_LABELS: Record<string, string> = {
  message: "رسالة",
  discount: "خصم",
};

export function CampaignsTable({
  items,
  loading,
  error,
  onOpenDetails,
  onRefresh,
}: {
  items: any[];
  loading: boolean;
  error: string | null;
  onOpenDetails: (id: number) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="rounded-2xl border bg-background">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="font-semibold">الحملات</div>
        <div className="text-sm text-muted-foreground">{items.length} حملة</div>
      </div>

      {error && (
        <div className="p-4">
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        </div>
      )}

      <div className="p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الحملة</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">النطاق</TableHead>
              <TableHead className="text-right">الجمهور</TableHead>
              <TableHead className="text-right">النوع</TableHead>
              <TableHead className="text-right">القنوات</TableHead>
              <TableHead className="text-right">المستهدفون</TableHead>
              <TableHead className="text-right">آخر تحديث</TableHead>
              <TableHead className="text-left">إجراءات</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  تحميل...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  لا توجد حملات. أنشئ حملة جديدة من زر “إنشاء حملة”.
                </TableCell>
              </TableRow>
            ) : (
              items.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/40">
                  <TableCell className="font-medium text-right">
                    <button
                      className="underline-offset-4 hover:underline"
                      onClick={() => onOpenDetails(c.id)}
                    >
                      {c.title}
                    </button>
                    <div className="text-xs text-muted-foreground mt-1">
                      يبدأ: {fmt(c.starts_at)} {c.ends_at ? `• ينتهي: ${fmt(c.ends_at)}` : ""}
                    </div>
                  </TableCell>

                  {/* ✅ حالة بالعربي + لون */}
                  <TableCell className="text-right">
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-3 py-1 text-xs border",
                        statusBadgeClass(c.status),
                      ].join(" ")}
                    >
                      {STATUS_LABELS[c.status] ?? c.status}
                    </span>
                  </TableCell>

                  {/* نطاق */}
                  <TableCell className="text-right">
                    <Badge variant="secondary">{SCOPE_LABELS[c.scope_level] ?? c.scope_level}</Badge>
                  </TableCell>

                  {/* جمهور */}
                  <TableCell className="text-right">
                    <Badge variant={c.audience_mode === "targeted" ? "default" : "outline"}>
                      {AUDIENCE_LABELS[c.audience_mode] ?? c.audience_mode}
                    </Badge>
                  </TableCell>

                  {/* نوع */}
                  <TableCell className="text-right">
                    <Badge variant={c.campaign_type === "discount" ? "default" : "outline"}>
                      {TYPE_LABELS[c.campaign_type] ?? c.campaign_type}
                    </Badge>
                  </TableCell>

                  {/* قنوات */}
                  <TableCell className="text-right text-xs">
                    {c.send_onsite ? "داخل المتجر " : ""}
                    {c.send_email ? "إيميل " : ""}
                    {c.send_whatsapp ? "واتساب" : ""}
                    {!c.send_onsite && !c.send_email && !c.send_whatsapp ? "—" : ""}
                  </TableCell>

                  {/* مستهدفون */}
                  <TableCell className="text-right">
                    <div className="text-sm font-semibold">{totalTargets(c)}</div>
                    {c.audience_mode === "targeted" ? (
                      <div className="text-xs text-muted-foreground">
                        أُضيف آخر تحديث: {c.targets_last_refreshed_count ?? 0}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">عام (بدون مستهدفين)</div>
                    )}
                  </TableCell>

                  {/* آخر تحديث */}
                  <TableCell className="text-right text-xs">
                    {c.audience_mode === "targeted" ? fmt(c.targets_last_refreshed_at) : "—"}
                  </TableCell>

                  {/* إجراءات */}
                  <TableCell className="text-left">
                    <div className="flex gap-2 justify-end">
                      <Button variant="secondary" size="sm" onClick={() => onOpenDetails(c.id)}>
                        تفاصيل
                      </Button>
                      <Button variant="outline" size="sm" onClick={onRefresh}>
                        تحديث
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
