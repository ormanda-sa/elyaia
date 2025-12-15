// FILE: src/app/api/widget/marketing/event/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabaseService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  const sp = supabaseService();
  const body = await req.json().catch(() => null);

  const store_id = body?.store_id;
  const campaign_id = body?.campaign_id;
  const target_id = body?.target_id ?? null;
  const visitor_id = body?.visitor_id ?? null;
  const event_type = body?.event_type; // click | close
  const meta = body?.meta ?? {};

  if (!store_id || !campaign_id || !event_type) {
    return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 });
  }

  if (!["click", "close"].includes(event_type)) {
    return NextResponse.json({ ok: false, error: "invalid event_type" }, { status: 400 });
  }

  await sp.from("marketing_campaigns_funnel_events").insert({
    store_id,
    campaign_id,
    target_id,
    event_type,
    meta: { ...meta, visitor_id },
  });

  return NextResponse.json({ ok: true });
}
