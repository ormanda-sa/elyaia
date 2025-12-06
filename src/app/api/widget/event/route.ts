// app/api/widget/event/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const eventSecret = process.env.WIDGET_EVENT_SECRET!;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

type EventType =
  | "brand_select"
  | "model_select"
  | "year_select"
  | "section_select"
  | "keyword_click"
  | "search_submit";

type EventBody = {
  store_id: string;
  session_key: string;
  event_type: EventType;
  brand_id?: number | null;
  model_id?: number | null;
  year_id?: number | null;
  section_id?: number | null;
  keyword_id?: number | null;
  keyword_ids?: number[];
  meta?: Record<string, any> | null;
};

export async function POST(req: NextRequest) {
  try {
    // نسمح للسر يجينا من الهيدر أو من الـ query (عشان sendBeacon)
    const url = new URL(req.url);
    const qsSecret = url.searchParams.get("secret");
    const headerSecret = req.headers.get("x-widget-secret");
    const secret = headerSecret ?? qsSecret;

    if (!eventSecret) {
      console.error("WIDGET_EVENT_SECRET is NOT set in env");
      return NextResponse.json(
        { error: "Server misconfigured: no event secret" },
        { status: 500 },
      );
    }

    if (secret !== eventSecret) {
      console.error(
        "Invalid widget event secret",
        "header=",
        headerSecret,
        "query=",
        qsSecret,
        "env=",
        eventSecret,
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip =
      req.headers.get("x-forwarded-for") ??
      req.headers.get("x-real-ip") ??
      undefined;
    const userAgent = req.headers.get("user-agent") ?? undefined;

    // نقرأ البودي الخام
    const raw = (await req.json()) as any;

    // تطبيع أسماء الحقول بين القديم والجديد (احتياط للجوال / كود قديم)
    if (raw.storeId != null && raw.store_id == null) {
      raw.store_id = raw.storeId;
    }
    if (raw.sessionKey != null && raw.session_key == null) {
      raw.session_key = raw.sessionKey;
    }
    if (raw.keywordId != null && raw.keyword_id == null) {
      raw.keyword_id = raw.keywordId;
    }
    if (Array.isArray(raw.keywordIds) && raw.keyword_ids == null) {
      raw.keyword_ids = raw.keywordIds;
    }

    const json = raw as Partial<EventBody>;

    if (!json.store_id || !json.session_key || !json.event_type) {
      return NextResponse.json(
        { error: "store_id, session_key, event_type are required" },
        { status: 400 },
      );
    }

    const {
      store_id,
      session_key,
      event_type,
      brand_id = null,
      model_id = null,
      year_id = null,
      section_id = null,
      keyword_id = null,
      keyword_ids,
      meta = null,
    } = json;

    const finalMeta = {
      session_key,
      ip,
      user_agent: userAgent,
      ...(meta || {}),
    };

    let ids: (number | null)[] = [];

    if (Array.isArray(keyword_ids) && keyword_ids.length > 0) {
      ids = keyword_ids;
    } else {
      ids = [keyword_id];
    }

    if (event_type === "keyword_click" && ids.every((id) => id == null)) {
      return NextResponse.json(
        { error: "keyword_click requires at least one keyword_id" },
        { status: 400 },
      );
    }

    const rows = ids.map((kid) => ({
      store_id,
      event_type,
      brand_id,
      model_id,
      year_id,
      section_id,
      keyword_id: kid ?? null,
      meta: finalMeta,
    }));

    const { error: eventInsertError } = await supabase
      .from("widget_events")
      .insert(rows);

    if (eventInsertError) {
      console.error("Error inserting widget_event", eventInsertError);
      return NextResponse.json(
        {
          error: "Failed to log widget event",
          details: eventInsertError.message,
          code: eventInsertError.code,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Unexpected error in /api/widget/event", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err?.message || err) },
      { status: 500 },
    );
  }
}