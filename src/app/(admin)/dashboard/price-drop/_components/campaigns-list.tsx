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
import { CampaignReportDialog } from "./campaign-report-dialog";
import type { CampaignSummary } from "./campaign-report/campaign-report-types";
import {
  Package,
  ExternalLink,
  Percent,
  Edit3,
  Trash2,
  FileText,
  Users,
  MessageSquare,
  Loader2,
  AlertCircle,
  TrendingDown,
  Ticket,
  Truck,
  Activity,
  MoreVertical,
} from "lucide-react";
import { LoadingState } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  refreshKey?: number;
};

export function CampaignsList({ refreshKey }: Props) {
  const [items, setItems] = useState<PriceDropCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] =
    useState<PriceDropCampaign | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCampaign, setDeletingCampaign] =
    useState<PriceDropCampaign | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] =
    useState<CampaignSummary | null>(null);

  const [buildingTargets, setBuildingTargets] = useState<number | null>(null);
  const [buildingMessages, setBuildingMessages] = useState<number | null>(null);

  const openReport = (campaign: PriceDropCampaign) => {
    const summary: CampaignSummary = {
      id: campaign.id,
      product_title: campaign.product_title,
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

  const handleBuildTargets = async (campaign: PriceDropCampaign) => {
    setBuildingTargets(campaign.id);
    try {
      const res = await fetch(
        `/api/dashboard/price-drop/campaigns/${campaign.id}/build-targets`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("failed to build targets", json);
        alert(
          "تعذر بناء العملاء المستهدفين، تأكد من وجود مشاهدات للمنتج.",
        );
        return;
      }

      const created = json.created ?? 0;

      alert(
        created > 0
          ? `تم بنجاح بناء العملاء المستهدفين لهذه الحملة.\nعدد العملاء المضافين: ${created}`
          : "لا يوجد عملاء جدد يمكن ضمّهم لهذه الحملة حالياً.",
      );

      await reload();
    } catch (e) {
      console.error(e);
      alert("حدث خطأ غير متوقع أثناء بناء العملاء المستهدفين.");
    } finally {
      setBuildingTargets(null);
    }
  };

  const handleBuildMessages = async (campaign: PriceDropCampaign) => {
    setBuildingMessages(campaign.id);
    try {
      const res = await fetch(
        `/api/dashboard/price-drop/campaigns/${campaign.id}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("failed to build messages", json);
        alert("تعذر بناء رسائل الحملة، تأكد من وجود عملاء مستهدفين.");
        return;
      }

      const createdEmail = json.created_email ?? 0;
      const createdWhatsapp = json.created_whatsapp ?? 0;

      alert(
        `تم بناء رسائل الحملة.\nإيميل: ${createdEmail}\nواتساب: ${createdWhatsapp}`,
      );
    } catch (e) {
      console.error(e);
      alert("حدث خطأ غير متوقع أثناء بناء رسائل الحملة.");
    } finally {
      setBuildingMessages(null);
    }
  };

  return (
    <>
      <Card className="rounded-2xl border border-slate-200 shadow-sm">
        <CardHeader className="pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-600 p-2">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-900">
                  الحملات التسويقية
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  إدارة ومتابعة جميع الحملات
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {items.length} حملة
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="text-right text-xs font-semibold text-slate-700">
                    المنتج
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-700">
                    الخصم
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-700">
                    التاريخ
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-700">
                    القنوات
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-700">
                    الحالة
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold text-slate-700">
                    التفعيل
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold text-slate-700">
                    الإجراءات
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <LoadingState message="جاري تحميل الحملات" />
                    </TableCell>
                  </TableRow>
                )}

                {!loading && items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <EmptyState
                        icon={Package}
                        title="لا توجد حملات حالياً"
                        description="ابدأ بإنشاء حملة من المنتجات ذات الاهتمام العالي."
                      />
                    </TableCell>
                  </TableRow>
                )}

                {!loading &&
                  items.map((c) => (
                    <TableRow
                      key={c.id}
                      className="hover:bg-slate-50/50 border-b border-slate-100 last:border-0"
                    >
                      <TableCell className="max-w-[200px]">
                        <div className="flex flex-col gap-1.5">
                          <span className="line-clamp-2 text-sm font-medium text-slate-900">
                            {c.product_title || c.product_id}
                          </span>
                          {c.product_url && (
                            <a
                              href={c.product_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 w-fit"
                            >
                              <span>عرض المنتج</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        {c.discount_type === "coupon" ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <Ticket className="h-3.5 w-3.5 text-amber-600" />
                              <span className="text-xs font-medium text-slate-700">
                                كوبون
                              </span>
                            </div>
                            <Badge variant="secondary" className="text-xs w-fit">
                              {Math.round(c.discount_percent)}%
                            </Badge>
                            {c.coupon_free_shipping && (
                              <div className="flex items-center gap-1 text-xs text-sky-700">
                                <Truck className="h-3 w-3" />
                                <span>شحن مجاني</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <TrendingDown className="h-3.5 w-3.5 text-emerald-600" />
                              <span className="text-xs font-medium">تخفيض سعر</span>
                            </div>
                            <div className="text-xs text-slate-600">
                              <span className="line-through">{c.original_price}</span>
                              <span className="mx-1">←</span>
                              <span className="font-bold text-emerald-700">{c.new_price}</span>
                            </div>
                            <Badge variant="secondary" className="text-xs w-fit">
                              {Math.round(c.discount_percent)}%
                            </Badge>
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col gap-1 text-xs text-slate-600">
                          <div>
                            {new Date(c.starts_at).toLocaleDateString("ar-SA", {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                          {c.ends_at && (
                            <div className="text-slate-500">
                              إلى{" "}
                              {new Date(c.ends_at).toLocaleDateString("ar-SA", {
                                month: "short",
                                day: "numeric",
                              })}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <ChannelsBadges
                          send_onsite={c.send_onsite}
                          send_email={c.send_email}
                          send_whatsapp={c.send_whatsapp}
                        />
                      </TableCell>

                      <TableCell>
                        <StatusBadge status={c.status} />
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={c.status === "active"}
                            onCheckedChange={(checked) =>
                              handleToggleStatus(c, checked)
                            }
                          />
                          <span className="text-xs text-slate-600">
                            {c.status === "active" ? "مفعّلة" : "موقفة"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs text-blue-700 hover:bg-blue-100 font-medium"
                            onClick={() => {
                              setEditingCampaign(c);
                              setEditSheetOpen(true);
                            }}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            تعديل
                          </button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center justify-center rounded-lg hover:bg-slate-100 p-1.5"
                              >
                                <MoreVertical className="h-4 w-4 text-slate-600" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => openReport(c)}>
                                <FileText className="h-4 w-4 ml-2" />
                                عرض التقرير
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem
                                disabled={buildingTargets === c.id}
                                onClick={() => handleBuildTargets(c)}
                              >
                                {buildingTargets === c.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                                    جاري البناء...
                                  </>
                                ) : (
                                  <>
                                    <Users className="h-4 w-4 ml-2" />
                                    بناء العملاء
                                  </>
                                )}
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem
                                disabled={buildingMessages === c.id}
                                onClick={() => handleBuildMessages(c)}
                              >
                                {buildingMessages === c.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                                    جاري البناء...
                                  </>
                                ) : (
                                  <>
                                    <MessageSquare className="h-4 w-4 ml-2" />
                                    بناء الرسائل
                                  </>
                                )}
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={() => {
                                  setDeletingCampaign(c);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 ml-2" />
                                حذف الحملة
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
          onUpdated={reload}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl" className="rounded-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-lg bg-red-600 p-2.5">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
              <AlertDialogTitle className="text-lg font-bold text-slate-900">
                حذف الحملة
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-slate-600 text-right">
              هل أنت متأكد من حذف هذه الحملة؟ سيتم إيقاف تشغيلها وحذف الأهداف
              المرتبطة بها، ولا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              disabled={deleteLoading}
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الحذف...
                </span>
              ) : (
                "نعم، حذف الحملة"
              )}
            </AlertDialogAction>
            <AlertDialogCancel disabled={deleteLoading}>
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CampaignReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        campaign={selectedCampaign}
      />
    </>
  );
}

function StatusBadge({ status }: { status: PriceDropCampaign["status"] }) {
  const config = {
    active: {
      text: "نشطة",
      className: "bg-emerald-100 text-emerald-800 border-emerald-200",
    },
    draft: {
      text: "مسودة",
      className: "bg-slate-100 text-slate-700 border-slate-200",
    },
    paused: {
      text: "موقفة",
      className: "bg-amber-100 text-amber-800 border-amber-200",
    },
    finished: {
      text: "منتهية",
      className: "bg-sky-100 text-sky-800 border-sky-200",
    },
    cancelled: {
      text: "ملغاة",
      className: "bg-red-100 text-red-800 border-red-200",
    },
  };

  const current = config[status] || config.draft;

  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium border ${current.className}`}
    >
      {current.text}
    </Badge>
  );
}
