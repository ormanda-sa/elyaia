// src/app/api/general-manager/plans/[planId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

type SubscriptionPlanRow = {
  id: string;
  code: string;
  name_ar: string;
  description_ar: string | null;
  price_cents: number;
  billing_cycle: string;
  is_active: boolean;
};

type PatchBody = Partial<{
  name_ar: string;
  description_ar: string | null;
  price_cents: number;
  billing_cycle: string;
  is_active: boolean;
}>;

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ planId: string }> },
) {
  try {
    const { planId } = await context.params;
    const supabase = getSupabaseServerClient();

    const body = (await req.json()) as PatchBody | null;

    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { ok: false, message: "لا يوجد بيانات للتحديث." },
        { status: 400 },
      );
    }

    const updates: PatchBody = {};
    if (typeof body.name_ar === "string") updates.name_ar = body.name_ar;
    if (typeof body.description_ar === "string" || body.description_ar === null) {
      updates.description_ar = body.description_ar;
    }
    if (typeof body.price_cents === "number") updates.price_cents = body.price_cents;
    if (typeof body.billing_cycle === "string") updates.billing_cycle = body.billing_cycle;
    if (typeof body.is_active === "boolean") updates.is_active = body.is_active;

    const { data, error } = await supabase
      .from("subscription_plans")
      .update(updates)
      .eq("id", planId)
      .select(
        "id, code, name_ar, description_ar, price_cents, billing_cycle, is_active",
      )
      .single<SubscriptionPlanRow>();

    if (error || !data) {
      console.error("UPDATE_PLAN_ERROR", error);
      return NextResponse.json(
        { ok: false, message: "تعذر تحديث الخطة." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, plan: data });
  } catch (err) {
    console.error("PLAN_PATCH_UNEXPECTED", err);
    return NextResponse.json(
      { ok: false, message: "خطأ غير متوقع أثناء تحديث الخطة." },
      { status: 500 },
    );
  }
}

// اختياري: GET لخطة واحدة (لو كنت تستخدمه، يخلي التايب مرتاح أكثر)
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ planId: string }> },
) {
  try {
    const { planId } = await context.params;
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from("subscription_plans")
      .select(
        "id, code, name_ar, description_ar, price_cents, billing_cycle, is_active",
      )
      .eq("id", planId)
      .single<SubscriptionPlanRow>();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, message: "لم يتم العثور على الخطة." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, plan: data });
  } catch (err) {
    console.error("PLAN_GET_UNEXPECTED", err);
    return NextResponse.json(
      { ok: false, message: "خطأ غير متوقع أثناء جلب الخطة." },
      { status: 500 },
    );
  }
}
