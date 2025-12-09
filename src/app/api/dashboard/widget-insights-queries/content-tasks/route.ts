// FILE: src/app/(admin)/api/dashboard/widget-insights-queries/content-tasks/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

type TaskStatus = "open" | "in_progress" | "done" | "dismissed";
const VALID_STATUSES: TaskStatus[] = [
  "open",
  "in_progress",
  "done",
  "dismissed",
];

// GET /api/dashboard/widget-insights-queries/content-tasks?status=open
export async function GET(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const { searchParams } = new URL(req.url);

  const storeId = await getCurrentStoreId();
  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const status = searchParams.get("status") || "open"; // أو all

  let query = supabase
    .from("widget_insights_content_tasks")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[content-tasks GET] error", error);
    return NextResponse.json(
      { error: "FAILED_TO_FETCH_TASKS" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data });
}

// PATCH /api/dashboard/widget-insights-queries/content-tasks
// body: { id: number, status: "done" | "dismissed" | "in_progress" | "open" }
export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const storeId = await getCurrentStoreId();

    if (!storeId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const idRaw = body?.id;
    let status = body?.status as TaskStatus | undefined;

    const taskId = Number(idRaw);
    if (!taskId || Number.isNaN(taskId)) {
      return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
    }

    if (!status) {
      status = "done";
    }
    if (!VALID_STATUSES.includes(status)) {
      status = "done";
    }

    const now = new Date().toISOString();

    const updatePayload: any = {
      status,
      updated_at: now,
    };

    if (status === "done" || status === "dismissed") {
      updatePayload.completed_at = now;
    } else {
      updatePayload.completed_at = null;
    }

    const { data, error } = await supabase
      .from("widget_insights_content_tasks")
      .update(updatePayload)
      .eq("id", taskId)
      .eq("store_id", storeId)
      .select()
      .single();

    if (error) {
      console.error("[content-tasks PATCH] supabase error", error);
      return NextResponse.json(
        { error: "FAILED_TO_UPDATE_TASK" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[content-tasks PATCH] unexpected error", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
