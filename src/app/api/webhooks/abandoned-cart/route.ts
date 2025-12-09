import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  return NextResponse.json({
    ok: true,
    message: "abandoned-cart webhook GET is alive",
  });
}

// هنا تحت يكون الـ POST الفعلي للويبهوك
// export async function POST(req: NextRequest) { ... }
