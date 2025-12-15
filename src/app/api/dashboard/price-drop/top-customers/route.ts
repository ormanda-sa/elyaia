// src/app/(admin)/api/dashboard/price-drop/top-customers/route.ts
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

  const minViews = Number(searchParams.get("min_views") ?? "1");
  // min_viewers هنا ما له معنى قوي للعملاء، بس ناخذه عشان "نفس الشروط" لو احتجته مستقبلاً
  const _minViewers = Number(searchParams.get("min_viewers") ?? "1");

  const { from, to } = getDateRange(preset, fromParam, toParam);

  const { data, error } = await supabase
    .from("price_drop_product_views")
    .select(
      `
      product_id,
      product_title,
      viewed_at,
      salla_customer_id,
      customer_name,
      customer_email,
      customer_phone
    `,
    )
    .eq("store_id", storeId)
    .gte("viewed_at", from)
    .lte("viewed_at", to);

  if (error) {
    console.error("[price_drop_top_customers_api]", error);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  // تجميع حسب العميل
  const map = new Map<
    string,
    {
      customer_id: string;
      customer_name: string | null;
      customer_email: string | null;
      customer_phone: string | null;
      total_views: number;
      products_set: Set<string>;
      last_view_at: string | null;
    }
  >();

  for (const row of data || []) {
    const cid = row.salla_customer_id as string | null;

    // نهتم فقط بعملاء سلة المعرّفين
    if (!cid) continue;

    if (!map.has(cid)) {
      map.set(cid, {
        customer_id: cid,
        customer_name: row.customer_name ?? null,
        customer_email: row.customer_email ?? null,
        customer_phone: row.customer_phone ?? null,
        total_views: 0,
        products_set: new Set<string>(),
        last_view_at: null,
      });
    }

    const entry = map.get(cid)!;
    entry.total_views += 1;

    if (row.product_id != null) {
      entry.products_set.add(String(row.product_id));
    }

    const vTime = row.viewed_at as string;
    if (!entry.last_view_at || vTime > entry.last_view_at) {
      entry.last_view_at = vTime;
    }
  }

  let items = Array.from(map.values()).map((v) => ({
    customer_id: v.customer_id,
    customer_name: v.customer_name,
    customer_email: v.customer_email,
    customer_phone: v.customer_phone,
    total_views: v.total_views,
    products_count: v.products_set.size,
    last_view_at: v.last_view_at,
  }));

  // فلترة حسب الحد الأدنى للمشاهدات
  const mv = !isNaN(minViews) && minViews > 0 ? minViews : 1;
  items = items.filter((i) => i.total_views >= mv);

  // الافتراضي: أكثر العملاء مشاهدة
  items.sort((a, b) => b.total_views - a.total_views);

  // نقيدها لـ 100 عميل عشان الأداء
  items = items.slice(0, 100);

  return NextResponse.json({
    items,
    range: { from, to },
  });
}
