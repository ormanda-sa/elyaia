// src/app/api/dashboard/profile/meta/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

export const runtime = "nodejs";

export async function PUT(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const storeId = await getCurrentStoreId();

    if (!storeId) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { firstName, lastName, email, phone, bio } = body || {};

    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

    if (!fullName || !email) {
      return NextResponse.json(
        { ok: false, error: "الاسم والبريد الإلكتروني مطلوبة" },
        { status: 400 },
      );
    }

    // صاحب المتجر
    const { data: owner, error: ownerError } = await supabase
      .from("store_users")
      .select("id, name, email, role")
      .eq("store_id", storeId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (ownerError || !owner) {
      console.error("profile meta ownerError:", ownerError);
      return NextResponse.json(
        { ok: false, error: "لم يتم العثور على صاحب المتجر" },
        { status: 404 },
      );
    }

    const { error: updateError } = await supabase
      .from("store_users")
      .update({
        name: fullName,
        email,
        phone: phone || null,
        bio: bio || null,
      })
      .eq("id", owner.id);

    if (updateError) {
      console.error("profile meta updateError:", updateError);
      return NextResponse.json(
        { ok: false, error: "فشل حفظ المعلومات الشخصية" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("profile meta PUT unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
