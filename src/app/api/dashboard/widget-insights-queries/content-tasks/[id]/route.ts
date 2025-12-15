// FILE: src/app/(admin)/api/dashboard/widget-insights-queries/content-tasks/[id]/route.ts

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

type RouteParams = {
  id: string;
};

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<RouteParams> },
) {
  try {
    const { id } = await context.params;

    const supabase = getSupabaseServerClient();
    const storeId = await getCurrentStoreId();

    if (!storeId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const taskId = Number(id);
    if (Number.isNaN(taskId)) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    let status = body?.status as TaskStatus | undefined;

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
      console.error("[content-tasks PATCH] supabase error:", error);
      return NextResponse.json(
        { error: "FAILED_TO_UPDATE_TASK" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[content-tasks PATCH] unexpected error:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
