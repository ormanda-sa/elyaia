// app/api/dashboard/keywords/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

// GET ?model_id=&section_id=
export async function GET(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const { searchParams } = new URL(req.url);

  const storeId = await getCurrentStoreId();
  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const modelIdParam = searchParams.get("model_id");
  const sectionIdParam = searchParams.get("section_id");

  if (!modelIdParam || !sectionIdParam) {
    return NextResponse.json(
      { error: "model_id and section_id are required" },
      { status: 400 },
    );
  }

  const modelId = Number(modelIdParam);
  const sectionId = Number(sectionIdParam);

  if (Number.isNaN(modelId) || Number.isNaN(sectionId)) {
    return NextResponse.json(
      { error: "model_id and section_id must be numbers" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("filter_keywords")
    .select("id, name_ar, slug, sort_order")
    .eq("store_id", storeId)
    .eq("model_id", modelId)
    .eq("section_id", sectionId)
    .order("sort_order", { ascending: true })
    .order("name_ar", { ascending: true });

  if (error) {
    console.error("dashboard/keywords GET error", error);
    return NextResponse.json(
      { error: "Failed to fetch keywords" },
      { status: 500 },
    );
  }

  return NextResponse.json({ keywords: data ?? [] });
}

// POST { model_id, section_id, name_ar, slug?, sort_order? }
export async function POST(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();
  const { model_id, section_id, name_ar, slug, sort_order } = body || {};

  if (!model_id || !section_id || !name_ar) {
    return NextResponse.json(
      { error: "model_id, section_id, name_ar are required" },
      { status: 400 },
    );
  }

  const insertData: Record<string, any> = {
    store_id: storeId,
    model_id,
    section_id,
    name_ar,
    slug: slug || null,
  };

  if (sort_order !== undefined && sort_order !== null) {
    insertData.sort_order = Number(sort_order);
  }

  const { data, error } = await supabase
    .from("filter_keywords")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("dashboard/keywords POST error", error);
    return NextResponse.json(
      { error: "Failed to create keyword" },
      { status: 500 },
    );
  }

  return NextResponse.json({ keyword: data }, { status: 201 });
}

// PUT { id, name_ar?, slug?, sort_order? }
export async function PUT(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();
  const { id, name_ar, slug, sort_order } = body || {};

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const update: Record<string, any> = {};
  if (name_ar !== undefined) update.name_ar = name_ar;
  if (slug !== undefined) update.slug = slug;
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
    .from("filter_keywords")
    .update(update)
    .eq("store_id", storeId)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("dashboard/keywords PUT error", error);
    return NextResponse.json(
      { error: "Failed to update keyword" },
      { status: 500 },
    );
  }

  return NextResponse.json({ keyword: data });
}

// DELETE { id }
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
    .from("filter_keywords")
    .delete()
    .eq("store_id", storeId)
    .eq("id", id);

  if (error) {
    console.error("dashboard/keywords DELETE error", error);
    return NextResponse.json(
      { error: "Failed to delete keyword" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
