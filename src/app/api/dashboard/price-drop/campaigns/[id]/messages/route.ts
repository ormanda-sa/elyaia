// FILE: src/app/(admin)/api/dashboard/price-drop/campaigns/[id]/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

type Channel = "email" | "whatsapp";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const supabase = getSupabaseServerClient();
    const storeId = await getCurrentStoreId();

    if (!storeId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const campaignId = Number(id);
    if (Number.isNaN(campaignId)) {
      return NextResponse.json(
        { error: "INVALID_CAMPAIGN_ID" },
        { status: 400 },
      );
    }

    // نرجع ملخص الرسائل الموجودة لهذه الحملة
    const { data: targets, error: targetsError } = await supabase
      .from("price_drop_targets")
      .select("id")
      .eq("store_id", storeId)
      .eq("campaign_id", campaignId);

    if (targetsError) {
      console.error("[messages GET] targetsError", targetsError);
      return NextResponse.json(
        { error: "TARGETS_FETCH_ERROR" },
        { status: 500 },
      );
    }

    const targetIds = (targets ?? []).map((t: any) => t.id);
    if (!targetIds.length) {
      return NextResponse.json({
        email: { total: 0, pending: 0, sent: 0, failed: 0 },
        whatsapp: { total: 0, pending: 0, sent: 0, failed: 0 },
      });
    }

    const { data: msgs, error: msgsError } = await supabase
      .from("price_drop_messages")
      .select("channel, status")
      .in("target_id", targetIds);

    if (msgsError) {
      console.error("[messages GET] msgsError", msgsError);
      return NextResponse.json(
        { error: "MESSAGES_FETCH_ERROR" },
        { status: 500 },
      );
    }

    const agg = {
      email: { total: 0, pending: 0, sent: 0, failed: 0 },
      whatsapp: { total: 0, pending: 0, sent: 0, failed: 0 },
    };

    for (const m of msgs ?? []) {
      const ch = (m.channel as Channel) || "email";
      agg[ch].total += 1;
      if (m.status === "pending") agg[ch].pending += 1;
      if (m.status === "sent") agg[ch].sent += 1;
      if (m.status === "failed") agg[ch].failed += 1;
    }

    return NextResponse.json(agg);
  } catch (err) {
    console.error("[messages GET] error", err);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const supabase = getSupabaseServerClient();
    const storeId = await getCurrentStoreId();

    if (!storeId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const campaignId = Number(id);
    if (Number.isNaN(campaignId)) {
      return NextResponse.json(
        { error: "INVALID_CAMPAIGN_ID" },
        { status: 400 },
      );
    }

    // 1) نجيب الحملة عشان نعرف القنوات المفعّلة
    const { data: campaign, error: campaignError } = await supabase
      .from("price_drop_campaigns")
      .select(
        "id, store_id, send_email, send_whatsapp",
      )
      .eq("store_id", storeId)
      .eq("id", campaignId)
      .maybeSingle<{
        id: number;
        store_id: string;
        send_email: boolean;
        send_whatsapp: boolean;
      }>();

    if (campaignError) {
      console.error("[messages POST] campaignError", campaignError);
      return NextResponse.json(
        { error: "CAMPAIGN_FETCH_ERROR" },
        { status: 500 },
      );
    }

    if (!campaign) {
      return NextResponse.json(
        { error: "CAMPAIGN_NOT_FOUND" },
        { status: 404 },
      );
    }

    if (!campaign.send_email && !campaign.send_whatsapp) {
      return NextResponse.json(
        { error: "NO_CHANNELS_ENABLED" },
        { status: 400 },
      );
    }

    // 2) نجيب targets اللي تنطبق عليهم الشروط
    const { data: targets, error: targetsError } = await supabase
      .from("price_drop_targets")
      .select(
        "id, customer_email, whatsapp_number, status",
      )
      .eq("store_id", storeId)
      .eq("campaign_id", campaignId);

    if (targetsError) {
      console.error("[messages POST] targetsError", targetsError);
      return NextResponse.json(
        { error: "TARGETS_FETCH_ERROR" },
        { status: 500 },
      );
    }

    const safeTargets =
      (targets as {
        id: number;
        customer_email: string | null;
        whatsapp_number: string | null;
        status: string;
      }[]) ?? [];

    if (!safeTargets.length) {
      return NextResponse.json(
        { created_email: 0, created_whatsapp: 0 },
        { status: 200 },
      );
    }

    // 3) نجيب الرسائل الموجودة عشان ما نكرر
    const targetIds = safeTargets.map((t) => t.id);

    const { data: existingMsgs, error: existingError } = await supabase
      .from("price_drop_messages")
      .select("target_id, channel")
      .in("target_id", targetIds);

    if (existingError) {
      console.error("[messages POST] existingError", existingError);
      return NextResponse.json(
        { error: "MESSAGES_FETCH_ERROR" },
        { status: 500 },
      );
    }

    const existingSet = new Set<string>();
    for (const m of existingMsgs ?? []) {
      existingSet.add(`${m.target_id}|${m.channel}`);
    }

    const inserts: { target_id: number; channel: Channel; status: string }[] =
      [];
    let createdEmail = 0;
    let createdWhatsapp = 0;

    for (const t of safeTargets) {
      // Email
      if (
        campaign.send_email &&
        t.customer_email &&
        t.customer_email.trim() !== ""
      ) {
        const key = `${t.id}|email`;
        if (!existingSet.has(key)) {
          inserts.push({
            target_id: t.id,
            channel: "email",
            status: "pending",
          });
          createdEmail += 1;
        }
      }

      // WhatsApp
      if (
        campaign.send_whatsapp &&
        t.whatsapp_number &&
        t.whatsapp_number.trim() !== ""
      ) {
        const key = `${t.id}|whatsapp`;
        if (!existingSet.has(key)) {
          inserts.push({
            target_id: t.id,
            channel: "whatsapp",
            status: "pending",
          });
          createdWhatsapp += 1;
        }
      }
    }

    if (!inserts.length) {
      return NextResponse.json(
        { created_email: 0, created_whatsapp: 0 },
        { status: 200 },
      );
    }

    const { error: insertError } = await supabase
      .from("price_drop_messages")
      .insert(inserts);

    if (insertError) {
      console.error("[messages POST] insertError", insertError);
      return NextResponse.json(
        { error: "MESSAGES_INSERT_ERROR" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        created_email: createdEmail,
        created_whatsapp: createdWhatsapp,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[messages POST] error", err);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
