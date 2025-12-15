// FILE: src/app/(admin)/api/dashboard/widget-insights-queries/generate-content-tasks/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

// POST /api/dashboard/widget-insights-queries/generate-content-tasks
// body اختياري: { threshold?: number, days?: number }
export async function POST(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const threshold = Number(body.threshold ?? 3); // أقل عدد مرات ليتحول لمهمة
  const days = Number(body.days ?? 30);         // آخر كم يوم ننظر

  const since = new Date();
  since.setDate(since.getDate() - days);

  // نقرأ من VIEW الذكية اللي فيها missing_models
  const { data: queries, error: queriesError } = await supabase
    .from("widget_insights_queries_with_gaps")
    .select(
      `
      query,
      count,
      keyword_name,
      model_name,
      year_value,
      brand_name,
      missing_models
    `,
    )
    .eq("store_id", storeId)
    .gte("last_seen_at", since.toISOString())
    .gte("count", threshold)
    .order("count", { ascending: false });

  if (queriesError) {
    console.error("[generate-content-tasks] queries error", queriesError);
    return NextResponse.json(
      { error: "FAILED_TO_FETCH_QUERIES" },
      { status: 500 },
    );
  }

  if (!queries || queries.length === 0) {
    return NextResponse.json({ created: 0, message: "NO_QUERIES_FOUND" });
  }

  let createdCount = 0;

  for (const q of queries as any[]) {
    const queryText = q.query as string;
    if (!queryText) continue;

    // هل فيه مهمة مفتوحة أو قيد التنفيذ لنفس الـ query؟
    const { data: existingOpen, error: existingOpenError } = await supabase
      .from("widget_insights_content_tasks")
      .select("id, status")
      .eq("store_id", storeId)
      .ilike("query", queryText)
      .in("status", ["open", "in_progress"]);

    if (existingOpenError) {
      console.error(
        "[generate-content-tasks] existingOpenError",
        existingOpenError,
      );
      continue;
    }
    if (existingOpen && existingOpen.length > 0) {
      continue;
    }

    // لو فيه مهمة قديمة منجزة/متجاهلة لنفس الـ query، نتجاوزها
    const { data: closedTasks, error: closedError } = await supabase
      .from("widget_insights_content_tasks")
      .select("id, status")
      .eq("store_id", storeId)
      .ilike("query", queryText)
      .in("status", ["done", "dismissed"]);

    if (closedError) {
      console.error("[generate-content-tasks] closedError", closedError);
      continue;
    }
    if (closedTasks && closedTasks.length > 0) {
      continue;
    }

    // نجهز notes (jsonb) فيها معلومات مفيدة
    const notes = {
      keyword_name: q.keyword_name ?? null,
      model_name: q.model_name ?? null,
      year_value: q.year_value ?? null,
      brand_name: q.brand_name ?? null,
      missing_models: q.missing_models ?? [],
    };

    // إنشاء مهمة جديدة
    const { error: insertError } = await supabase
      .from("widget_insights_content_tasks")
      .insert({
        store_id: storeId,
        query: queryText,
        search_count: q.count,
        status: "open",
        notes,
      });

    if (insertError) {
      console.error("[generate-content-tasks] insertError", insertError);
      continue;
    }

    createdCount++;
  }

  return NextResponse.json({ created: createdCount });
}
