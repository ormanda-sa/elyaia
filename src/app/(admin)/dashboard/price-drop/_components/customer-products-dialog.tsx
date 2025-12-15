"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Package,
  DollarSign,
  Eye,
  Clock,
  ShoppingBag,
  User,
  ExternalLink,
} from "lucide-react";
 
import { LoadingState } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
type Customer = {
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
};

type CustomerProduct = {
  product_id: string;
  product_title: string | null;
  product_url: string | null;
  current_price: number | null;
  total_views: number;
  last_view_at: string | null;

  has_active_campaign?: boolean;
  active_campaign_id?: number | null;
  is_in_active_campaign?: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  products: CustomerProduct[];
  loading: boolean;

  onCreateCampaignFromProduct: (p: CustomerProduct) => void;

  onAttachCustomerToCampaign?: (p: CustomerProduct) => void;
  onRemoveCustomerFromCampaign?: (p: CustomerProduct) => void;
};

export function CustomerProductsDialog({
  open,
  onOpenChange,
  customer,
  products,
  loading,
  onCreateCampaignFromProduct,
  onAttachCustomerToCampaign,
  onRemoveCustomerFromCampaign,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="!max-w-[1100px] w-[95vw] max-h-[80vh] overflow-hidden rounded-2xl border-muted/40 bg-background p-0"
      >
        <DialogHeader className="border-b border-muted/40 bg-muted/20 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-blue-500/10 p-1.5">
              <User className="h-4 w-4 text-blue-600" />
            </div>
            <DialogTitle className="text-base font-semibold">
              المنتجات التي زارها العميل{" "}
              <span className="font-normal text-muted-foreground">
                {customer?.customer_name ||
                  customer?.customer_email ||
                  customer?.customer_phone ||
                  ""}
              </span>
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(80vh-76px)] overflow-auto">
          {loading && (
            <div className="p-8">
              <LoadingState message="جاري تحميل المنتجات..." />
            </div>
          )}

          {!loading && products.length === 0 && (
            <div className="p-8">
              <EmptyState
                icon={Package}
                title="لا توجد منتجات"
                description="لا توجد منتجات ضمن هذه المدة / الشروط لهذا العميل"
              />
            </div>
          )}

          {!loading && products.length > 0 && (
            <div className="p-6">
              <div className="overflow-hidden rounded-xl border border-muted/40">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableHead className="w-[35%] text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="font-semibold">المنتج</span>
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TableHead>
                      <TableHead className="w-[13%] text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="font-semibold">السعر الحالي</span>
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TableHead>
                      <TableHead className="w-[13%] text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="font-semibold">عدد المشاهدات</span>
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TableHead>
                      <TableHead className="w-[15%] text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="font-semibold">آخر زيارة</span>
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TableHead>
                      <TableHead className="w-[24%] text-center">
                        <span className="font-semibold">حالة الحملة</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((p) => {
                      const hasActive = !!p.has_active_campaign;
                      const isInCampaign = !!p.is_in_active_campaign;

                      return (
                        <TableRow
                          key={p.product_id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <TableCell className="max-w-[380px]">
                            <div className="flex flex-col gap-1.5">
                              <span className="line-clamp-2 text-sm font-medium">
                                {p.product_title || p.product_id}
                              </span>
                              {p.product_url && (
                                <a
                                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors w-fit"
                                  href={p.product_url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <span>عرض في المتجر</span>
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {p.current_price != null ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-700">
                                {p.current_price} ر.س
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-700">
                              {p.total_views}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {p.last_view_at
                              ? new Date(p.last_view_at).toLocaleString(
                                  "en-GB"
                                )
                              : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-2">
                              {hasActive ? (
                                <>
                                  <div className="flex flex-col items-center gap-1.5">
                                    <span className="inline-flex items-center rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-700">
                                      حملة خصم نشطة على المنتج
                                    </span>
                                    {isInCampaign ? (
                                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700">
                                        العميل ضمن الحملة الحالية
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center rounded-full bg-slate-500/10 px-3 py-1 text-xs font-medium text-slate-600">
                                        العميل غير مضاف للحملة الحالية
                                      </span>
                                    )}
                                  </div>

                                  {isInCampaign ? (
                                    onRemoveCustomerFromCampaign ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 rounded-xl border-red-200 px-3 text-xs text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
                                        onClick={() =>
                                          onRemoveCustomerFromCampaign(p)
                                        }
                                      >
                                        إزالة العميل من الحملة
                                      </Button>
                                    ) : null
                                  ) : onAttachCustomerToCampaign ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 rounded-xl px-3 text-xs hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors"
                                      onClick={() =>
                                        onAttachCustomerToCampaign(p)
                                      }
                                    >
                                      ضم العميل إلى الحملة
                                    </Button>
                                  ) : null}
                                </>
                              ) : (
                                <>
                                  <span className="inline-flex items-center rounded-full bg-slate-500/10 px-3 py-1 text-xs font-medium text-slate-600">
                                    لا توجد حملة نشطة على هذا المنتج
                                  </span>
                                  <Button
                                    size="sm"
                                    className="h-7 rounded-xl bg-blue-600 hover:bg-blue-700 px-3 text-xs transition-colors"
                                    onClick={() =>
                                      onCreateCampaignFromProduct(p)
                                    }
                                  >
                                    <ShoppingBag className="h-3 w-3 ml-1" />
                                    إنشاء حملة
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
