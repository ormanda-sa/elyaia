import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as any;

    const store_id = String(body.store_id || "").trim();
    const visitor_id = String(body.visitor_id || "").trim();
    const path = body.path != null ? String(body.path) : null;
    const page_url = body.page_url != null ? String(body.page_url) : null;
    const referrer = body.referrer != null ? String(body.referrer) : null;

    if (!store_id || !visitor_id) {
      return NextResponse.json(
        { error: "store_id and visitor_id are required" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const user_agent = req.headers.get("user-agent") || null;
    const ua = (user_agent || "").toLowerCase();

    // ===== Bot filter (skip logging obvious bots) =====
    const BOT_UA = [
      "bot",
      "crawler",
      "spider",
      "bingpreview",
      "bingbot",
      "facebookexternalhit",
      "facebookcatalog",
      "whatsapp",
      "telegrambot",
      "slackbot",
      "twitterbot",
      "pinterest",
      "headless",
      "lighthouse",
    ];

    if (BOT_UA.some((k) => ua.includes(k))) {
      return NextResponse.json(
        { ok: true, skipped: "bot" },
        { status: 200, headers: CORS_HEADERS },
      );
    }

    const forwardedFor = req.headers.get("x-forwarded-for");
    const client_ip = forwardedFor ? forwardedFor.split(",")[0].trim() : null;

    const country_code =
      req.headers.get("x-vercel-ip-country") ||
      req.headers.get("cf-ipcountry") ||
      null;

    // dedupe: نفس (store + visitor + path) خلال 15 ثانية
    const since = new Date(Date.now() - 15_000).toISOString();
    const { data: recent, error: recentErr } = await supabase
      .from("visitors_page_views")
      .select("id")
      .eq("store_id", store_id)
      .eq("visitor_id", visitor_id)
      .eq("path", path)
      .gte("occurred_at", since)
      .limit(1);

    if (recentErr) {
      return NextResponse.json(
        { error: recentErr.message },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    if (recent && recent.length > 0) {
      return NextResponse.json(
        { ok: true, deduped: true },
        { status: 200, headers: CORS_HEADERS },
      );
    }

    const { error } = await supabase.from("visitors_page_views").insert({
      store_id,
      visitor_id,
      path,
      page_url,
      referrer,
      user_agent,
      client_ip,
      country_code,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200, headers: CORS_HEADERS });
  } catch (e: any) {
    return NextResponse.json(
      { error: "SERVER_ERROR" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
