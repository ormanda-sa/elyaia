// src/app/api/webhooks/moyasar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // Moyasar عادة ترسل JSON، فنحاول نفكّه
    let payload: any = {};
    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      payload = {};
    }

    // هنا تقدر تتحقق من التوقيع إذا Moyasar تدعم HMAC في future
    // const signature = req.headers.get("X-Signature") ...

    const paymentId = payload.id;
    const status = payload.status; // "paid", "failed", ...
    const meta = payload.metadata || {};
    const invoiceId = meta.invoice_id as string | undefined;

    if (!invoiceId) {
      console.error("WEBHOOK_MOYASAR: missing invoice_id in metadata");
      return NextResponse.json({ ok: false, message: "no invoice_id" });
    }

    if (status === "paid") {
      const now = new Date().toISOString();

      const { data: inv, error: updError } = await supabase
        .from("invoices")
        .update({
          status: "paid",
          paid_at: now,
          // external_payment_id: paymentId, // لو أضفت عمود لهذا الغرض
        })
        .eq("id", invoiceId)
        .select("*")
        .single();

      if (updError || !inv) {
        console.error("WEBHOOK_MOYASAR: update invoice failed", updError);
        return NextResponse.json(
          { ok: false, message: "update failed" },
          { status: 500 },
        );
      }

      console.log("WEBHOOK_MOYASAR: invoice paid", invoiceId);
      return NextResponse.json({ ok: true });
    }

    // لو فشل أو حالة ثانية، تقدر تسجّل بس
    console.log("WEBHOOK_MOYASAR: non-paid status", status, invoiceId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("WEBHOOK_MOYASAR_ERROR", err);
    return NextResponse.json(
      { ok: false, message: "internal error" },
      { status: 500 },
    );
  }
}
