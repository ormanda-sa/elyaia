// app/api/dashboard/years/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

/**
 * GET /api/dashboard/years?model_id=...
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const { searchParams } = new URL(req.url);

  const storeId = await getCurrentStoreId();
  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const modelIdParam = searchParams.get("model_id");

  const query = supabase
    .from("filter_years")
    .select("id, year, slug, salla_year_id, model_id, sort_order")
    .eq("store_id", storeId)
    .order("model_id", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("year", { ascending: true });

  if (modelIdParam) {
    const modelId = Number(modelIdParam);
    if (!Number.isNaN(modelId)) {
      query.eq("model_id", modelId);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("dashboard/years GET error", error);
    return NextResponse.json(
      { error: "Failed to fetch years" },
      { status: 500 },
    );
  }

  return NextResponse.json({ years: data ?? [] });
}

/**
 * POST /api/dashboard/years
 * body: { model_id, year, slug?, salla_year_id?, sort_order? }
 */
export async function POST(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();
  const { model_id, year, slug, salla_year_id, sort_order } = body || {};

  if (!model_id || !year) {
    return NextResponse.json(
      { error: "model_id and year are required" },
      { status: 400 },
    );
  }

  const insertData: Record<string, any> = {
    store_id: storeId,
    model_id,
    year,
    slug: slug || null,
    salla_year_id: salla_year_id || null,
  };

  if (sort_order !== undefined && sort_order !== null) {
    insertData.sort_order = Number(sort_order);
  }

  const { data, error } = await supabase
    .from("filter_years")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("dashboard/years POST error", error);
    return NextResponse.json(
      { error: "Failed to create year" },
      { status: 500 },
    );
  }

  return NextResponse.json({ year: data }, { status: 201 });
}

/**
 * PUT /api/dashboard/years
 * body: { id, year?, slug?, salla_year_id?, sort_order? }
 */
export async function PUT(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();
  const { id, year, slug, salla_year_id, sort_order } = body || {};

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const update: Record<string, any> = {};
  if (year !== undefined) update.year = year;
  if (slug !== undefined) update.slug = slug;
  if (salla_year_id !== undefined) update.salla_year_id = salla_year_id;
  if (sort_order !== undefined && sort_order !== null) {
    update.sort_order = Number(sort_order);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("filter_years")
    .update(update)
    .eq("store_id", storeId)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("dashboard/years PUT error", error);
    return NextResponse.json(
      { error: "Failed to update year" },
      { status: 500 },
    );
  }

  return NextResponse.json({ year: data });
}

/**
 * DELETE /api/dashboard/years
 * body: { id }
 */
export async function DELETE(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();
  const { id } = body || {};

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("filter_years")
    .delete()
    .eq("store_id", storeId)
    .eq("id", id);

  if (error) {
    console.error("dashboard/years DELETE error", error);
    return NextResponse.json(
      { error: "Failed to delete year" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
