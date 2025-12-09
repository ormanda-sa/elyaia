// src/app/(admin)/api/dashboard/price-drop/top-products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

function getDateRange(
  preset: string | null,
  from?: string | null,
  to?: string | null,
) {
  const now = new Date();
  let start: Date;
  let end: Date;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // تاريخ مخصص
  if (from && to) {
    start = new Date(from);
    end = new Date(to);
    end.setHours(23, 59, 59, 999);
    return { from: start.toISOString(), to: end.toISOString() };
  }

  switch (preset) {
    case "today":
      start = new Date(today);
      end = new Date(today);
      break;
    case "last7":
      start = new Date(today);
      start.setDate(start.getDate() - 6);
      end = new Date(today);
      break;
    case "last30":
      start = new Date(today);
      start.setDate(start.getDate() - 29);
      end = new Date(today);
      break;
    case "thisMonth":
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
    default:
      // افتراضي: آخر 30 يوم
      start = new Date(today);
      start.setDate(start.getDate() - 29);
      end = new Date(today);
  }

  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const preset = searchParams.get("preset");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const sort = (searchParams.get("sort") || "views") as
    | "views"
    | "viewers"
    | "last"
    | "price";

  const minViews = Number(searchParams.get("min_views") ?? "1");
  const minViewers = Number(searchParams.get("min_viewers") ?? "1");

  const { from, to } = getDateRange(preset, fromParam, toParam);

  const { data, error } = await supabase
    .from("price_drop_product_views")
    .select(
      `
      product_id,
      product_title,
      product_url,
      current_price,
      viewed_at,
      salla_customer_id
    `,
    )
    .eq("store_id", storeId)
    .gte("viewed_at", from)
    .lte("viewed_at", to);

  if (error) {
    console.error("[price_drop_top_products_api]", error);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  // 👇 جلب الحملات النشطة على مستوى المنتج
  const { data: activeCampaigns, error: campaignsError } = await supabase
    .from("price_drop_campaigns")
    .select("id, product_id")
    .eq("store_id", storeId)
    .eq("status", "active");

  if (campaignsError) {
    console.error(
      "[price_drop_top_products_api:campaigns]",
      campaignsError,
    );
  }

  // نفترض حملة واحدة نشطة لكل منتج (لو فيه أكثر، نأخذ الأولى)
  const activeCampaignByProduct = new Map<
    string,
    { campaign_id: number; product_id: string }
  >();
  for (const c of activeCampaigns ?? []) {
    const pid = String(c.product_id);
    if (!activeCampaignByProduct.has(pid)) {
      activeCampaignByProduct.set(pid, {
        campaign_id: Number(c.id),
        product_id: pid,
      });
    }
  }

  // 👇 جلب التارجت للعملاء المغطّين في الحملات النشطة
  let targetsByProduct = new Map<string, Set<string>>();
  if (activeCampaigns && activeCampaigns.length > 0) {
    const activeCampaignIds = activeCampaigns.map((c) => c.id);

    const { data: targets, error: targetsError } = await supabase
      .from("price_drop_targets")
      .select("campaign_id, product_id, salla_customer_id")
      .eq("store_id", storeId)
      .in("campaign_id", activeCampaignIds as any);

    if (targetsError) {
      console.error(
        "[price_drop_top_products_api:targets]",
        targetsError,
      );
    } else {
      targetsByProduct = new Map<string, Set<string>>();
      for (const t of targets ?? []) {
        const pid = String(t.product_id);
        const cid = t.salla_customer_id
          ? String(t.salla_customer_id)
          : null;

        if (!cid) continue; // ما يهمنا العملاء بدون معرف

        if (!targetsByProduct.has(pid)) {
          targetsByProduct.set(pid, new Set<string>());
        }
        targetsByProduct.get(pid)!.add(cid);
      }
    }
  }

  // تجميع في الذاكرة
  const map = new Map<
    string,
    {
      product_id: string;
      product_title: string | null;
      product_url: string | null;
      current_price: number | null;
      total_views: number;
      viewers_set: Set<string>; // نخزّن فقط IDs حقيقية
      last_view_at: string | null;
    }
  >();

  for (const row of data || []) {
    const pid = String(row.product_id);

    if (!map.has(pid)) {
      map.set(pid, {
        product_id: pid,
        product_title: row.product_title ?? null,
        product_url: row.product_url ?? null,
        current_price:
          row.current_price != null ? Number(row.current_price) : null,
        total_views: 0,
        viewers_set: new Set<string>(),
        last_view_at: null,
      });
    }
    const entry = map.get(pid)!;
    entry.total_views += 1;

    if (row.salla_customer_id) {
      entry.viewers_set.add(String(row.salla_customer_id));
    }

    const vTime = row.viewed_at as string;
    if (!entry.last_view_at || vTime > entry.last_view_at) {
      entry.last_view_at = vTime;
    }
  }

  // تحويل إلى مصفوفة + حساب العملاء الجدد لكل منتج
  let items = Array.from(map.values()).map((v) => {
    const pid = v.product_id;
    const activeCampaign = activeCampaignByProduct.get(pid);
    const hasActiveCampaign = !!activeCampaign;
    const activeCampaignId = activeCampaign?.campaign_id ?? null;

    const coveredSet = targetsByProduct.get(pid) ?? new Set<string>();
    let coveredCount = 0;
    for (const cid of v.viewers_set) {
      if (coveredSet.has(cid)) {
        coveredCount += 1;
      }
    }

    const totalViewers = v.viewers_set.size;
    const newViewersCount = Math.max(totalViewers - coveredCount, 0);

    return {
      product_id: v.product_id,
      product_title: v.product_title,
      product_url: v.product_url,
      current_price: v.current_price,
      total_views: v.total_views,
      unique_viewers: totalViewers,
      last_view_at: v.last_view_at,
      has_active_campaign: hasActiveCampaign,
      new_viewers_count: newViewersCount,
      active_campaign_id: activeCampaignId, // 👈 الإضافة الوحيدة المهمة
    };
  });

  // فلترة حسب الحد الأدنى
  const mv = !isNaN(minViews) && minViews > 0 ? minViews : 1;
  const mvu = !isNaN(minViewers) && minViewers > 0 ? minViewers : 1;

  items = items.filter(
    (i) => i.total_views >= mv && i.unique_viewers >= mvu,
  );

  // الفرز
  items.sort((a, b) => {
    if (sort === "viewers") {
      return b.unique_viewers - a.unique_viewers;
    }
    if (sort === "last") {
      return (b.last_view_at || "").localeCompare(a.last_view_at || "");
    }
    if (sort === "price") {
      return (b.current_price || 0) - (a.current_price || 0);
    }
    // الافتراضي: عدد المشاهدات
    return b.total_views - a.total_views;
  });

  items = items.slice(0, 100);

  return NextResponse.json({
    items,
    range: { from, to },
  });
}
