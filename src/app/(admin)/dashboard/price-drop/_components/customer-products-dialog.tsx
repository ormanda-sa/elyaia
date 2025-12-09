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

  // 👇 معلومات الحملة (اختيارية) لكل منتج
  has_active_campaign?: boolean;
  active_campaign_id?: number | null;
  is_in_active_campaign?: boolean; // هل هذا العميل نفسه موجود في targets الحملة النشطة؟
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  products: CustomerProduct[];
  loading: boolean;

  // إنشاء حملة جديدة على هذا المنتج
  onCreateCampaignFromProduct: (p: CustomerProduct) => void;

  // 👇 ربط / إزالة هذا العميل من الحملة النشطة على المنتج (اختياري – انت تربطه من برّا)
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
        className="!max-w-[1100px] w-[95vw] max-h-[80vh] overflow-hidden rounded-2xl bg-background p-0"
      >
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="text-base font-semibold">
            المنتجات التي زارها العميل{" "}
            <span className="font-normal text-muted-foreground">
              {customer?.customer_name ||
                customer?.customer_email ||
                customer?.customer_phone ||
                ""}
            </span>
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="py-6 text-center text-sm">جاري التحميل...</div>
        )}

        {!loading && products.length === 0 && (
          <div className="py-6 text-center text-sm">
            لا توجد منتجات ضمن هذه المدة / الشروط لهذا العميل.
          </div>
        )}

        {!loading && products.length > 0 && (
          <div className="max-h-[calc(80vh-64px)] overflow-auto px-6 py-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%] text-right">المنتج</TableHead>
                  <TableHead className="w-[15%] text-right">
                    السعر الحالي
                  </TableHead>
                  <TableHead className="w-[15%] text-right">
                    عدد المشاهدات
                  </TableHead>
                  <TableHead className="w-[15%] text-right">
                    آخر زيارة
                  </TableHead>
                  <TableHead className="w-[15%] text-center">
                    حالة الحملة
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const hasActive = !!p.has_active_campaign;
                  const isInCampaign = !!p.is_in_active_campaign;

                  return (
                    <TableRow key={p.product_id}>
                      <TableCell className="max-w-[420px]">
                        <div className="flex flex-col gap-1">
                          <span className="line-clamp-2 text-sm font-medium">
                            {p.product_title || p.product_id}
                          </span>
                          {p.product_url && (
                            <a
                              className="text-xs text-muted-foreground underline underline-offset-4"
                              href={p.product_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              عرض في المتجر
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {p.current_price != null
                          ? `${p.current_price} ر.س`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {p.total_views}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {p.last_view_at
                          ? new Date(p.last_view_at).toLocaleString("en-GB")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-center align-top">
                        {/* حالة الحملة لهذا المنتج بالنسبة لهذا العميل */}
                        <div className="flex flex-col items-center gap-2 text-[11px]">
                          {hasActive ? (
                            <>
                              <div className="flex flex-col items-center gap-1">
                                <span className="inline-flex rounded-full bg-orange-50 px-2 py-0.5 font-medium text-orange-700">
                                  حملة خصم نشطة على المنتج
                                </span>
                                {isInCampaign ? (
                                  <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                                    العميل ضمن الحملة الحالية
                                  </span>
                                ) : (
                                  <span className="inline-flex rounded-full bg-slate-50 px-2 py-0.5 font-medium text-slate-600">
                                    العميل غير مضاف للحملة الحالية
                                  </span>
                                )}
                              </div>

                              {/* أزرار ضم / إزالة حسب حالة العميل */}
                              {isInCampaign ? (
                                onRemoveCustomerFromCampaign ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 rounded-full px-3 text-[11px] text-red-600"
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
                                  className="h-7 rounded-full px-3 text-[11px]"
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
                              <span className="inline-flex rounded-full bg-slate-50 px-2 py-0.5 font-medium text-slate-600">
                                لا توجد حملة نشطة على هذا المنتج
                              </span>
                              <Button
                                size="sm"
                                className="h-7 rounded-full px-3 text-[11px]"
                                onClick={() => onCreateCampaignFromProduct(p)}
                              >
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
        )}
      </DialogContent>
    </Dialog>
  );
}
