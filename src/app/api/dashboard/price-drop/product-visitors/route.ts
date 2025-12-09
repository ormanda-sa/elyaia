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
  const productId = searchParams.get("product_id");
  const preset = searchParams.get("preset"); // today | last7 | last30 | thisMonth | custom
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  if (!productId) {
    return NextResponse.json(
      { error: "product_id is required" },
      { status: 400 },
    );
  }

  const { from, to } = getDateRange(preset, fromParam, toParam);

  // نسحب البيانات الخام بدون group
  const { data, error } = await supabase
    .from("price_drop_product_views")
    .select(
      `
      salla_customer_id,
      customer_name,
      customer_phone,
      customer_email,
      viewed_at
    `,
    )
    .eq("store_id", storeId)
    .eq("product_id", productId)
    .gte("viewed_at", from)
    .lte("viewed_at", to);

  if (error) {
    console.error("[price_drop_product_visitors]", error);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  // نجمع في الذاكرة: لكل عميل -> أول زيارة, آخر زيارة, عدد الزيارات
  type Agg = {
    salla_customer_id: string | null;
    customer_name: string | null;
    customer_phone: string | null;
    customer_email: string | null;
    first_view_at: string;
    last_view_at: string;
    views_count: number;
  };

  const map = new Map<string, Agg>();

  for (const row of data || []) {
    const key =
      (row.salla_customer_id as string | null) ||
      (row.customer_email as string | null) ||
      "anonymous";

    const viewTime = row.viewed_at as string;

    if (!map.has(key)) {
      map.set(key, {
        salla_customer_id: row.salla_customer_id ?? null,
        customer_name: row.customer_name ?? null,
        customer_phone: row.customer_phone ?? null,
        customer_email: row.customer_email ?? null,
        first_view_at: viewTime,
        last_view_at: viewTime,
        views_count: 1,
      });
    } else {
      const agg = map.get(key)!;
      agg.views_count += 1;

      if (viewTime < agg.first_view_at) {
        agg.first_view_at = viewTime;
      }
      if (viewTime > agg.last_view_at) {
        agg.last_view_at = viewTime;
      }
    }
  }

  let visitors = Array.from(map.values());

  // نرتب: أكثر مشاهدات ثم أحدث زيارة
  visitors.sort((a, b) => {
    if (b.views_count !== a.views_count) {
      return b.views_count - a.views_count;
    }
    return b.last_view_at.localeCompare(a.last_view_at);
  });

  return NextResponse.json({
    visitors,
    range: { from, to },
  });
}
