// FILE: src/app/(admin)/api/dashboard/price-drop/campaigns/[id]/build-targets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();
  const { id } = await context.params;

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

  // 1) نجيب بيانات الحملة (نحتاج product_id + store_id)
  const { data: campaign, error: campaignError } = await supabase
    .from("price_drop_campaigns")
    .select("id, store_id, product_id")
    .eq("store_id", storeId)
    .eq("id", campaignId)
    .maybeSingle<{ id: number; store_id: string; product_id: string }>();

  if (campaignError) {
    console.error("[build-targets] campaignError", campaignError);
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

  // 2) نجيب المشاهدات لهذا المنتج، فيها ايميل/واتساب
  const { data: views, error: viewsError } = await supabase
    .from("price_drop_product_views")
    .select(
      "product_id, salla_customer_id, customer_email, customer_phone, viewed_at",
    )
    .eq("store_id", storeId)
    .eq("product_id", campaign.product_id)
    .not("salla_customer_id", "is", null)
    .order("viewed_at", { ascending: false });

  if (viewsError) {
    console.error("[build-targets] viewsError", viewsError);
    return NextResponse.json(
      { error: "VIEWS_FETCH_ERROR" },
      { status: 500 },
    );
  }

  if (!views || !views.length) {
    return NextResponse.json(
      { created: 0 },
      { status: 200 },
    );
  }

  // 3) نبني آخر مشاهدة لكل عميل على هذا المنتج
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  const latestByCustomer = new Map<
    string,
    {
      salla_customer_id: string;
      customer_email: string | null;
      whatsapp_number: string | null;
      last_view_at: string;
      views_last_7d: number;
    }
  >();

  for (const v of views as any[]) {
    const key = String(v.salla_customer_id);
    const viewTime = new Date(v.viewed_at).getTime();
    const within7d = now - viewTime <= sevenDaysMs;

    if (!latestByCustomer.has(key)) {
      latestByCustomer.set(key, {
        salla_customer_id: v.salla_customer_id,
        customer_email: v.customer_email || null,
        whatsapp_number: v.customer_phone || null,
        last_view_at: v.viewed_at,
        views_last_7d: within7d ? 1 : 0,
      });
    } else {
      const cur = latestByCustomer.get(key)!;
      if (viewTime > new Date(cur.last_view_at).getTime()) {
        cur.last_view_at = v.viewed_at;
      }
      if (within7d) {
        cur.views_last_7d += 1;
      }
    }
  }

  // 4) نجيب التارجتس الموجودة عشان ما نكرر
  const { data: existingTargets, error: existingError } = await supabase
    .from("price_drop_targets")
    .select("id, salla_customer_id")
    .eq("store_id", storeId)
    .eq("campaign_id", campaign.id);

  if (existingError) {
    console.error("[build-targets] existingError", existingError);
    return NextResponse.json(
      { error: "TARGETS_FETCH_ERROR" },
      { status: 500 },
    );
  }

  const existingSet = new Set<string>();
  for (const t of existingTargets ?? []) {
    existingSet.add(String((t as any).salla_customer_id));
  }

  const inserts: any[] = [];

  for (const entry of latestByCustomer.values()) {
    // لازم يكون له ايميل أو رقم واتساب
    if (!entry.customer_email && !entry.whatsapp_number) continue;

    // لو موجود من قبل له نفس العميل في هذه الحملة، لا نعيده
    if (existingSet.has(entry.salla_customer_id)) continue;

    inserts.push({
      campaign_id: campaign.id,
      store_id: campaign.store_id,
      product_id: campaign.product_id,
      salla_customer_id: entry.salla_customer_id,
      customer_email: entry.customer_email,
      whatsapp_number: entry.whatsapp_number,
      last_view_at: entry.last_view_at,
      views_last_7d: entry.views_last_7d,
      status: "pending",
      created_at: new Date().toISOString(),
    });
  }

  if (!inserts.length) {
    return NextResponse.json(
      { created: 0 },
      { status: 200 },
    );
  }

  const { error: insertError } = await supabase
    .from("price_drop_targets")
    .insert(inserts);

  if (insertError) {
    console.error("[build-targets] insertError", insertError);
    return NextResponse.json(
      { error: "TARGETS_INSERT_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { created: inserts.length },
    { status: 200 },
  );
}
