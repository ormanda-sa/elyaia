// FILE: src/app/(admin)/api/dashboard/price-drop/campaigns/[id]/report/route.ts
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
};

type OnsiteFunnelStats = {
  impressions: number;
  clicks: number;
  closes: number;
  orders: number;
};

type EmailFunnelStats = {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  opened: number;
};

type CampaignReportResponse = {
  campaign: PriceDropCampaign;
  stats: CampaignReportStats;
  customers: CampaignReportCustomerRow[];
  onsite_funnel: OnsiteFunnelStats;
  email_funnel: EmailFunnelStats;
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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
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

    // 👇 نجلب أحدث customer_name لكل (product_id + salla_customer_id)
    const productIds = Array.from(
      new Set(
        safeTargets
          .map((t) => t.product_id)
          .filter((p) => typeof p === "string" && p.length > 0),
      ),
    );

    const nameMap: Record<string, { customer_name: string | null }> = {};

    if (productIds.length > 0) {
      const { data: views } = await supabase
        .from("price_drop_product_views")
        .select("product_id, salla_customer_id, customer_name, viewed_at")
        .eq("store_id", storeId)
        .in("product_id", productIds)
        .order("viewed_at", { ascending: false });

      if (views && views.length) {
        for (const v of views as any[]) {
          const key =
            String(v.product_id) + "|" + (v.salla_customer_id || "");
          if (!nameMap[key]) {
            nameMap[key] = { customer_name: v.customer_name || null };
          }
        }
      }
    }

    const { data: funnelEvents, error: funnelError } = await supabase
      .from("price_drop_funnel_events")
      .select("event_type, occurred_at, product_id, salla_customer_id")
      .eq("store_id", storeId)
      .eq("campaign_id", campaignId)
      .order("occurred_at", { ascending: true });

    if (funnelError) {
      console.error("funnelError", funnelError);
    }

    let impressions = 0;
    let clicks = 0;
    let closes = 0;
    let orders = 0;

    const events = (funnelEvents || []) as {
      event_type: "impression" | "click" | "close" | "add_to_cart" | "order";
      occurred_at: string;
      product_id: string;
      salla_customer_id: string | null;
    }[];

    if (events.length) {
      for (const ev of events) {
        if (!isWithinRange(ev.occurred_at, from, to)) continue;
        switch (ev.event_type) {
          case "impression":
            impressions += 1;
            break;
          case "click":
            clicks += 1;
            break;
          case "close":
            closes += 1;
            break;
          case "order":
            orders += 1;
            break;
        }
      }
    }

    // 👇 Email funnel من price_drop_messages
    const { data: emailMessages, error: emailError } = await supabase
      .from("price_drop_messages")
      .select("id, channel, sent_at, delivered_at, failed_at, opened_at")
      .eq("store_id", storeId)
      .eq("campaign_id", campaignId)
      .eq("channel", "email");

    if (emailError) {
      console.error("emailError", emailError);
    }

    const email_funnel: EmailFunnelStats = {
      total: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      opened: 0,
    };

    if (emailMessages && emailMessages.length) {
      email_funnel.total = emailMessages.length;
      for (const m of emailMessages as any[]) {
        if (m.sent_at) email_funnel.sent += 1;
        if (m.delivered_at) email_funnel.delivered += 1;
        if (m.failed_at) email_funnel.failed += 1;
        if (m.opened_at) email_funnel.opened += 1;
      }
    }

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

      const evForTarget = events.filter(
        (ev) =>
          ev.product_id === t.product_id &&
          ev.salla_customer_id === t.salla_customer_id,
      );

      let first_impression_at: string | null = null;
      let first_click_at: string | null = null;
      let first_close_at: string | null = null;
      let first_order_at: string | null = null;

      for (const ev of evForTarget) {
        if (ev.event_type === "impression" && !first_impression_at) {
          first_impression_at = ev.occurred_at;
        }
        if (ev.event_type === "click" && !first_click_at) {
          first_click_at = ev.occurred_at;
        }
        if (ev.event_type === "close" && !first_close_at) {
          first_close_at = ev.occurred_at;
        }
        if (ev.event_type === "order" && !first_order_at) {
          first_order_at = ev.occurred_at;
        }
      }

      const nameKey =
        String(t.product_id) + "|" + (t.salla_customer_id || "");
      const viewInfo = nameMap[nameKey];

      return {
        id: t.id,
        salla_customer_id: t.salla_customer_id,
        customer_name: viewInfo?.customer_name ?? null,
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
        first_impression_at,
        first_click_at,
        first_close_at,
        first_order_at,
      };
    });

    const stats: CampaignReportStats = {
      total_targets,
      old_targets,
      new_targets,
      onsite_seen_count,
      converted_count,
    };

    const onsite_funnel: OnsiteFunnelStats = {
      impressions,
      clicks,
      closes,
      orders,
    };

    const payload: CampaignReportResponse = {
      campaign,
      stats,
      customers,
      onsite_funnel,
      email_funnel,
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
