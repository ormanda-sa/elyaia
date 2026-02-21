import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

// GET ?year_id=
export async function GET(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const yearIdParam = searchParams.get("year_id");

  if (!yearIdParam) {
    return NextResponse.json({ error: "year_id is required" }, { status: 400 });
  }

  const yearId = Number(yearIdParam);
  if (Number.isNaN(yearId)) {
    return NextResponse.json({ error: "year_id must be a number" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("filter_year_keywords")
    .select("id, year_id, name_ar, sort_order")
    .eq("store_id", storeId)
    .eq("year_id", yearId)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    console.error("dashboard/year-keywords GET error", error);
    return NextResponse.json({ error: "Failed to fetch year keywords" }, { status: 500 });
  }

  // رجعت الاثنين عشان توافق أكثر من كود واجهة (لو تستخدم year_keywords أو items)
  return NextResponse.json({ year_keywords: data ?? [], items: data ?? [] });
}

// POST { year_id, name_ar, sort_order? }
export async function POST(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();
  const { year_id, name_ar, sort_order } = body || {};

  if (!year_id || !name_ar?.trim()) {
    return NextResponse.json(
      { error: "year_id, name_ar are required" },
      { status: 400 },
    );
  }

  const insertData: Record<string, any> = {
    store_id: storeId,
    year_id: Number(year_id),
    name_ar: String(name_ar).trim(),
  };

  // ما نلمس أي قيم ثانية
  if (sort_order !== undefined && sort_order !== null) {
    insertData.sort_order = Number(sort_order);
  }

  const { data, error } = await supabase
    .from("filter_year_keywords")
    .insert(insertData)
    .select("id, year_id, name_ar, sort_order")
    .single();

  if (error) {
    console.error("dashboard/year-keywords POST error", error);
    return NextResponse.json({ error: "Failed to create year keyword" }, { status: 500 });
  }

  return NextResponse.json({ year_keyword: data }, { status: 201 });
}

// PUT { id, name_ar?, sort_order? }
export async function PUT(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();
  const { id, name_ar, sort_order } = body || {};

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const update: Record<string, any> = {};
  if (name_ar !== undefined) update.name_ar = String(name_ar);
  if (sort_order !== undefined) update.sort_order = sort_order === null ? null : Number(sort_order);

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("filter_year_keywords")
    .update(update)
    .eq("store_id", storeId)
    .eq("id", id)
    .select("id, year_id, name_ar, sort_order")
    .single();

  if (error) {
    console.error("dashboard/year-keywords PUT error", error);
    return NextResponse.json({ error: "Failed to update year keyword" }, { status: 500 });
  }

  return NextResponse.json({ year_keyword: data });
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
    .from("filter_year_keywords")
    .delete()
    .eq("store_id", storeId)
    .eq("id", id);

  if (error) {
    console.error("dashboard/year-keywords DELETE error", error);
    return NextResponse.json({ error: "Failed to delete year keyword" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}