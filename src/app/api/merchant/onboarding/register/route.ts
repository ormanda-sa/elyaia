// src/app/api/merchant/onboarding/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const PASSWORD_SECRET = process.env.PASSWORD_SECRET || "darb-filter-secret";

function hashPassword(plain: string): string {
  return crypto
    .createHmac("sha256", PASSWORD_SECRET)
    .update(plain)
    .digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();

    const {
      storeName,
      ownerName,
      domain,
      sallaStoreId,
      email,
      password,
      passwordConfirm,
    } = (await req.json()) as {
      storeName?: string;
      ownerName?: string;
      domain?: string;
      sallaStoreId?: string;
      email?: string;
      password?: string;
      passwordConfirm?: string;
    };

    if (
      !storeName ||
      !ownerName ||
      !domain ||
      !sallaStoreId ||
      !email ||
      !password ||
      !passwordConfirm
    ) {
      return NextResponse.json(
        { ok: false, message: "الرجاء تعبئة جميع الحقول." },
        { status: 400 },
      );
    }

    if (password !== passwordConfirm) {
      return NextResponse.json(
        { ok: false, message: "كلمة المرور غير متطابقة." },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // لا تكرر متجر بنفس salla_store_id
    const { data: existingStore } = await supabase
      .from("stores")
      .select("id")
      .eq("salla_store_id", String(sallaStoreId))
      .maybeSingle();

    if (existingStore) {
      return NextResponse.json(
        { ok: false, message: "هذا المتجر مسجل مسبقًا." },
        { status: 409 },
      );
    }

    // لا تكرر مستخدم بنفس الإيميل
    const { data: existingUser } = await supabase
      .from("store_users")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { ok: false, message: "هذا البريد مستخدم مسبقًا." },
        { status: 409 },
      );
    }

    const passwordHash = hashPassword(password);

    // إنشاء المتجر = حالة تجريبي
    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .insert({
        salla_store_id: String(sallaStoreId),
        name: storeName,
        domain: domain || null,
        owner_email: normalizedEmail,
        access_token: "PENDING_SALLA_TOKEN",
        status: "trial", // 👈 تجريبي
      })
      .select("id")
      .single();

    if (storeErr || !store) {
      console.error("[REGISTER] storeErr:", storeErr);
      return NextResponse.json(
        { ok: false, message: "تعذر إنشاء المتجر." },
        { status: 500 },
      );
    }

    const storeId = store.id;

    // إنشاء مالك المتجر
    const { error: userErr } = await supabase.from("store_users").insert({
      store_id: storeId,
      email: normalizedEmail,
      name: ownerName,
      password_hash: passwordHash,
      role: "owner",
    });

    if (userErr) {
      console.error("[REGISTER] userErr:", userErr);
      return NextResponse.json(
        {
          ok: false,
          message: "تم إنشاء المتجر ولكن تعذر إنشاء مستخدم المتجر.",
        },
        { status: 500 },
      );
    }

    // اشتراك تجربة 14 يوم
    const trialDays = 14;
    const startAt = new Date();
    const endAt = new Date();
    endAt.setDate(endAt.getDate() + trialDays);

    const { error: subErr } = await supabase.from("subscriptions").insert({
      store_id: storeId,
      plan_code: "trial",
      billing_cycle: "trial",
      price_cents: 0,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: "active",
    });

    if (subErr) {
      console.error("[REGISTER] subErr:", subErr);
      // ما نرجع فشل كامل، بس نسجّل اللوق
    }

    return NextResponse.json(
      {
        ok: true,
        message: "تم إنشاء المتجر وحساب المالك بنجاح.",
        redirectTo: "/dashboard/login",
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[REGISTER] unexpected error:", err);
    return NextResponse.json(
      { ok: false, message: "خطأ في السيرفر." },
      { status: 500 },
    );
  }
}
