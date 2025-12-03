// src/app/api/dashboard/store-id/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    // نقرأ الكوكي darb_session من نفس الطلب
    const sessionToken = req.cookies.get("darb_session")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: "NO_SESSION" },
        { status: 401 },
      );
    }

    const supabase = getSupabaseServerClient();

    // نفترض جدول الجلسات اسمه sessions وفيه session_token + store_id
    const { data: sessionRow, error } = await supabase
      .from("sessions")
      .select("store_id")
      .eq("session_token", sessionToken)
      .maybeSingle();

    if (error || !sessionRow?.store_id) {
      console.error("store-id session error:", error);
      return NextResponse.json(
        { error: "SESSION_NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      store_id: sessionRow.store_id as string,
      event_secret: "darb_filter_2025",
    });
  } catch (err) {
    console.error("store-id unexpected error:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
