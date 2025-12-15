// src/app/api/dashboard/profile/avatar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";
import sharp from "sharp";

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

    const supabase = getSupabaseServerClient();

    // صاحب المتجر
    const { data: owner, error: ownerError } = await supabase
      .from("store_users")
      .select("id")
      .eq("store_id", storeId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (ownerError || !owner) {
      console.error("avatar owner error:", ownerError);
      return NextResponse.json(
        { ok: false, error: "لم يتم العثور على صاحب المتجر" },
        { status: 404 },
      );
    }

    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(
        { ok: false, error: "الطلب غير صالح" },
        { status: 400 },
      );
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { ok: false, error: "الملف مفقود" },
        { status: 400 },
      );
    }

    // ----------------------------------
    // 1) نحول الملف إلى Buffer
    // ----------------------------------
    const arrayBuffer = await file.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);

    // ----------------------------------
    // 2) نضغط الصورة (تصغير + جودة أقل)
    //    - نخليها مربعة 256x256
    //    - نحفظها JPG بجودة 80
    // ----------------------------------
    const resizedBuffer = await sharp(originalBuffer)
      .resize(256, 256, { fit: "cover" })
      .jpeg({ quality: 80 })
      .toBuffer();

    const base64 = resizedBuffer.toString("base64");
    const mime = "image/jpeg";
    const dataUrl = `data:${mime};base64,${base64}`;

    // ----------------------------------
    // 3) نخزن Base64 في avatar_url
    // ----------------------------------
    const { error: updateError } = await supabase
      .from("store_users")
      .update({ avatar_url: dataUrl })
      .eq("id", owner.id);

    if (updateError) {
      console.error("avatar update error:", updateError);
      return NextResponse.json(
        { ok: false, error: "فشل حفظ الصورة" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, avatarUrl: dataUrl });
  } catch (err) {
    console.error("avatar PUT unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
