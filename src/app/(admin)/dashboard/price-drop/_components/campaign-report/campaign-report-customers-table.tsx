// FILE: src/app/(admin)/dashboard/price-drop/_components/campaign-report/campaign-report-customers-table.tsx

"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  CampaignReportCustomerRow,
  CampaignSummary,
  formatDate,
} from "./campaign-report-types";

type Props = {
  customers: CampaignReportCustomerRow[];
  campaign: CampaignSummary | null;
};

export function CampaignReportCustomersTable({ customers, campaign }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">تفاصيل العملاء (On-site أولاً)</h3>
        <span className="text-xs text-muted-foreground">
          يظهر جميع الـ targets مع حالة المشاهدة والتحويل وسلوك الإعلان في الفترة
          المختارة
        </span>
      </div>

      <div className="max-h-[420px] overflow-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">العميل</TableHead>
              <TableHead>قناة الإشعار</TableHead>
              <TableHead>مشاهدة On-site / سلوك الإعلان</TableHead>
              <TableHead>تحويل</TableHead>
              <TableHead>رقم الطلب</TableHead>
              <TableHead>نوع العميل</TableHead>
              <TableHead>تاريخ الإضافة للحملة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  لا يوجد عملاء في هذه الحملة حتى الآن.
                </TableCell>
              </TableRow>
            )}

            {customers.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="text-xs">
                  <div className="flex flex-col gap-0.5">
                    {c.customer_name && (
                      <span className="font-medium">{c.customer_name}</span>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {c.salla_customer_id || "عميل بدون رقم Salla"}
                    </span>
                    {c.customer_email && (
                      <span className="text-[11px] text-muted-foreground">
                        {c.customer_email}
                      </span>
                    )}
                    {c.whatsapp_number && (
                      <span className="text-[11px] text-muted-foreground">
                        واتساب: {c.whatsapp_number}
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-xs">
                  <div className="flex flex-col gap-0.5">
                    {c.email_sent_at && (
                      <span className="text-[11px]">
                        Email: {formatDate(c.email_sent_at)}
                      </span>
                    )}
                    {c.whatsapp_sent_at && (
                      <span className="text-[11px]">
                        WhatsApp: {formatDate(c.whatsapp_sent_at)}
                      </span>
                    )}
                    {campaign?.send_onsite && (
                      <span className="text-[11px] text-muted-foreground">
                        On-site: يعتمد على ظهور البانر/العرض
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-xs">
                  <div className="flex flex-col gap-0.5">
                    {c.first_impression_at ? (
                      <Badge
                        variant="outline"
                        className="border-green-500 text-[11px] text-green-600"
                      >
                        شاهد البوب أب
                      </Badge>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        لم يظهر له البوب أب بعد
                      </span>
                    )}

                    {c.first_impression_at && (
                      <span className="text-[11px] text-muted-foreground">
                        أول ظهور: {formatDate(c.first_impression_at)}
                      </span>
                    )}

                    {c.first_click_at && (
                      <span className="text-[11px] text-blue-600">
                        نقر على الإعلان: {formatDate(c.first_click_at)}
                      </span>
                    )}

                    {!c.first_click_at && c.first_close_at && (
                      <span className="text-[11px] text-muted-foreground">
                        أغلق الإعلان بدون نقر: {formatDate(c.first_close_at)}
                      </span>
                    )}

                    {c.first_order_at && (
                      <span className="text-[11px] text-emerald-600">
                        طلب بعد الإعلان: {formatDate(c.first_order_at)}
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-xs">
                  {c.converted_at ? (
                    <Badge
                      variant="outline"
                      className="border-green-500 text-[11px] text-green-600"
                    >
                      متحوّل
                    </Badge>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">
                      لم يتحوّل بعد
                    </span>
                  )}
                  {c.converted_at && (
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {formatDate(c.converted_at)}
                    </div>
                  )}
                </TableCell>

                <TableCell className="text-xs">
                  {c.conversion_order_id ?? "-"}
                </TableCell>

                <TableCell className="text-xs">
                  {c.is_new ? (
                    <Badge
                      variant="secondary"
                      className="bg-emerald-50 text-[11px] text-emerald-700"
                    >
                      انضم بعد إطلاق الحملة
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[11px]">
                      من أول الإطلاق
                    </Badge>
                  )}
                </TableCell>

                <TableCell className="text-xs">
                  {formatDate(c.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
