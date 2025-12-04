import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

/**
 * GET /api/dashboard/sections
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabaseServerClient();

  const storeId = await getCurrentStoreId();
  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("filter_sections")
    .select("id, name_ar, slug, salla_section_id, sort_order")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true })
    .order("name_ar", { ascending: true });

  if (error) {
    console.error("dashboard/sections GET error", error);
    return NextResponse.json(
      { error: "Failed to fetch sections" },
      { status: 500 },
    );
  }

  return NextResponse.json({ sections: data ?? [] });
}

/**
 * POST /api/dashboard/sections
 * body: { name_ar, slug?, salla_section_id?, sort_order? }
 */
export async function POST(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();
  const { name_ar, slug, salla_section_id, sort_order } = body || {};

  if (!name_ar) {
    return NextResponse.json({ error: "name_ar is required" }, { status: 400 });
  }

  const insertData: Record<string, any> = {
    store_id: storeId,
    name_ar,
    slug: slug || null,
    salla_section_id: salla_section_id || null,
  };

  if (sort_order !== undefined && sort_order !== null) {
    insertData.sort_order = Number(sort_order);
  }

  const { data, error } = await supabase
    .from("filter_sections")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("dashboard/sections POST error", error);
    return NextResponse.json(
      { error: "Failed to create section" },
      { status: 500 },
    );
  }

  return NextResponse.json({ section: data }, { status: 201 });
}

/**
 * PUT /api/dashboard/sections
 * body: { id, name_ar?, slug?, salla_section_id?, sort_order? }
 */
export async function PUT(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();
  const { id, name_ar, slug, salla_section_id, sort_order } = body || {};

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const update: Record<string, any> = {};
  if (name_ar !== undefined) update.name_ar = name_ar;
  if (slug !== undefined) update.slug = slug;
  if (salla_section_id !== undefined) update.salla_section_id = salla_section_id;
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
    .from("filter_sections")
    .update(update)
    .eq("store_id", storeId)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("dashboard/sections PUT error", error);
    return NextResponse.json(
      { error: "Failed to update section" },
      { status: 500 },
    );
  }

  return NextResponse.json({ section: data });
}

/**
 * DELETE /api/dashboard/sections
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
    .from("filter_sections")
    .delete()
    .eq("store_id", storeId)
    .eq("id", id);

  if (error) {
    console.error("dashboard/sections DELETE error", error);
    return NextResponse.json(
      { error: "Failed to delete section" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
