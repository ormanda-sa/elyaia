// src/app/api/dashboard/profile/basic/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

export const runtime = "nodejs";

export async function PUT(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const storeId = await getCurrentStoreId();

    if (!storeId) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { fullName, role, location, email } = body || {};

    if (!fullName) {
      return NextResponse.json(
        { ok: false, error: "الاسم الكامل مطلوب" },
        { status: 400 },
      );
    }

    // نجيب صاحب المتجر
    const { data: owner, error: ownerError } = await supabase
      .from("store_users")
      .select("id, name, email, role")
      .eq("store_id", storeId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (ownerError) {
      console.error("profile basic ownerError:", ownerError);
    }

    // تحديث جدول المتجر
    const { error: storeUpdateError } = await supabase
      .from("stores")
      .update({
        name: fullName,              // تقدر تخليه اسم المتجر أو تخزّن اسم المتجر فعلياً
        owner_email: email ?? owner?.email ?? null,
      })
      .eq("id", storeId);

    if (storeUpdateError) {
      console.error("profile basic storeUpdateError:", storeUpdateError);
      return NextResponse.json(
        { ok: false, error: "فشل حفظ بيانات المتجر" },
        { status: 500 },
      );
    }

    if (owner) {
      const { error: ownerUpdateError } = await supabase
        .from("store_users")
        .update({
          name: fullName,
          email: email ?? owner.email,
          role: role ? String(role) : owner.role,
        })
        .eq("id", owner.id);

      if (ownerUpdateError) {
        console.error("profile basic ownerUpdateError:", ownerUpdateError);
        // ما نوقف المستخدم، بس نرجّع رسالة عامة
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("profile basic PUT unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
