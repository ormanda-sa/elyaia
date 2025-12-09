// src/app/(admin)/api/dashboard/price-drop/customer-products/route.ts
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
  const customerId = searchParams.get("customer_id");
  const preset = searchParams.get("preset");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  if (!customerId) {
    return NextResponse.json(
      { error: "customer_id is required" },
      { status: 400 },
    );
  }

  const { from, to } = getDateRange(preset, fromParam, toParam);

  const { data, error } = await supabase
    .from("price_drop_product_views")
    .select(
      `
      product_id,
      product_title,
      product_url,
      current_price,
      viewed_at
    `,
    )
    .eq("store_id", storeId)
    .eq("salla_customer_id", customerId)
    .gte("viewed_at", from)
    .lte("viewed_at", to);

  if (error) {
    console.error("[customer_products_api]", error);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  // تجميع حسب المنتج لنفس العميل
  const map = new Map<
    string,
    {
      product_id: string;
      product_title: string | null;
      product_url: string | null;
      current_price: number | null;
      total_views: number;
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
        last_view_at: null,
      });
    }
    const entry = map.get(pid)!;
    entry.total_views += 1;

    const vTime = row.viewed_at as string;
    if (!entry.last_view_at || vTime > entry.last_view_at) {
      entry.last_view_at = vTime;
    }
  }

  let items = Array.from(map.values());

  // نرتّب المنتجات اللي زارها العميل حسب آخر زيارة
  items.sort((a, b) => (b.last_view_at || "").localeCompare(a.last_view_at || ""));

  return NextResponse.json({
    items,
    range: { from, to },
  });
}
