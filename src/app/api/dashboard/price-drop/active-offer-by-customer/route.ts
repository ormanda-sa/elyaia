// FILE: src/app/(admin)/api/dashboard/price-drop/active-offer-by-customer/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withCors, handleOptions } from "../cors";

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

export async function GET(req: NextRequest) {
  return withCors(
    req,
    NextResponse.json(
      {
        has_offer: false,
      },
      { status: 200 },
    ),
  );
}

export async function POST(req: NextRequest) {
  return withCors(
    req,
    NextResponse.json(
      {
        has_offer: false,
      },
      { status: 200 },
    ),
  );
}
