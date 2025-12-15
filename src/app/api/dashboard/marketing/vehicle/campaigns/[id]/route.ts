// FILE: src/app/api/dashboard/marketing/vehicle/campaigns/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const storeId = await getCurrentStoreId();
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from("marketing_campaigns_vehicle")
      .select("*")
      .eq("store_id", storeId)
      .eq("id", Number(id))
      .single();

    if (error) throw error;
    return NextResponse.json({ item: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const storeId = await getCurrentStoreId();
    const supabase = getSupabaseServerClient();
    const body = await req.json();

    const patch: any = { updated_at: new Date().toISOString() };

    // اللي نسمح بتعديله
    const allowed = [
      "title",
      "status",
      "audience_mode",
      "campaign_type",
      "send_onsite",
      "send_email",
      "send_whatsapp",
      "only_customers",
      "lookback_days",
      "min_signals",
      "email_template_id",
      "coupon_code",
      "discount_percent",
      "ends_at",
      "starts_at",
    ];

    for (const k of allowed) {
      if (k in body) patch[k] = body[k];
    }

    const { error } = await supabase
      .from("marketing_campaigns_vehicle")
      .update(patch)
      .eq("store_id", storeId)
      .eq("id", Number(id));

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to update" }, { status: 500 });
  }
}
