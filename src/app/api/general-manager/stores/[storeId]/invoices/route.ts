// src/app/api/general-manager/stores/[storeId]/invoices/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

type InvoiceBody = {
  amount_cents: number;
  subscription_id?: string | null;
  issued_at?: string | null;
  due_at?: string | null;
};

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ storeId: string }> }
) {
  try {
    const supabase = getSupabaseServerClient();

    // ⚠️ هنا التعديل المهم: params عبارة عن Promise
    const { storeId } = await context.params;

    // 1) نقرأ الـ body
    const body = (await req.json()) as InvoiceBody | null;

    if (!body || typeof body.amount_cents !== "number") {
      return NextResponse.json(
        {
          error: "INVALID_BODY",
          message: "amount_cents رقم مطلوب لإنشاء الفاتورة",
        },
        { status: 400 }
      );
    }

    const amount_cents = body.amount_cents;
    const subscription_id = body.subscription_id ?? null;
    const issued_at = body.issued_at ? new Date(body.issued_at) : new Date();
    const due_at = body.due_at ? new Date(body.due_at) : null;

    // 2) تأكد أن المتجر موجود
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id")
      .eq("id", storeId)
      .single();

    if (storeError || !store) {
      return NextResponse.json(
        { error: "STORE_NOT_FOUND", message: "المتجر غير موجود" },
        { status: 404 }
      );
    }

    // 3) تأكد أن الاشتراك (لو أُرسل) يخص نفس المتجر
    if (subscription_id) {
      const { data: sub, error: subError } = await supabase
        .from("subscriptions")
        .select("id, store_id")
        .eq("id", subscription_id)
        .single();

      if (subError || !sub || sub.store_id !== storeId) {
        return NextResponse.json(
          {
            error: "INVALID_SUBSCRIPTION",
            message: "الاشتراك غير موجود أو لا يخص هذا المتجر",
          },
          { status: 400 }
        );
      }
    }

    // 4) إنشاء الفاتورة في حالة unpaid
    const { data: invoice, error: insertError } = await supabase
      .from("invoices")
      .insert({
        store_id: storeId,
        subscription_id: subscription_id,
        amount_cents,
        status: "unpaid",
        issued_at: issued_at.toISOString(),
        due_at: due_at ? due_at.toISOString() : null,
      })
      .select("*")
      .single();

    if (insertError || !invoice) {
      console.error("INVOICE_CREATE_ERROR", insertError);
      return NextResponse.json(
        {
          error: "INVOICE_CREATE_FAILED",
          message: "فشل إنشاء الفاتورة",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        invoice,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("INVOICE_CREATE_SERVER_ERROR", err);
    return NextResponse.json(
      {
        error: "SERVER_ERROR",
        message: "حدث خطأ غير متوقع أثناء إنشاء الفاتورة",
      },
      { status: 500 }
    );
  }
}
