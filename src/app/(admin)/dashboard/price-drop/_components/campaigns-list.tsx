"use client";

import { useEffect, useState } from "react";
import { PriceDropCampaign } from "../page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChannelsBadges } from "./channels-badges";
import { Badge } from "@/components/ui/badge";
import { CreateCampaignSheet } from "./create-campaign-sheet";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Switch } from "@/components/ui/switch";

// 👇 الإضافة الجديدة
 

import { CampaignReportDialog } from "./campaign-report-dialog";
import type { CampaignSummary } from "./campaign-report/campaign-report-types";

type Props = {
  refreshKey?: number;
};

export function CampaignsList({ refreshKey }: Props) {
  const [items, setItems] = useState<PriceDropCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  // للحفظ بعد التعديل
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] =
    useState<PriceDropCampaign | null>(null);

  // حالات الحذف
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCampaign, setDeletingCampaign] =
    useState<PriceDropCampaign | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 👇 حالات تقرير الحملة
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] =
    useState<CampaignSummary | null>(null);

  const openReport = (campaign: PriceDropCampaign) => {
    const summary: CampaignSummary = {
      id: campaign.id,
      product_title: campaign.product_title,
      // لو ما عندك product_image_url في التايب، عادي خله null
      product_image_url: (campaign as any).product_image_url ?? null,
      product_url: campaign.product_url,
      discount_type: campaign.discount_type as any,
      status: campaign.status as any,
      starts_at: campaign.starts_at,
      ends_at: campaign.ends_at,
      send_onsite: campaign.send_onsite,
      send_email: campaign.send_email,
      send_whatsapp: campaign.send_whatsapp,
      original_price: String(campaign.original_price ?? ""),
      new_price: String(campaign.new_price ?? ""),
      discount_percent: String(campaign.discount_percent ?? ""),
    };

    setSelectedCampaign(summary);
    setReportOpen(true);
  };

  const reload = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/price-drop/campaigns");
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/dashboard/price-drop/campaigns");
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        if (!cancelled) setItems(data.items ?? []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // تشغيل / إيقاف الحملة
  const handleToggleStatus = async (
    campaign: PriceDropCampaign,
    checked: boolean,
  ) => {
    const nextStatus = checked ? "active" : "paused";

    try {
      const res = await fetch(
        `/api/dashboard/price-drop/campaigns/${campaign.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: nextStatus }),
        },
      );

      if (!res.ok) {
        console.error("failed to toggle campaign status");
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === campaign.id ? { ...item, status: nextStatus } : item,
        ),
      );
    } catch (e) {
      console.error(e);
    }
  };

  // تنفيذ الحذف بعد التأكيد
  const handleDelete = async () => {
    if (!deletingCampaign) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/price-drop/campaigns/${deletingCampaign.id}`,
        { method: "DELETE" },
      );

      if (!res.ok) {
        console.error("failed to delete campaign");
        return;
      }

      setItems((prev) =>
        prev.filter((item) => item.id !== deletingCampaign.id),
      );
    } finally {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
      setDeletingCampaign(null);
    }
  };

  return (
    <>
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            الحملات الحالية
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الحملة</TableHead>
                  <TableHead className="text-right">الخصم</TableHead>
                  <TableHead className="text-right">الفترة</TableHead>
                  <TableHead className="text-right">القنوات</TableHead>
                  <TableHead className="text-right">الشحن</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-6 text-center text-sm"
                    >
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                )}

                {!loading && items.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-6 text-center text-sm"
                    >
                      ما فيه حملات حالياً. ابدأ بإنشاء حملة من المنتجات ذات
                      الاهتمام العالي.
                    </TableCell>
                  </TableRow>
                )}

                {!loading &&
                  items.map((c) => (
                    <TableRow key={c.id}>
                      {/* الحملة */}
                      <TableCell className="max-w-[220px]">
                        <div className="flex flex-col gap-1">
                          <span className="line-clamp-2 text-sm font-medium">
                            {c.product_title || c.product_id}
                          </span>
                          {c.product_url && (
                            <a
                              href={c.product_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-muted-foreground underline underline-offset-4"
                            >
                              عرض المنتج
                            </a>
                          )}
                        </div>
                      </TableCell>

                      {/* الخصم */}
                      <TableCell className="text-sm">
                        {c.discount_type === "coupon" ? (
                          <>كوبون – تقريباً %{Math.round(c.discount_percent)}</>
                        ) : (
                          <>
                            من {c.original_price} إلى {c.new_price} ر.س{" "}
                            <span className="text-xs text-muted-foreground">
                              (خصم %{Math.round(c.discount_percent)})
                            </span>
                          </>
                        )}
                      </TableCell>

                      {/* الفترة */}
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(c.starts_at).toLocaleString("ar-SA")}
                        {c.ends_at && (
                          <>
                            <br />
                            حتى {new Date(c.ends_at).toLocaleString("ar-SA")}
                          </>
                        )}
                      </TableCell>

                      {/* القنوات */}
                      <TableCell>
                        <ChannelsBadges
                          send_onsite={c.send_onsite}
                          send_email={c.send_email}
                          send_whatsapp={c.send_whatsapp}
                        />
                      </TableCell>

                      {/* الشحن */}
                      <TableCell className="text-xs">
                        {c.discount_type === "coupon" && c.coupon_free_shipping
                          ? "شحن مجاني"
                          : c.discount_type === "coupon"
                          ? "بدون"
                          : "—"}
                      </TableCell>

                      {/* الحالة */}
                      <TableCell className="text-xs">
                        <StatusBadge status={c.status} />
                      </TableCell>

                      {/* الإجراءات */}
                      <TableCell className="text-xs">
                        <div className="flex items-center justify-end gap-4">
                          {/* السويتش + حالة نصية صغيرة */}
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={c.status === "active"}
                              onCheckedChange={(checked) =>
                                handleToggleStatus(c, checked)
                              }
                            />
                            <span className="text-[11px] text-muted-foreground">
                              {c.status === "active"
                                ? "مفعّلة"
                                : "موقفة مؤقتاً"}
                            </span>
                          </div>

                          {/* أزرار تعديل / حذف / تقرير الحملة */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="text-xs text-primary underline underline-offset-4"
                              onClick={() => {
                                setEditingCampaign(c);
                                setEditSheetOpen(true);
                              }}
                            >
                              تعديل
                            </button>

                            <span className="text-muted-foreground">/</span>

                            <button
                              type="button"
                              className="text-xs text-destructive underline underline-offset-4"
                              onClick={() => {
                                setDeletingCampaign(c);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              حذف
                            </button>

                            <span className="text-muted-foreground">/</span>

                            <button
                              type="button"
                              className="text-xs text-muted-foreground underline underline-offset-4"
                              onClick={() => openReport(c)}
                            >
                              تقرير الحملة
                            </button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {editingCampaign && (
        <CreateCampaignSheet
          mode="edit"
          open={editSheetOpen}
          onOpenChange={(open) => {
            setEditSheetOpen(open);
            if (!open) setEditingCampaign(null);
          }}
          product={null}
          existingCampaign={editingCampaign}
          onUpdated={() => {
            reload();
          }}
        />
      )}

      {/* بوب أب تأكيد حذف الحملة */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الحملة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه الحملة؟ سيتم إيقاف تشغيلها وحذف الأهداف
              المرتبطة بها، ولا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              disabled={deleteLoading}
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? "جاري الحذف..." : "نعم، حذف الحملة"}
            </AlertDialogAction>
            <AlertDialogCancel disabled={deleteLoading}>
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* بوب أب تقرير الحملة */}
      <CampaignReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        campaign={selectedCampaign}
      />
    </>
  );
}

function StatusBadge({
  status,
}: {
  status: PriceDropCampaign["status"];
}) {
  const text =
    status === "active"
      ? "نشطة"
      : status === "draft"
      ? "مسودة"
      : status === "paused"
      ? "موقفة مؤقتاً"
      : status === "finished"
      ? "منتهية"
      : "ملغاة";

  return <Badge className="text-[11px]">{text}</Badge>;
}
