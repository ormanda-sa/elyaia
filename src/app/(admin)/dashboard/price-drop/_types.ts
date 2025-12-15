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
  coupon_free_shipping: boolean | null;
};
