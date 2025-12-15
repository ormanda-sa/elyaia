// FILE: src/app/api/widget/suggest/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

// GET /api/widget/suggest?q=فلتر&store_id=xxxx
export async function GET(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const { searchParams } = new URL(req.url);

  const q = (searchParams.get("q") || "").trim();
  const storeId = searchParams.get("store_id");

  if (!storeId || !q) {
    return NextResponse.json(
      { suggestions: [] },
      { status: 200 }
    );
  }

  const pattern = `%${q}%`;

  const { data, error } = await supabase
    .from("filter_keywords")
    .select("id, name_ar")
    .eq("store_id", storeId)
    .ilike("name_ar", pattern)
    .order("name_ar", { ascending: true })
    .limit(10);

  if (error) {
    console.error("[widget/suggest] error", error);
    return NextResponse.json(
      { suggestions: [] },
      { status: 500 }
    );
  }

  const suggestions = (data || []).map((row) => ({
    label: row.name_ar,
    type: "filter_keyword" as const,
    id: row.id,
  }));

  return NextResponse.json({ suggestions });
}
