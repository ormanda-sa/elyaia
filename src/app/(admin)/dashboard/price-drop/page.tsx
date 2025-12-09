"use client";

import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { HighInterestProductsTable } from "./_components/high-interest-products-table";
import { StatsCards } from "./_components/stats-cards";
import { CampaignsList } from "./_components/campaigns-list";
import { CreateCampaignSheet } from "./_components/create-campaign-sheet";
import { ProductVisitorsDrawer } from "./_components/product-visitors-drawer";

export type HighInterestProduct = {
  product_id: string;
  product_title: string | null;
  product_url: string | null;
  current_price: number | null;
  total_views: number;
  unique_viewers: number;
  last_view_at: string | null;
};

export type PriceDropCampaign = {
  id: number;
  product_id: string;
  product_title: string | null;
  product_url: string | null;
  original_price: number;
  new_price: number;
  discount_percent: number;
  discount_type: "price" | "coupon";
  status: "draft" | "active" | "paused" | "finished" | "cancelled";
  starts_at: string;
  ends_at: string | null;
  send_onsite: boolean;
  send_email: boolean;
  send_whatsapp: boolean;
  created_at: string;

  coupon_code: string | null;
  coupon_expires_at: string | null;
  coupon_external_id: string | null;
  coupon_free_shipping: boolean | null; // 👈 هنا
};



export default function PriceDropPage() {
  const [selectedProduct, setSelectedProduct] =
    useState<HighInterestProduct | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [visitorsOpen, setVisitorsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleOpenCreate = (product: HighInterestProduct) => {
    setSelectedProduct(product);
    setCreateOpen(true);
  };

  const handleCampaignCreated = () => {
    setCreateOpen(false);
    setRefreshKey((k) => k + 1);
  };

  const handleOpenVisitors = (product: HighInterestProduct) => {
    setSelectedProduct(product);
    setVisitorsOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">تنبيهات نزول الأسعار</h1>
        <p className="text-sm text-muted-foreground mt-1">
          استهدف العملاء الذين شاهدوا منتجاتك أكثر من مرة بعروض خاصة ومحددة بزمن.
        </p>
      </div>

      <StatsCards key={refreshKey} />

      <Separator />

      <div className="grid gap-6 lg:grid-cols-[2fr,1.4fr]">
        <div className="space-y-4">
          <HighInterestProductsTable
            onCreateCampaign={handleOpenCreate}
            onShowVisitors={handleOpenVisitors}
          />
        </div>
        <div className="space-y-4">
          <CampaignsList refreshKey={refreshKey} />
        </div>
      </div>

      {/* شاشة إنشاء الحملة */}
      <CreateCampaignSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        product={selectedProduct}
        onCreated={handleCampaignCreated}
      />

      {/* دراور العملاء الزائرين للمنتج */}
      <ProductVisitorsDrawer
        open={visitorsOpen}
        onOpenChange={setVisitorsOpen}
        product={selectedProduct}
      />
    </div>
  );
}
