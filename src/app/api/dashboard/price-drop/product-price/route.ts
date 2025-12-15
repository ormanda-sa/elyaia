// FILE: src/app/api/dashboard/price-drop/product-price/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

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

export async function GET(req: NextRequest) {
  try {
    const storeId = await getCurrentStoreId();
    if (!storeId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("product_id");

    if (!productId) {
      return NextResponse.json(
        { error: "PRODUCT_ID_REQUIRED" },
        { status: 400 },
      );
    }

    const store = await getStoreWithToken(storeId);
    if (!store.access_token) {
      return NextResponse.json(
        { error: "SALLA_NOT_CONNECTED" },
        { status: 400 },
      );
    }

    const url = `https://api.salla.dev/admin/v2/products/${encodeURIComponent(
      productId,
    )}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${store.access_token}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Salla get product failed", res.status, text);
      return NextResponse.json(
        { error: "SALLA_PRODUCT_FETCH_FAILED" },
        { status: 502 },
      );
    }

    const json = (await res.json()) as any;
    const p = json?.data;

    const price = p?.price?.amount as number | undefined;          // السعر الحالي (قد يكون مخصوم)
    const regular = p?.regular_price?.amount as number | undefined; // السعر الأساسي (لو موجود)
    const sale = p?.sale_price?.amount as number | undefined;       // سعر العرض لو سِلّة تستخدمه

    // السعر الأساسي = الأعلى بينهم (عشان حالة 30 / 25)
    const candidatesBase: number[] = [];
    if (typeof regular === "number" && regular > 0) candidatesBase.push(regular);
    if (typeof price === "number" && price > 0) candidatesBase.push(price);
    if (typeof sale === "number" && sale > 0) candidatesBase.push(sale);

    const basePrice =
      candidatesBase.length > 0 ? Math.max(...candidatesBase) : null;

    // السعر المخفض = أقل قيمة < السعر الأساسي
    let discountPrice: number | null = null;
    if (basePrice != null) {
      const possible: number[] = [];
      if (typeof price === "number" && price > 0 && price < basePrice) {
        possible.push(price);
      }
      if (typeof sale === "number" && sale > 0 && sale < basePrice) {
        possible.push(sale);
      }
      if (possible.length > 0) {
        discountPrice = Math.min(...possible);
      }
    }

    return NextResponse.json({
      product_id: p?.id ?? productId,
      name: p?.name ?? null,
      original_price: basePrice,      // 👈 السعر الأساسي من سِلّة (زي ما هو)
      discount_price: discountPrice,  // 👈 السعر بعد الخصم من سِلّة (لو فيه)
      raw: {
        price: p?.price,
        regular_price: p?.regular_price,
        sale_price: p?.sale_price,
      },
    });
  } catch (e) {
    console.error("GET /price-drop/product-price fatal", e);
    return NextResponse.json(
      { error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
