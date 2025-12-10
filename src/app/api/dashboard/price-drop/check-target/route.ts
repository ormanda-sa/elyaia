// FILE: src/app/(admin)/api/dashboard/price-drop/check-target/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { withCors, handleOptions } from "../cors";

// للـ preflight من المتصفح (OPTIONS)
export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServerClient();

  try {
    const { searchParams } = new URL(req.url);

    const storeId = searchParams.get("store_id");
    const sallaCustomerId = searchParams.get("salla_customer_id");

    if (!storeId || !sallaCustomerId) {
      return withCors(
        req,
        NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 }),
      );
    }

    const { data: target, error: targetError } = await supabase
      .from("price_drop_targets")
      .select("id")
      .eq("store_id", storeId)
      .eq("salla_customer_id", sallaCustomerId)
      .limit(1)
      .maybeSingle<{ id: number }>();

    if (targetError) {
      console.error("CHECK_TARGET_ERROR", targetError);
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
  } catch (err) {
    console.error("CHECK_TARGET_FATAL", err);
    return withCors(
      req,
      NextResponse.json(
        { error: "INTERNAL_SERVER_ERROR" },
        { status: 500 },
      ),
    );
  }
}
