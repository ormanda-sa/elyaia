// src/app/api/general-manager/stores/[storeId]/invoices/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await context.params;
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from("invoices")
      .select(
        "id, store_id, subscription_id, amount_cents, status, issued_at, due_at, paid_at"
      )
      .eq("store_id", storeId)
      .order("issued_at", { ascending: false });

    if (error) {
      console.error("INVOICES_LIST_ERROR", error);
      return NextResponse.json(
        { ok: false, message: "تعذر جلب الفواتير." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, invoices: data ?? [] });
  } catch (err) {
    console.error("INVOICES_LIST_SERVER_ERROR", err);
    return NextResponse.json(
      { ok: false, message: "خطأ غير متوقع أثناء جلب الفواتير." },
      { status: 500 }
    );
  }
}
