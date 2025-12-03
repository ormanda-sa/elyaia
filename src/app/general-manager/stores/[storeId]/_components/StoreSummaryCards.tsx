// src/app/general-manager/stores/[storeId]/_components/StoreSummaryCards.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function IconTrendingUp(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={props.className ?? "h-4 w-4"}>
      <path
        d="M4 16L10 10L14 14L20 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 8H20V13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type StoreSummaryCardsProps = {
  store: {
    name: string;
    domain: string | null;
    owner_email: string | null;
    status: string;
    created_at: string;
  };
  stats: {
    total_searches_90d: number;
    monthly_revenue: number;
  };
};

export function StoreSummaryCards({ store, stats }: StoreSummaryCardsProps) {
  const statusLabel =
    store.status === "active"
      ? "نشط"
      : store.status === "suspended"
      ? "موقوف"
      : store.status === "trial"
      ? "تجريبي"
      : store.status;

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {/* معلومات المتجر الأساسية */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>معلومات المتجر</CardDescription>
          <CardTitle className="text-base @[250px]/card:text-lg">
            {store.name}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-[11px]">
              الحالة: {statusLabel}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-[11px] text-slate-600">
          <div>النطاق: {store.domain || "-"}</div>
          <div>البريد: {store.owner_email || "-"}</div>
          <div>
            تاريخ الإضافة:{" "}
            {new Date(store.created_at).toLocaleDateString("ar-EG")}
          </div>
        </CardFooter>
      </Card>

      {/* إجمالي البحث */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>إجمالي عمليات البحث (آخر 90 يوم)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.total_searches_90d}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp className="h-4 w-4" />
              <span className="ml-1 text-[11px]">نقص/زيادة تشوفها من الرسم</span>
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-[11px] text-slate-600">
          <div>نشاط الفلتر لهذا المتجر خلال آخر 3 أشهر.</div>
        </CardFooter>
      </Card>

      {/* الإيراد الشهري الحالي */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>الإيراد الشهري الحالي</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.monthly_revenue.toLocaleString("ar-EG")} ر.س
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="text-[11px]">
              خطة المتجر الحالية
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-[11px] text-slate-600">
          <div>مجموع قيمة الاشتراك النشط الحالي لهذا المتجر.</div>
        </CardFooter>
      </Card>

      {/* كرت بسيط إضافي (احتياطي) */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>ملاحظات</CardDescription>
          <CardTitle className="text-base @[250px]/card:text-lg">
            ملخص سريع
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-[11px] text-slate-600">
          <div>تقدر تستخدم هذا الكرت لأي ملاحظة إدارية تخص المتجر.</div>
        </CardFooter>
      </Card>
    </div>
  );
}
