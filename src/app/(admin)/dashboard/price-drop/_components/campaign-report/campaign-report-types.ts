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
};

export type CampaignReportData = {
  campaign: CampaignSummary;
  stats: CampaignReportStats;
  customers: CampaignReportCustomerRow[];
};

export type DatePreset = "7d" | "30d" | "all";

export function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ar-SA", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
