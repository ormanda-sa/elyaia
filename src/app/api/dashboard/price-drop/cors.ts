// src/app/(admin)/api/dashboard/price-drop/cors.ts
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "https://darb.com.sa",
  "https://www.darb.com.sa",
];

export function withCors(req: NextRequest, res: NextResponse) {
  const origin = req.headers.get("origin") || "";

  if (ALLOWED_ORIGINS.includes(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
  }

  res.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With",
  );
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.headers.set("Access-Control-Allow-Credentials", "true");

  return res;
}

export function handleOptions(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  const res = new NextResponse(null, { status: 204 });

  if (ALLOWED_ORIGINS.includes(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
  }

  res.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With",
  );
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.headers.set("Access-Control-Allow-Credentials", "true");

  return res;
}
