// FILE: src/app/(admin)/api/dashboard/price-drop/check-target/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(req.url);

    const sallaStoreId = searchParams.get("salla_store_id");
    const sallaCustomerId = searchParams.get("salla_customer_id");

    if (!sallaStoreId || !sallaCustomerId) {
      return NextResponse.json(
        { error: "MISSING_FIELDS" },
        { status: 400 },
      );
    }

    // نحول salla_store_id -> store_id من جدول stores
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id")
      .eq("salla_store_id", sallaStoreId)
      .maybeSingle<{ id: string }>();

    if (storeError || !store) {
      return NextResponse.json(
        { error: "STORE_NOT_FOUND" },
        { status: 404 },
      );
    }

    const storeId = store.id;

    // نشيك هل فيه أي target لهذا العميل في أي حملة
    const { data: target, error: targetError } = await supabase
      .from("price_drop_targets")
      .select("id")
      .eq("store_id", storeId)
      .eq("salla_customer_id", sallaCustomerId)
      .limit(1)
      .maybeSingle<{ id: number }>();

    if (targetError) {
      console.error("CHECK_TARGET_ERROR", targetError);
      return NextResponse.json(
        { error: "TARGET_LOOKUP_FAILED" },
        { status: 500 },
      );
    }

    if (!target) {
      // مافيه أي target → خلاص
      return NextResponse.json({ has_target: false });
    }

    // لقينا target → نرجّع "نعم"
    return NextResponse.json({ has_target: true, message: "نعم" });
  } catch (err) {
    console.error("CHECK_TARGET_FATAL", err);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
