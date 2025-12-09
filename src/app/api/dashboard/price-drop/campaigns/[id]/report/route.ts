import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

type CampaignStatus = "draft" | "active" | "paused" | "finished" | "cancelled";
type DiscountType = "price" | "coupon";
type TargetStatus = "pending" | "notified" | "converted" | "skipped";

type PriceDropCampaign = {
  id: number;
  store_id: string;
  product_id: string;
  product_title: string | null;
  product_image_url: string | null;
  product_url: string | null;
  original_price: string | null;
  new_price: string | null;
  discount_percent: string | null;
  discount_type: DiscountType;
  coupon_code: string | null;
  coupon_expires_at: string | null;
  send_onsite: boolean;
  send_email: boolean;
  send_whatsapp: boolean;
  duration_hours: number;
  starts_at: string;
  ends_at: string | null;
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
};

type PriceDropTarget = {
  id: number;
  campaign_id: number;
  store_id: string;
  product_id: string;
  salla_customer_id: string | null;
  customer_email: string | null;
  whatsapp_number: string | null;
  last_view_at: string | null;
  views_last_7d: number;
  email_sent_at: string | null;
  whatsapp_sent_at: string | null;
  onsite_seen_at: string | null;
  converted_at: string | null;
  conversion_order_id: string | null;
  status: TargetStatus;
  created_at: string;
};

type CampaignReportStats = {
  total_targets: number;
  old_targets: number;
  new_targets: number;
  onsite_seen_count: number;
  converted_count: number;
};

type CampaignReportCustomerRow = {
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

type CampaignReportResponse = {
  campaign: PriceDropCampaign;
  stats: CampaignReportStats;
  customers: CampaignReportCustomerRow[];
};

function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function isWithinRange(
  dateStr: string | null,
  from: Date | null,
  to: Date | null,
): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

// ✅ هنا التعديل المهم: ما نفك params في توقيع الدالة، ونستخدم await داخلها
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params; // 👈 نفك الـ Promise هنا
    const supabase = getSupabaseServerClient();
    const storeId = await getCurrentStoreId();

    if (!storeId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const campaignId = Number(id);
    if (Number.isNaN(campaignId)) {
      return NextResponse.json(
        { error: "INVALID_CAMPAIGN_ID" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const fromDate = parseDateParam(fromParam);
    const toDate = parseDateParam(toParam);

    // 1) الحملة
    const { data: campaign, error: campaignError } = await supabase
      .from("price_drop_campaigns")
      .select("*")
      .eq("store_id", storeId)
      .eq("id", campaignId)
      .maybeSingle<PriceDropCampaign>();

    if (campaignError) {
      console.error("campaignError", campaignError);
      return NextResponse.json(
        { error: "CAMPAIGN_FETCH_ERROR" },
        { status: 500 },
      );
    }

    if (!campaign) {
      return NextResponse.json(
        { error: "CAMPAIGN_NOT_FOUND" },
        { status: 404 },
      );
    }

    // 2) targets
    const { data: targets, error: targetsError } = (await supabase
      .from("price_drop_targets")
      .select("*")
      .eq("store_id", storeId)
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true })) as {
      data: PriceDropTarget[] | null;
      error: any;
    };

    if (targetsError) {
      console.error("targetsError", targetsError);
      return NextResponse.json(
        { error: "TARGETS_FETCH_ERROR" },
        { status: 500 },
      );
    }

    const safeTargets = targets ?? [];

    const campaignStart = new Date(campaign.starts_at);
    const from = fromDate ?? campaignStart;
    const to = toDate ?? null;

    // 3) حساب الإحصائيات
    let total_targets = safeTargets.length;
    let old_targets = 0;
    let new_targets = 0;
    let onsite_seen_count = 0;
    let converted_count = 0;

    const customers: CampaignReportCustomerRow[] = safeTargets.map((t) => {
      const createdAtDate = new Date(t.created_at);
      const isNew = createdAtDate > campaignStart;

      if (isNew) new_targets += 1;
      else old_targets += 1;

      const seenInRange = isWithinRange(t.onsite_seen_at, from, to);
      const convertedInRange = isWithinRange(t.converted_at, from, to);

      if (seenInRange) onsite_seen_count += 1;
      if (convertedInRange) converted_count += 1;

      return {
        id: t.id,
        salla_customer_id: t.salla_customer_id,
        customer_email: t.customer_email,
        whatsapp_number: t.whatsapp_number,
        status: t.status,
        created_at: t.created_at,
        is_new: isNew,
        onsite_seen_at: t.onsite_seen_at,
        email_sent_at: t.email_sent_at,
        whatsapp_sent_at: t.whatsapp_sent_at,
        converted_at: t.converted_at,
        conversion_order_id: t.conversion_order_id,
      };
    });

    const stats: CampaignReportStats = {
      total_targets,
      old_targets,
      new_targets,
      onsite_seen_count,
      converted_count,
    };

    const payload: CampaignReportResponse = {
      campaign,
      stats,
      customers,
    };

    return NextResponse.json(payload);
  } catch (err) {
    console.error("CAMPAIGN_REPORT_ERROR", err);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
