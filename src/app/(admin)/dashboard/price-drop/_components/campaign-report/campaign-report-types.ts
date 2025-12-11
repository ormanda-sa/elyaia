// FILE: src/app/(admin)/dashboard/price-drop/_components/campaign-report/campaign-report-types.ts

export type CampaignStatus =
  | "draft"
  | "active"
  | "paused"
  | "finished"
  | "cancelled";

export type DiscountType = "price" | "coupon";

export type TargetStatus =
  | "pending"
  | "notified"
  | "converted"
  | "skipped";

export type CampaignSummary = {
  id: number;
  product_title: string | null;
  product_image_url: string | null;
  product_url: string | null;
  discount_type: DiscountType;
  status: CampaignStatus;
  starts_at: string;
  ends_at: string | null;
  send_onsite: boolean;
  send_email: boolean;
  send_whatsapp: boolean;
  original_price: string | null;
  new_price: string | null;
  discount_percent: string | null;
};

export type CampaignReportStats = {
  total_targets: number;
  old_targets: number;
  new_targets: number;
  onsite_seen_count: number;
  converted_count: number;
};

export type CampaignReportCustomerRow = {
  id: number;
  salla_customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  whatsapp_number: string | null;
  status: TargetStatus;
  created_at: string;
  is_new: boolean;
  onsite_seen_at: string | null;
  email_sent_at: string | null;
  whatsapp_sent_at: string | null;
  converted_at: string | null;
  conversion_order_id: string | null;
  first_impression_at: string | null;
  first_click_at: string | null;
  first_close_at: string | null;
  first_order_at: string | null;

  // 👇 حالة الإيميل لهذا العميل (من price_drop_messages)
  email_delivered_at: string | null;
  email_failed_at: string | null;
  email_opened_at: string | null;
};

export type OnsiteFunnelStats = {
  impressions: number;
  clicks: number;
  closes: number;
  orders: number;
};

export type EmailFunnelStats = {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  opened: number;
};

export type CampaignReportData = {
  campaign: CampaignSummary;
  stats: CampaignReportStats;
  customers: CampaignReportCustomerRow[];
  onsite_funnel: OnsiteFunnelStats;
  email_funnel: EmailFunnelStats;
};

export type DatePreset = "7d" | "30d" | "all";

export function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ar-EG", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
