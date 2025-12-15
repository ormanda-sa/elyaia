// src/app/api/dashboard/profile/address/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

export const runtime = "nodejs";

export async function PUT(req: NextRequest) {
  try {
    const storeId = await getCurrentStoreId();
    if (!storeId) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { country, city, street, postalCode, taxId } = body || {};

    const supabase = getSupabaseServerClient();

    const { error } = await supabase
      .from("stores")
      .update({
        country: country || null,
        city: city || null,
        street: street || null,
        postal_code: postalCode || null,
        tax_id: taxId || null,
      })
      .eq("id", storeId);

    if (error) {
      console.error("profile address update error:", error);
      return NextResponse.json(
        { ok: false, error: "فشل حفظ العنوان" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("profile address PUT unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
