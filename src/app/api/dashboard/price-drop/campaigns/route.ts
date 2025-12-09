// FILE: src/app/(admin)/api/dashboard/price-drop/campaigns/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

type DiscountType = "price" | "coupon";

type CampaignStatus =
  | "draft"
  | "active"
  | "paused"
  | "finished"
  | "cancelled";

type CreateBody = {
  product_id: string;
  product_title?: string | null;
  product_url?: string | null;
  original_price: number;
  new_price: number;
  discount_type: DiscountType;
  coupon_code?: string;
  discount_percent?: number;
  coupon_free_shipping?: boolean;
  duration_hours?: number;
  send_onsite?: boolean;
  send_email?: boolean;
  send_whatsapp?: boolean;
};

// ========= Helpers ========= //

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

// نجيب سعر المنتج الحالي من سِلّة عشان ما نخربه
async function fetchCurrentPriceFromSalla(opts: {
  accessToken: string;
  productId: string;
}): Promise<number | null> {
  const { accessToken, productId } = opts;

  const url = `https://api.salla.dev/admin/v2/products/${encodeURIComponent(
    productId,
  )}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Salla GET product failed", res.status, text);
    return null;
  }

  const json = (await res.json().catch(() => null)) as any;
  const amount = json?.data?.price?.amount;

  if (typeof amount === "number") {
    return amount;
  }

  return null;
}

// 👇 نعدّل فقط الخصم: نرسل price من سِلّة كما هو، ونغير sale_price + sale_end
async function syncProductPriceToSalla(opts: {
  accessToken: string;
  productId: string;
  basePrice: number;    // السعر الأساسي من سِلّة
  salePrice: number;    // سعر الخصم
  saleEndIso: string | null;
}) {
  const { accessToken, productId, basePrice, salePrice, saleEndIso } = opts;

  const url =
    "https://api.salla.dev/admin/v2/products/prices/bulkPrice";

  const body = {
    products: [
      {
        id: Number(productId),
        price: basePrice,
        sale_price: salePrice,
        sale_end: saleEndIso ? saleEndIso.slice(0, 10) : null, // YYYY-MM-DD
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
    console.error("Salla bulkPrice failed", res.status, text);
    throw new Error("SALLA_PRICE_UPDATE_FAILED");
  }
}

function formatDate(dateIso: string | null): string | null {
  if (!dateIso) return null;
  return dateIso.slice(0, 10);
}

function generateCouponCode(baseCode: string | undefined, percent: number) {
  if (baseCode && baseCode.trim().length > 0) return baseCode.trim();
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `PD${percent}-${rand}`;
}

// Error خاص للكوبون المكرر
class CouponCodeExistsError extends Error {
  public coupon: string;
  constructor(coupon: string) {
    super("Coupon code already exists");
    this.name = "CouponCodeExistsError";
    this.coupon = coupon;
  }
}

// إنشاء كوبون في سِلّة
async function createCouponInSalla(opts: {
  accessToken: string;
  codeFromUser?: string;
  amountPercent: number;
  endsAt: string | null;
  freeShipping: boolean;
}) {
  const { accessToken, codeFromUser, amountPercent, endsAt, freeShipping } =
    opts;

  const url = "https://api.salla.dev/admin/v2/coupons";

  const today = new Date();
  const startDate = formatDate(today.toISOString());
  const expiryDate = formatDate(endsAt);

  const finalCode = generateCouponCode(codeFromUser, amountPercent);

  const body = {
    code: finalCode,
    type: "percentage",
    amount: amountPercent,
    free_shipping: freeShipping,
    start_date: startDate,
    expiry_date: expiryDate,
    exclude_sale_products: false,
    is_apply_with_offer: true,
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
    if (res.status === 422) {
      console.warn("Salla returned 422 for coupon", finalCode, text);
      throw new CouponCodeExistsError(finalCode);
    }

    console.error("Salla create coupon failed", res.status, text);
    throw new Error("SALLA_COUPON_CREATE_FAILED");
  }

  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  const couponId: string | null =
    data?.data?.id?.toString?.() ?? data?.id?.toString?.() ?? null;

  return { data, finalCode, couponId };
}

// ========= GET: قائمة الحملات ========= //

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const storeId = await getCurrentStoreId();

    if (!storeId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("price_drop_campaigns")
      .select(
        `
    id,
    store_id,
    product_id,
    product_title,
    product_image_url,
    product_url,
    original_price,
    new_price,
    discount_percent,
    discount_type,
    coupon_code,
    coupon_expires_at,
    coupon_external_id,
    coupon_free_shipping,
    send_onsite,
    send_email,
    send_whatsapp,
    duration_hours,
    starts_at,
    ends_at,
    status,
    created_at
  `,
      )
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("GET /price-drop/campaigns error", error);
      return NextResponse.json(
        { error: "DB_ERROR", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (e) {
    console.error("GET /price-drop/campaigns fatal", e);
    return NextResponse.json(
      { error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

// ========= POST: إنشاء حملة ========= //

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const storeId = await getCurrentStoreId();

    if (!storeId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const raw = (await req.json().catch(() => null)) as CreateBody | null;

    if (!raw) {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }

    const {
      product_id,
      product_title,
      product_url,
      original_price,
      new_price,
      discount_type,
      coupon_code,
      discount_percent: discountPercentFromBody,
      coupon_free_shipping,
      duration_hours,
      send_onsite,
      send_email,
      send_whatsapp,
    } = raw;

    if (!product_id || typeof product_id !== "string") {
      return NextResponse.json(
        { error: "PRODUCT_ID_REQUIRED" },
        { status: 400 },
      );
    }

    if (
      typeof original_price !== "number" ||
      Number.isNaN(original_price) ||
      original_price <= 0
    ) {
      return NextResponse.json(
        { error: "ORIGINAL_PRICE_INVALID" },
        { status: 400 },
      );
    }

    if (discount_type === "price") {
      if (
        typeof new_price !== "number" ||
        Number.isNaN(new_price) ||
        new_price <= 0
      ) {
        return NextResponse.json(
          { error: "NEW_PRICE_INVALID" },
          { status: 400 },
        );
      }
    }

    const now = new Date();
    const duration =
      typeof duration_hours === "number" && duration_hours > 0
        ? duration_hours
        : 48;

    const startsAt = now.toISOString();
    const endsAt = new Date(
      now.getTime() + duration * 60 * 60 * 1000,
    ).toISOString();

    const discountPercentPrice =
      discount_type === "price"
        ? Math.round(
            ((original_price - new_price) / original_price) * 100,
          )
        : 0;

    const discountPercentCoupon =
      discount_type === "coupon" && typeof discountPercentFromBody === "number"
        ? Math.round(discountPercentFromBody)
        : 10;

    const finalDiscountPercent =
      discount_type === "price"
        ? discountPercentPrice
        : discountPercentCoupon;

    const store = await getStoreWithToken(storeId);

    if (!store.access_token) {
      return NextResponse.json(
        { error: "SALLA_NOT_CONNECTED" },
        { status: 400 },
      );
    }

    const accessToken = store.access_token;

    let effectiveCouponCode: string | null = coupon_code ?? null;
    let couponExternalId: string | null = null;

    // ========= مزامنة مع سِلّة ========= //
    try {
      if (discount_type === "price") {
        // نجيب السعر الحالي من سِلّة عشان ما نخربه
        const currentPrice =
          (await fetchCurrentPriceFromSalla({
            accessToken,
            productId: product_id,
          })) ?? original_price;

        // نرسل currentPrice كسعر أساسي، و new_price كقيمة خصم (sale_price)
        await syncProductPriceToSalla({
          accessToken,
          productId: product_id,
          basePrice: currentPrice,
          salePrice: new_price,
          saleEndIso: endsAt,
        });
      } else if (discount_type === "coupon") {
        const { finalCode, couponId } = await createCouponInSalla({
          accessToken,
          codeFromUser: coupon_code,
          amountPercent: discountPercentCoupon,
          endsAt,
          freeShipping: coupon_free_shipping === true,
        });
        effectiveCouponCode = finalCode;
        couponExternalId = couponId ?? null;
      }
    } catch (e: any) {
      if (e instanceof CouponCodeExistsError) {
        return NextResponse.json(
          {
            error: "COUPON_CODE_EXISTS",
            message: "الكوبون بهذا الاسم موجود مسبقاً في سِلّة",
            code: e.coupon,
          },
          { status: 400 },
        );
      }

      console.error("Salla sync error while creating campaign", e);
      return NextResponse.json(
        {
          error: "SALLA_SYNC_FAILED",
          message: "تعذر المزامنة مع سِلّة. تأكد من صلاحيات التوكن.",
        },
        { status: 502 },
      );
    }

    // ========= تخزين الحملة ========= //

    const { data, error } = await supabase
      .from("price_drop_campaigns")
      .insert({
        store_id: storeId,
        product_id,
        product_title: product_title ?? null,
        product_url: product_url ?? null,
        original_price,
        new_price,
        discount_percent: finalDiscountPercent,
        discount_type,
        coupon_code: discount_type === "coupon" ? effectiveCouponCode : null,
        coupon_expires_at: discount_type === "coupon" ? endsAt : null,
        coupon_external_id: discount_type === "coupon" ? couponExternalId : null,
        coupon_free_shipping:
          discount_type === "coupon" ? (coupon_free_shipping ?? false) : null,
        send_onsite: send_onsite ?? true,
        send_email: send_email ?? false,
        send_whatsapp: send_whatsapp ?? false,
        duration_hours: duration,
        starts_at: startsAt,
        ends_at: endsAt,
        status: "active" as CampaignStatus,
      })
      .select("*")
      .single();

    if (error || !data) {
      console.error("DB insert price_drop_campaigns error", error);
      return NextResponse.json(
        { error: "DB_INSERT_FAILED", details: error?.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ item: data });
  } catch (e) {
    console.error("POST /price-drop/campaigns fatal", e);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", details: String(e) },
      { status: 500 },
    );
  }
}
