// src/app/(admin)/api/dashboard/widget-insights-queries/content-links/route.ts
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
  const taskIdParam = searchParams.get("task_id");

  if (!taskIdParam) {
    return NextResponse.json(
      { error: "task_id is required" },
      { status: 400 },
    );
  }

  const taskId = Number(taskIdParam);
  if (Number.isNaN(taskId)) {
    return NextResponse.json(
      { error: "task_id must be a number" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("widget_insights_content_links")
    .select("id, task_id, url, type, notes, created_at")
    .eq("store_id", storeId)
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[CONTENT_LINKS_GET_ERROR]", error);
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

  const taskId = Number(body?.task_id);
  const url = (body?.url ?? "").trim();
  const type = (body?.type ?? "other").trim();
  const notes = (body?.notes ?? "").trim() || null;

  if (!taskId || Number.isNaN(taskId)) {
    return NextResponse.json(
      { error: "task_id is required and must be a number" },
      { status: 400 },
    );
  }

  if (!url) {
    return NextResponse.json(
      { error: "url is required" },
      { status: 400 },
    );
  }

  const allowedTypes = ["product", "category", "blog", "other"];
  const finalType = allowedTypes.includes(type) ? type : "other";

  const { data, error } = await supabase
    .from("widget_insights_content_links")
    .insert({
      store_id: storeId,
      task_id: taskId,
      url,
      type: finalType,
      notes,
    })
    .select("id, task_id, url, type, notes, created_at")
    .single();

  if (error) {
    console.error("[CONTENT_LINKS_POST_ERROR]", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const idParam = searchParams.get("id");

  if (!idParam) {
    return NextResponse.json(
      { error: "id is required" },
      { status: 400 },
    );
  }

  const id = Number(idParam);
  if (Number.isNaN(id)) {
    return NextResponse.json(
      { error: "id must be a number" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("widget_insights_content_links")
    .delete()
    .eq("store_id", storeId)
    .eq("id", id);

  if (error) {
    console.error("[CONTENT_LINKS_DELETE_ERROR]", error);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
