// FILE: src/app/api/dashboard/price-drop/email-click/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const { searchParams } = new URL(req.url);

  const messageIdParam = searchParams.get("m");
  const redirectUrl = searchParams.get("redirect");

  if (!messageIdParam || !redirectUrl) {
    return NextResponse.json({ error: "INVALID_PARAMS" }, { status: 400 });
  }

  const messageId = Number(messageIdParam);
  if (Number.isNaN(messageId)) {
    return NextResponse.json({ error: "INVALID_MESSAGE_ID" }, { status: 400 });
  }

  // نحدث clicked_at لأول مرة فقط
  const now = new Date().toISOString();
  await supabase
    .from("price_drop_messages")
    .update({ clicked_at: now })
    .eq("id", messageId)
    .is("clicked_at", null);

  // ممكن هنا مستقبلاً نسجل event في جدول ثاني لو حاب (email_clicks أو ضمن funnel)

  // نرجع Redirect للصفحة الأصلية
  return NextResponse.redirect(redirectUrl, { status: 302 });
}
