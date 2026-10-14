import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: NextRequest) {
  try {
    const storeId = req.nextUrl.searchParams.get("storeId");
    const yearId = req.nextUrl.searchParams.get("yearId");

    if (!storeId || !yearId) {
      return NextResponse.json({ error: "storeId و yearId مطلوبين" }, { status: 400 });
    }

    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("filter_year_keywords")
      .select("*")
      .eq("store_id", storeId)
      .eq("year_id", Number(yearId))
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ yearKeywords: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const store_id = body?.store_id as string | undefined;
    const year_id = body?.year_id as number | undefined;
    const name_ar = body?.name_ar as string | undefined;
    const sort_order = body?.sort_order as number | null | undefined;

    if (!store_id || !year_id || !name_ar?.trim()) {
      return NextResponse.json({ error: "store_id و year_id و name_ar مطلوبة" }, { status: 400 });
    }

    const supabase = supabaseAdmin();

    const row: any = {
      store_id,
      year_id,
      name_ar: name_ar.trim(),
    };

    // لا نولد slug ولا نغير قيم ثانية
    if (sort_order !== undefined) row.sort_order = sort_order;

    const { data, error } = await supabase.from("filter_year_keywords").insert(row).select("*").single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ yearKeyword: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body?.id as number | undefined;
    const store_id = body?.store_id as string | undefined;

    if (!id || !store_id) {
      return NextResponse.json({ error: "id و store_id مطلوبين" }, { status: 400 });
    }

    const supabase = supabaseAdmin();

    const { error } = await supabase.from("filter_year_keywords").delete().eq("id", id).eq("store_id", store_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}