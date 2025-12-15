// app/api/dashboard/brands/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

/**
 * GET /api/dashboard/brands
 * يرجع قائمة البراندات لمتجر المستخدم الحالي
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabaseServerClient();

  const storeId = await getCurrentStoreId();
  if (!storeId) {
    return NextResponse.json(
      { error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("filter_brands")
    .select("id, name_ar, slug, salla_company_id, sort_order")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true })
    .order("name_ar", { ascending: true });

  if (error) {
    console.error("dashboard/brands GET error", error);
    return NextResponse.json(
      { error: "Failed to fetch brands" },
      { status: 500 },
    );
  }

  return NextResponse.json({ brands: data ?? [] });
}

/**
 * POST /api/dashboard/brands
 * body: { name_ar, slug?, salla_company_id? }
 */
export async function POST(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json(
      { error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const body = await req.json();
  const { name_ar, slug, salla_company_id } = body || {};

  if (!name_ar) {
    return NextResponse.json(
      { error: "name_ar is required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("filter_brands")
    .insert({
      store_id: storeId,
      name_ar,
      slug: slug || null,
      salla_company_id: salla_company_id || null,
    })
    .select()
    .single();

  if (error) {
    console.error("dashboard/brands POST error", error);
    return NextResponse.json(
      { error: "Failed to create brand" },
      { status: 500 },
    );
  }

  return NextResponse.json({ brand: data }, { status: 201 });
}

/**
 * PUT /api/dashboard/brands
 * body: { id, name_ar?, slug?, salla_company_id? }
 */
export async function PUT(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json(
      { error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const body = await req.json();
  const { id, name_ar, slug, salla_company_id } = body || {};

  if (!id) {
    return NextResponse.json(
      { error: "id is required" },
      { status: 400 },
    );
  }

  const update: Record<string, any> = {};
  if (name_ar !== undefined) update.name_ar = name_ar;
  if (slug !== undefined) update.slug = slug;
  if (salla_company_id !== undefined)
    update.salla_company_id = salla_company_id;

  const { data, error } = await supabase
    .from("filter_brands")
    .update(update)
    .eq("store_id", storeId)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("dashboard/brands PUT error", error);
    return NextResponse.json(
      { error: "Failed to update brand" },
      { status: 500 },
    );
  }

  return NextResponse.json({ brand: data });
}

/**
 * DELETE /api/dashboard/brands
 * body: { id }
 */
export async function DELETE(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json(
      { error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const body = await req.json();
  const { id } = body || {};

  if (!id) {
    return NextResponse.json(
      { error: "id is required" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("filter_brands")
    .delete()
    .eq("store_id", storeId)
    .eq("id", id);

  if (error) {
    console.error("dashboard/brands DELETE error", error);
    return NextResponse.json(
      { error: "Failed to delete brand" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
