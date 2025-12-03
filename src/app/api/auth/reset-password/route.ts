// src/app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import crypto from "crypto";

export const runtime = "nodejs";

const PASSWORD_SECRET = process.env.PASSWORD_SECRET || "darb-filter-secret";

function hashPassword(plain: string): string {
  // نفس الدالة المستخدمة في /api/auth/login بالضبط
  return crypto
    .createHmac("sha256", PASSWORD_SECRET)
    .update(plain)
    .digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = (body.token || "").toString().trim();
    const password = (body.password || "").toString();
    const passwordConfirm = (body.passwordConfirm || "").toString();

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "رابط الاستعادة غير صالح." },
        { status: 400 },
      );
    }

    if (!password || !passwordConfirm) {
      return NextResponse.json(
        { ok: false, error: "رجاءً أدخل كلمة المرور الجديدة وتأكيدها." },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { ok: false, error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل." },
        { status: 400 },
      );
    }

    if (password !== passwordConfirm) {
      return NextResponse.json(
        { ok: false, error: "كلمتا المرور غير متطابقتين." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();

    // نجيب سجل التوكن
    const { data: resetRecord, error: resetError } = await supabase
      .from("store_password_resets")
      .select("id, store_user_id, expires_at, used_at")
      .eq("token", token)
      .maybeSingle();

    console.log("RESET PASSWORD token =", token);
    console.log("RESET PASSWORD resetRecord =", resetRecord);
    console.log("RESET PASSWORD resetError =", resetError);

    if (!resetRecord) {
      return NextResponse.json(
        { ok: false, error: "رابط الاستعادة غير صالح أو منتهي." },
        { status: 400 },
      );
    }

    const now = new Date();
    const expiresAt = new Date(resetRecord.expires_at);
    if (expiresAt.getTime() < now.getTime()) {
      return NextResponse.json(
        { ok: false, error: "رابط الاستعادة منتهي الصلاحية." },
        { status: 400 },
      );
    }

    if (resetRecord.used_at) {
      return NextResponse.json(
        { ok: false, error: "تم استخدام رابط الاستعادة مسبقاً." },
        { status: 400 },
      );
    }

    // نجيب المستخدم
    const { data: user, error: userError } = await supabase
      .from("store_users")
      .select("id")
      .eq("id", resetRecord.store_user_id)
      .maybeSingle();

    console.log("RESET PASSWORD user =", user, "userError =", userError);

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          error: "تعذّر العثور على الحساب المرتبط بهذا الرابط.",
        },
        { status: 400 },
      );
    }

    const newHash = hashPassword(password);

    // نحدّث كلمة المرور
    const { error: updateUserError } = await supabase
      .from("store_users")
      .update({
        password_hash: newHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateUserError) {
      console.error("reset-password updateUserError:", updateUserError);
      return NextResponse.json(
        { ok: false, error: "فشل تحديث كلمة المرور، حاول لاحقاً." },
        { status: 500 },
      );
    }

    // نعلّم التوكن إنه استخدم
    const { error: updateResetError } = await supabase
      .from("store_password_resets")
      .update({
        used_at: new Date().toISOString(),
      })
      .eq("id", resetRecord.id);

    if (updateResetError) {
      console.error("reset-password updateResetError:", updateResetError);
      // ما نرجع خطأ للمستخدم؛ كلمة المرور تم تحديثها فعلاً
    }

    return NextResponse.json({
      ok: true,
      message: "تم تحديث كلمة المرور بنجاح، يمكنك الآن تسجيل الدخول.",
    });
  } catch (err) {
    console.error("reset-password unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "حدث خطأ غير متوقع، حاول لاحقاً." },
      { status: 500 },
    );
  }
}
