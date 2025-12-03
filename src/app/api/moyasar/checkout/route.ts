// src/app/api/moyasar/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const MOYASAR_SECRET_KEY = process.env.MOYASAR_SECRET_KEY!;
const MOYASAR_API_BASE =
  process.env.MOYASAR_API_BASE || "https://api.moyasar.com/v1";

type SessionRow = {
  id: string;
  user_type: "store" | "admin";
  store_id: string | null;
};

type Body = {
  invoiceId: string;
  token: string;
};

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();

    // 1) تحقق من الجلسة
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("darb_session")?.value;
    if (!sessionToken) {
      return NextResponse.json(
        { ok: false, message: "غير مصرح" },
        { status: 401 },
      );
    }

    const { data: session } = await supabase
      .from("sessions")
      .select("*")
      .eq("session_token", sessionToken)
      .single<SessionRow>();

    if (!session || session.user_type !== "store" || !session.store_id) {
      return NextResponse.json(
        { ok: false, message: "هذه الواجهة لصاحب المتجر فقط." },
        { status: 403 },
      );
    }

    const storeId = session.store_id;

    const body = (await req.json()) as Body | null;
    if (!body?.invoiceId || !body?.token) {
      return NextResponse.json(
        { ok: false, message: "invoiceId و token مطلوبان" },
        { status: 400 },
      );
    }

    const invoiceId = body.invoiceId;
    const token = body.token;

    // 2) جلب الفاتورة
    const { data: inv, error: invError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .eq("store_id", storeId)
      .single();

    if (invError || !inv) {
      return NextResponse.json(
        { ok: false, message: "لم يتم العثور على الفاتورة." },
        { status: 404 },
      );
    }

    if (inv.status !== "unpaid") {
      return NextResponse.json(
        { ok: false, message: "هذه الفاتورة ليست مستحقة الدفع." },
        { status: 400 },
      );
    }

    const amount = inv.amount_cents;

    const origin = req.headers.get("origin") || "https://elyaia.vercel.app";
    const successUrl = `${origin}/dashboard/invoices/${invoiceId}/pay?status=success`;
    const failedUrl = `${origin}/dashboard/invoices/${invoiceId}/pay?status=failed`;

    // 3) استدعاء /payments في Moyasar باستخدام token
    const moyasarRes = await fetch(`${MOYASAR_API_BASE}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic " +
          Buffer.from(MOYASAR_SECRET_KEY + ":").toString("base64"),
      },
      body: JSON.stringify({
        amount,
        currency: "SAR",
        description: `Subscription invoice ${invoiceId}`,
        callback_url: successUrl,
        metadata: {
          invoice_id: invoiceId,
          store_id: storeId,
        },
        source: {
          type: "token",
          token,
        },
      }),
    });

    const paymentJson = await moyasarRes.json();

    if (!moyasarRes.ok) {
      console.error("MOYASAR_ERROR", paymentJson);
      return NextResponse.json(
        { ok: false, message: "خطأ من بوابة الدفع." },
        { status: 500 },
      );
    }

    // 4) لو الدفع ناجح عند Moyasar → نحدّث الفاتورة عندنا مباشرة
    if (paymentJson.status === "paid") {
      const now = new Date().toISOString();

      const { data: updated, error: updError } = await supabase
        .from("invoices")
        .update({
          status: "paid",
          paid_at: now,
          // external_payment_id: paymentJson.id, // اختياري لو تضيف عمود
        })
        .eq("id", invoiceId)
        .eq("store_id", storeId)
        .select("*")
        .single();

      if (updError || !updated) {
        console.error("UPDATE_INVOICE_ERROR", updError);
        // حتى لو صار خطأ هنا، الدفع تم عند Moyasar، فقط التحديث عندنا فشل
        return NextResponse.json(
          {
            ok: false,
            message: "تم الدفع، لكن تعذر تحديث الفاتورة في النظام.",
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        ok: true,
        payment: paymentJson,
        invoice: updated,
      });
    }

    // لو الحالة مو paid (مثلاً failed أو authorized فقط)
    return NextResponse.json({
      ok: false,
      message: `حالة الدفع من Moyasar: ${paymentJson.status}`,
      payment: paymentJson,
    });
  } catch (err) {
    console.error("MOYASAR_CHECKOUT_ERROR", err);
    return NextResponse.json(
      { ok: false, message: "خطأ غير متوقع في إنشاء عملية الدفع." },
      { status: 500 },
    );
  }
}
