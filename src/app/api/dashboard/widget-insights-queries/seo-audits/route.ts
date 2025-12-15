// FILE: src/app/(admin)/api/dashboard/widget-insights-queries/seo-audits/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();
  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("seo_page_audits")
    .select(
      "id, task_id, url, keyword, title, meta_description, h1, word_count, has_keyword_in_title, has_keyword_in_h1, has_keyword_in_meta, status, last_checked_at, created_at",
    )
    .eq("store_id", storeId)
    .eq("url", url)
    .order("last_checked_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("[SEO_AUDITS_GET_ERROR]", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();
  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const url: string = (body.url ?? "").trim();
  const taskIdRaw = body.task_id;
  const taskId =
    typeof taskIdRaw === "number" ? taskIdRaw : Number(taskIdRaw) || null;

  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const payload = {
    store_id: storeId,
    task_id: taskId,
    url,
    keyword: body.keyword ?? null,
    title: body.title ?? null,
    meta_description: body.meta_description ?? null,
    h1: body.h1 ?? null,
    word_count: body.word_count ?? null,
    has_keyword_in_title: body.has_keyword_in_title ?? null,
    has_keyword_in_h1: body.has_keyword_in_h1 ?? null,
    has_keyword_in_meta: body.has_keyword_in_meta ?? null,
    status: body.status ?? "ok",
    last_checked_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("seo_page_audits")
    .insert(payload)
    .select(
      "id, task_id, url, keyword, title, meta_description, h1, word_count, has_keyword_in_title, has_keyword_in_h1, has_keyword_in_meta, status, last_checked_at, created_at",
    )
    .single();

  if (error) {
    console.error("[SEO_AUDITS_POST_ERROR]", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
