// FILE: src/app/(admin)/api/dashboard/price-drop/campaigns/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

type DiscountType = "price" | "coupon";
type CampaignStatus = "draft" | "active" | "paused" | "finished" | "cancelled";

type PatchBody = {
  new_price?: number;
  discount_percent?: number;
  send_onsite?: boolean;
  send_email?: boolean;
  send_whatsapp?: boolean;
  duration_hours?: number;
  coupon_free_shipping?: boolean;
  coupon_code?: string;
  status?: CampaignStatus;
};

type PostBody = {
  action?: "attach_new_viewers";
};

// ========== Helpers ========== //

async function getStoreWithToken(storeId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("stores")
    .select("id, salla_store_id, access_token")
    .eq("id", storeId)
    .single();

  if (error || !data) {
    throw new Error("STORE_NOT_FOUND");
  }

  return data as {
    id: string;
    salla_store_id: string | null;
    access_token: string | null;
  };
}

// نستخدم السعر الأساسي المخزون عندك (original_price) كقيمة price في سلة
async function syncProductPriceToSalla(opts: {
  accessToken: string;
  productId: string;
  basePrice: number;
  salePrice: number;
  saleEndIso: string | null;
}) {
  const { accessToken, productId, basePrice, salePrice, saleEndIso } = opts;

  const url =
    "https://api.salla.dev/admin/v2/products/prices/bulkPrice";

  const body = {
    products: [
      {
        id: Number(productId),
        price: basePrice, // 👈 السعر الأساسي من original_price
        cost_price: undefined,
        sale_price: salePrice, // 👈 سعر التخفيض الجديد
        sale_end: saleEndIso ? saleEndIso.slice(0, 10) : null,
      },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    console.error("Salla bulkPrice (PATCH) failed", res.status, text);
    throw new Error("SALLA_PRICE_UPDATE_FAILED");
  }
}

function formatDate(dateIso: string | null): string | null {
  if (!dateIso) return null;
  return dateIso.slice(0, 10);
}

async function syncCouponInSalla(opts: {
  accessToken: string;
  couponId: string;
  code: string;
  amountPercent: number;
  freeShipping: boolean;
  expiryIso: string | null;
}) {
  const { accessToken, couponId, code, amountPercent, freeShipping, expiryIso } =
    opts;

  const url = `https://api.salla.dev/admin/v2/coupons/${encodeURIComponent(
    couponId,
  )}`;

  const body: any = {
    code,
    type: "percentage",
    amount: amountPercent,
    status: "active",
    is_apply_with_offer: true,
    applied_in: "all",
    free_shipping: freeShipping,
  };

  const expiryDate = formatDate(expiryIso);
  if (expiryDate) {
    body.expiry_date = expiryDate;
  }

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    console.error("Salla update coupon failed", res.status, text);
    throw new Error("SALLA_COUPON_UPDATE_FAILED");
  }
}

// ========== PATCH: تعديل الحملة + سِلّة ========== //

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = getSupabaseServerClient();
    const storeId = await getCurrentStoreId();

    if (!storeId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id: idParam } = await context.params;
    const id = Number(idParam);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as PatchBody | null;
    if (!body) {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }

    const { data: existing, error: fetchErr } = await supabase
      .from("price_drop_campaigns")
      .select(
        `
        id,
        store_id,
        product_id,
        original_price,
        new_price,
        discount_type,
        discount_percent,
        coupon_code,
        coupon_external_id,
        coupon_expires_at,
        ends_at,
        send_onsite,
        send_email,
        send_whatsapp,
        duration_hours,
        coupon_free_shipping,
        status
      `,
      )
      .eq("id", id)
      .eq("store_id", storeId)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json(
        { error: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const discountType = existing.discount_type as DiscountType;
    const updates: any = {};

    // ===== 1) تحديث DB =====

    if (typeof body.new_price === "number") {
      updates.new_price = body.new_price;

      if (discountType === "price") {
        const original = existing.original_price as number;
        if (original > 0) {
          updates.discount_percent = Math.round(
            ((original - body.new_price) / original) * 100,
          );
        }
      }
    }

    if (typeof body.discount_percent === "number") {
      updates.discount_percent = body.discount_percent;
    }

    if (typeof body.send_onsite === "boolean") {
      updates.send_onsite = body.send_onsite;
    }
    if (typeof body.send_email === "boolean") {
      updates.send_email = body.send_email;
    }
    if (typeof body.send_whatsapp === "boolean") {
      updates.send_whatsapp = body.send_whatsapp;
    }

    if (typeof body.coupon_free_shipping === "boolean") {
      updates.coupon_free_shipping = body.coupon_free_shipping;
    }

    if (typeof body.duration_hours === "number" && body.duration_hours > 0) {
      const now = new Date();
      const endsAt = new Date(
        now.getTime() + body.duration_hours * 60 * 60 * 1000,
      ).toISOString();
      updates.duration_hours = body.duration_hours;
      updates.ends_at = endsAt;
    }

    if (typeof body.coupon_code === "string") {
      updates.coupon_code = body.coupon_code.trim() || null;
    }

    // تشغيل / إيقاف / تغيير حالة الحملة
    if (body.status) {
      const allowed: CampaignStatus[] = [
        "draft",
        "active",
        "paused",
        "finished",
        "cancelled",
      ];
      if (allowed.includes(body.status)) {
        updates.status = body.status;
      }
    }

    // ===== 2) مزامنة مع سِلّة =====

    try {
      const store = await getStoreWithToken(storeId);
      const accessToken = store.access_token;
      if (accessToken) {
        // نوع السعر: نغيّر فقط sale_price و sale_end, price = original_price المخزّن
        if (discountType === "price" && typeof updates.new_price === "number") {
          const salePrice = updates.new_price as number;
          const saleEndIso: string | null =
            (updates.ends_at as string | null) ??
            (existing.ends_at as string | null);

          const basePrice = existing.original_price as number; // 👈 نفس اللي في خانة "السعر الأساسي من سِلة"

          await syncProductPriceToSalla({
            accessToken,
            productId: existing.product_id,
            basePrice,
            salePrice,
            saleEndIso,
          });
        }

        // كوبون
        if (
          discountType === "coupon" &&
          existing.coupon_external_id
        ) {
          const couponId = existing.coupon_external_id as string;

          const code =
            body.coupon_code?.trim() ||
            existing.coupon_code ||
            "";

          if (code) {
            const amountPercent =
              typeof updates.discount_percent === "number"
                ? updates.discount_percent
                : existing.discount_percent;

            const freeShipping =
              typeof body.coupon_free_shipping === "boolean"
                ? body.coupon_free_shipping
                : !!existing.coupon_free_shipping;

            const expiryIso: string | null =
              (updates.ends_at as string | null) ??
              (existing.coupon_expires_at as string | null) ??
              (existing.ends_at as string | null);

            if (typeof amountPercent === "number") {
              await syncCouponInSalla({
                accessToken,
                couponId,
                code,
                amountPercent,
                freeShipping,
                expiryIso,
              });

              updates.coupon_code = code;
              updates.coupon_expires_at = expiryIso;
            }
          }
        }
      }
    } catch (e) {
      console.error("Salla sync error in PATCH", e);
    }

    // ===== 3) تحديث DB =====

    const { data: updated, error: updateErr } = await supabase
      .from("price_drop_campaigns")
      .update(updates)
      .eq("id", id)
      .eq("store_id", storeId)
      .select("*")
      .single();

    if (updateErr || !updated) {
      console.error("PATCH update campaign error", updateErr);
      return NextResponse.json(
        { error: "DB_UPDATE_FAILED", details: updateErr?.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ item: updated });
  } catch (e) {
    console.error("PATCH /price-drop/campaigns/[id] fatal", e);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", details: String(e) },
      { status: 500 },
    );
  }
}

// ========== DELETE: حذف الحملة + الأهداف المرتبطة ========== //

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = getSupabaseServerClient();
    const storeId = await getCurrentStoreId();

    if (!storeId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id: idParam } = await context.params;
    const campaignId = Number(idParam);
    if (Number.isNaN(campaignId)) {
      return NextResponse.json(
        { error: "INVALID_ID", message: "campaign id must be a number" },
        { status: 400 },
      );
    }

    // تأكد أن الحملة فعلاً تبع هذا المتجر
    const { data: existing, error: fetchError } = await supabase
      .from("price_drop_campaigns")
      .select("id, store_id")
      .eq("id", campaignId)
      .eq("store_id", storeId)
      .maybeSingle();

    if (fetchError) {
      console.error(fetchError);
      return NextResponse.json(
        { error: "DB_ERROR", message: "failed to load campaign" },
        { status: 500 },
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "campaign not found" },
        { status: 404 },
      );
    }

    // نحذف الأهداف المرتبطة أولاً عشان الـ FK
    const { error: targetsError } = await supabase
      .from("price_drop_targets")
      .delete()
      .eq("campaign_id", campaignId)
      .eq("store_id", storeId);

    if (targetsError) {
      console.error(targetsError);
      return NextResponse.json(
        { error: "DB_ERROR", message: "failed to delete campaign targets" },
        { status: 500 },
      );
    }

    // نحذف الحملة نفسها
    const { error: deleteError } = await supabase
      .from("price_drop_campaigns")
      .delete()
      .eq("id", campaignId)
      .eq("store_id", storeId);

    if (deleteError) {
      console.error(deleteError);
      return NextResponse.json(
        { error: "DB_ERROR", message: "failed to delete campaign" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /price-drop/campaigns/[id] fatal", err);
    return NextResponse.json(
      { error: "UNKNOWN_ERROR", message: "unexpected error" },
      { status: 500 },
    );
  }
}

// ========== POST: إضافة العملاء الجدد إلى الحملة ========== //

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = getSupabaseServerClient();
    const storeId = await getCurrentStoreId();

    if (!storeId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id: idParam } = await context.params;
    const campaignId = Number(idParam);
    if (Number.isNaN(campaignId)) {
      return NextResponse.json(
        { error: "INVALID_ID", message: "campaign id must be a number" },
        { status: 400 },
      );
    }

    const body = (await req.json().catch(() => null)) as PostBody | null;
    if (!body || body.action !== "attach_new_viewers") {
      return NextResponse.json(
        { error: "INVALID_ACTION", message: "action must be attach_new_viewers" },
        { status: 400 },
      );
    }

    // جلب الحملة
    const { data: campaign, error: campaignErr } = await supabase
      .from("price_drop_campaigns")
      .select("id, store_id, product_id, status")
      .eq("id", campaignId)
      .eq("store_id", storeId)
      .single();

    if (campaignErr || !campaign) {
      console.error("attach_new_viewers: campaign load error", campaignErr);
      return NextResponse.json(
        { error: "NOT_FOUND", message: "campaign not found" },
        { status: 404 },
      );
    }

    const productId = campaign.product_id as string | null;
    if (!productId) {
      return NextResponse.json(
        { error: "INVALID_CAMPAIGN", message: "campaign has no product_id" },
        { status: 400 },
      );
    }

    // 1) كل العملاء اللي شافوا هذا المنتج (كل الوقت)
    const { data: views, error: viewsErr } = await supabase
      .from("price_drop_product_views")
      .select("salla_customer_id")
      .eq("store_id", storeId)
      .eq("product_id", productId);

    if (viewsErr) {
      console.error("attach_new_viewers: views load error", viewsErr);
      return NextResponse.json(
        { error: "DB_ERROR", message: "failed to load product views" },
        { status: 500 },
      );
    }

    const allViewers = new Set<string>();
    for (const v of views ?? []) {
      if (v.salla_customer_id) {
        allViewers.add(String(v.salla_customer_id));
      }
    }

    if (allViewers.size === 0) {
      return NextResponse.json({ added: 0, message: "no viewers to attach" });
    }

    // 2) العملاء الموجودين مسبقاً في targets لهذه الحملة
    const { data: targets, error: targetsErr } = await supabase
      .from("price_drop_targets")
      .select("salla_customer_id")
      .eq("store_id", storeId)
      .eq("campaign_id", campaignId);

    if (targetsErr) {
      console.error("attach_new_viewers: targets load error", targetsErr);
      return NextResponse.json(
        { error: "DB_ERROR", message: "failed to load existing targets" },
        { status: 500 },
      );
    }

    const existingViewers = new Set<string>();
    for (const t of targets ?? []) {
      if (t.salla_customer_id) {
        existingViewers.add(String(t.salla_customer_id));
      }
    }

    // 3) احسب العملاء الجدد
    const newViewers: string[] = [];
    for (const cid of allViewers) {
      if (!existingViewers.has(cid)) {
        newViewers.push(cid);
      }
    }

    if (newViewers.length === 0) {
      return NextResponse.json({ added: 0, message: "no new viewers" });
    }

    // 4) إدخالهم في price_drop_targets
    const rowsToInsert = newViewers.map((cid) => ({
      campaign_id: campaignId,
      store_id: storeId,
      product_id: productId,
      salla_customer_id: cid,
      // status: default = 'pending'
      // views_last_7d: default = 0
    }));

    const { error: insertErr } = await supabase
      .from("price_drop_targets")
      .insert(rowsToInsert);

    if (insertErr) {
      console.error("attach_new_viewers: insert error", insertErr);
      return NextResponse.json(
        { error: "DB_ERROR", message: "failed to insert new targets" },
        { status: 500 },
      );
    }

    return NextResponse.json({ added: rowsToInsert.length });
  } catch (err) {
    console.error("POST /price-drop/campaigns/[id] attach_new_viewers fatal", err);
    return NextResponse.json(
      { error: "UNKNOWN_ERROR", message: "unexpected error" },
      { status: 500 },
    );
  }
}
