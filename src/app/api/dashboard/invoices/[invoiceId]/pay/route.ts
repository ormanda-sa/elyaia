// src/app/api/dashboard/invoices/[invoiceId]/pay/route.ts
import { NextRequest, NextResponse } from "next/server";

// هذا route مجرد stub عشان يخلي Next.js راضي في الـ build.
// لا يُستخدم فعلياً في المشروع، الدفع الحقيقي عبر /api/moyasar/checkout.
export async function POST(
  _req: NextRequest,
  _context: { params: Promise<{ invoiceId: string }> },
) {
  return NextResponse.json(
    {
      ok: false,
      message:
        "هذا المسار غير مستخدم. استخدم /api/moyasar/checkout لعمليات الدفع.",
    },
    { status: 404 },
  );
}

export async function GET(
  _req: NextRequest,
  _context: { params: Promise<{ invoiceId: string }> },
) {
  return NextResponse.json(
    {
      ok: false,
      message: "هذا المسار غير مستخدم.",
    },
    { status: 404 },
  );
}
