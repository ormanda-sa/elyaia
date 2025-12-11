import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServerClient();

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const type = payload?.type as string | undefined;
  const data = payload?.data || {};
  const metadata = data?.metadata || {};
  const messageId = metadata.price_drop_message_id as number | string | undefined;

  if (!type || !messageId) {
    // ما نقدر نربط الحدث برسالة معيّنة
    return NextResponse.json({ ok: true });
  }

  const idNum = Number(messageId);
  if (Number.isNaN(idNum)) {
    return NextResponse.json({ ok: true });
  }

  const nowIso = new Date().toISOString();

  if (type === "email.delivered") {
    // تم التسليم
    await supabase
      .from("price_drop_messages")
      .update({
        delivered_at: nowIso,
      })
      .eq("id", idNum);
  } else if (type === "email.failed") {
    // فشل
    const errorMsg =
      data?.error ||
      data?.reason ||
      data?.details ||
      "FAILED_BY_RESEND_WEBHOOK";

    await supabase
      .from("price_drop_messages")
      .update({
        status: "failed",
        failed_at: nowIso,
        error_message: errorMsg,
      })
      .eq("id", idNum);
  } else if (type === "email.opened") {
    // أول فتح
    await supabase
      .from("price_drop_messages")
      .update({
        opened_at: nowIso,
      })
      .eq("id", idNum)
      .is("opened_at", null);
  }

  // لو حبيت تضيف email.clicked لاحقاً:
  // else if (type === "email.clicked") { ... }

  return NextResponse.json({ ok: true });
}
