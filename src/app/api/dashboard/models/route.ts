// app/api/dashboard/models/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

/**
 * GET /api/dashboard/models?brand_id=...
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const { searchParams } = new URL(req.url);

  const storeId = await getCurrentStoreId();
  if (!storeId) {
    return NextResponse.json(
      { error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const brandIdParam = searchParams.get("brand_id");

  const query = supabase
    .from("filter_models")
    .select("id, name_ar, slug, salla_category_id, brand_id, sort_order")
    .eq("store_id", storeId)
    .order("brand_id", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("name_ar", { ascending: true });

  if (brandIdParam) {
    const brandId = Number(brandIdParam);
    if (!Number.isNaN(brandId)) {
      query.eq("brand_id", brandId);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("dashboard/models GET error", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 },
    );
  }

  return NextResponse.json({ models: data ?? [] });
}

/**
 * POST /api/dashboard/models
 * body: { brand_id, name_ar, slug?, salla_category_id?, sort_order? }
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
  const {
    brand_id,
    name_ar,
    slug,
    salla_category_id,
    sort_order,
  } = body || {};

  if (!brand_id || !name_ar) {
    return NextResponse.json(
      { error: "brand_id and name_ar are required" },
      { status: 400 },
    );
  }

  const insertData: Record<string, any> = {
    store_id: storeId,
    brand_id,
    name_ar,
    slug: slug || null,
    salla_category_id: salla_category_id || null,
  };

  if (sort_order !== undefined && sort_order !== null) {
    insertData.sort_order = Number(sort_order);
  }

  const { data, error } = await supabase
    .from("filter_models")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("dashboard/models POST error", error);
    return NextResponse.json(
      { error: "Failed to create model" },
      { status: 500 },
    );
  }

  return NextResponse.json({ model: data }, { status: 201 });
}

/**
 * PUT /api/dashboard/models
 * body: { id, name_ar?, slug?, salla_category_id?, sort_order? }
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
  const {
    id,
    name_ar,
    slug,
    salla_category_id,
    sort_order,
  } = body || {};

  if (!id) {
    return NextResponse.json(
      { error: "id is required" },
      { status: 400 },
    );
  }

  const update: Record<string, any> = {};
  if (name_ar !== undefined) update.name_ar = name_ar;
  if (slug !== undefined) update.slug = slug;
  if (salla_category_id !== undefined)
    update.salla_category_id = salla_category_id;
  if (sort_order !== undefined && sort_order !== null)
    update.sort_order = Number(sort_order);

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("filter_models")
    .update(update)
    .eq("store_id", storeId)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("dashboard/models PUT error", error);
    return NextResponse.json(
      { error: "Failed to update model" },
      { status: 500 },
    );
  }

  return NextResponse.json({ model: data });
}

/**
 * DELETE /api/dashboard/models
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
    .from("filter_models")
    .delete()
    .eq("store_id", storeId)
    .eq("id", id);

  if (error) {
    console.error("dashboard/models DELETE error", error);
    return NextResponse.json(
      { error: "Failed to delete model" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
