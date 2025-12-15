import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentStoreId } from "@/lib/currentStore";

function supabaseService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const campaignId = Number(id);
    if (!Number.isFinite(campaignId)) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }

    // تأكيد جلسة لوحة التحكم
    const storeId = await getCurrentStoreId();
    if (!storeId) return NextResponse.json({ error: "store_id not found" }, { status: 401 });

    const sp = supabaseService();

    const { data: c, error: e1 } = await sp
      .from("marketing_campaigns_vehicle")
      .select("id, store_id, audience_mode, status, send_email, send_whatsapp")
      .eq("store_id", storeId)
      .eq("id", campaignId)
      .single();

    if (e1) throw e1;
    if (!c) return NextResponse.json({ error: "campaign not found" }, { status: 404 });
    if (c.audience_mode !== "targeted") {
      return NextResponse.json({ error: "campaign must be targeted" }, { status: 400 });
    }

    // targets pending فقط
    const { data: targets, error: e2 } = await sp
      .from("marketing_campaigns_targets")
      .select("id, customer_email, customer_phone, status")
      .eq("store_id", storeId)
      .eq("campaign_id", campaignId)
      .in("status", ["pending"])
      .limit(2000);

    if (e2) throw e2;

    const rows: any[] = [];
    for (const t of targets ?? []) {
      if (c.send_email && t.customer_email) {
        rows.push({
          store_id: storeId,
          campaign_id: campaignId,
          target_id: t.id,
          channel: "email",
          status: "pending",
        });
      }
      if (c.send_whatsapp && t.customer_phone) {
        rows.push({
          store_id: storeId,
          campaign_id: campaignId,
          target_id: t.id,
          channel: "whatsapp",
          status: "pending",
        });
      }
    }

    let created = 0;
    if (rows.length) {
      const { data: ins, error: e3 } = await sp
        .from("marketing_campaigns_messages")
        .insert(rows)
        .select("id");
      if (e3) throw e3;
      created = (ins ?? []).length;
    }

    return NextResponse.json({
      ok: true,
      targets_pending: (targets ?? []).length,
      messages_created: created,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed" }, { status: 500 });
  }
}
