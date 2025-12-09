import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  return NextResponse.json({ ok: true, message: "abandoned-cart webhook GET is alive" });
}

// هنا يبقى كود POST الحقيقي حق الويبهوك
export async function POST(req: NextRequest) {
  // ... منطق الويبهوك اللي كتبناه
  return NextResponse.json({ ok: true });
}
