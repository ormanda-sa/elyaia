// src/app/api/general-manager/invoices/[invoiceId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

type PatchBody = {
  status: "paid" | "unpaid" | "canceled";
};

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await context.params;
    const supabase = getSupabaseServerClient();

    const body = (await req.json()) as PatchBody | null;
    if (!body || !body.status) {
      return NextResponse.json(
        { ok: false, message: "status مطلوب" },
        { status: 400 }
      );
    }

    const updateData: any = { status: body.status };

    if (body.status === "paid") {
      updateData.paid_at = new Date().toISOString();
    } else if (body.status === "unpaid") {
      updateData.paid_at = null;
    }

    const { data, error } = await supabase
      .from("invoices")
      .update(updateData)
      .eq("id", invoiceId)
      .select(
        "id, store_id, amount_cents, status, issued_at, due_at, paid_at"
      )
      .single();

    if (error || !data) {
      console.error("INVOICE_UPDATE_ERROR", error);
      return NextResponse.json(
        { ok: false, message: "تعذر تحديث الفاتورة." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, invoice: data });
  } catch (err) {
    console.error("INVOICE_UPDATE_SERVER_ERROR", err);
    return NextResponse.json(
      { ok: false, message: "خطأ غير متوقع أثناء تحديث الفاتورة." },
      { status: 500 }
    );
  }
}
