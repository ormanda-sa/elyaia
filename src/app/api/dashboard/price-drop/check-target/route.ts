// FILE: src/app/(admin)/api/dashboard/price-drop/check-target/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { withCors, handleOptions } from "../cors";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const { searchParams } = new URL(req.url);

  const storeId = searchParams.get("store_id");

  if (!storeId) {
    return withCors(
      req,
      NextResponse.json({ error: "MISSING_STORE_ID" }, { status: 400 }),
    );
  }

  const { data: target, error } = await supabase
    .from("price_drop_targets")
    .select("id")
    .eq("store_id", storeId)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle<{ id: number }>();

  if (error) {
    console.error("CHECK_TARGET_ERROR", error);
    return withCors(
      req,
      NextResponse.json(
        { error: "TARGET_LOOKUP_FAILED" },
        { status: 500 },
      ),
    );
  }

  if (!target) {
    return withCors(
      req,
      NextResponse.json({ has_target: false }, { status: 200 }),
    );
  }

  return withCors(
    req,
    NextResponse.json(
      { has_target: true, message: "نعم" },
      { status: 200 },
    ),
  );
}
