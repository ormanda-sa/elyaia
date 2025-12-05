// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ADMIN_SESSION_COOKIE = "gm_admin_session";

const allowedOrigins = [
  "http://localhost:3000",      // التطوير
  "https://elyaia.vercel.app",  // البرودكشن
];

export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;
  const pathname = nextUrl.pathname;
  const origin = req.headers.get("origin") || "";

  const isAdminArea = pathname.startsWith("/general-manager");
  const isWidgetApi = pathname.startsWith("/api/widget");

  // 🟡 أولاً: تعامل مع preflight للـ CORS على /api/widget/*
  if (isWidgetApi && req.method === "OPTIONS") {
    const res = new NextResponse(null, { status: 200 });

    if (allowedOrigins.includes(origin)) {
      res.headers.set("Access-Control-Allow-Origin", origin);
    }
    res.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.headers.set("Vary", "Origin");

    return res;
  }

  // 🔒 ثانياً: منطق الـ admin حقك كما هو
  if (isAdminArea) {
    const sessionToken = cookies.get(ADMIN_SESSION_COOKIE)?.value;

    if (!sessionToken) {
      const loginUrl = new URL("/admin-login", req.url);
      loginUrl.searchParams.set(
        "redirect_to",
        nextUrl.pathname + nextUrl.search,
      );
      return NextResponse.redirect(loginUrl);
    }
  }

  // 🟢 باقي الطلبات تمشي عادي
  const res = NextResponse.next();

  // نضيف CORS على ردود /api/widget/*
  if (isWidgetApi) {
    if (allowedOrigins.includes(origin)) {
      res.headers.set("Access-Control-Allow-Origin", origin);
      res.headers.set("Vary", "Origin");
    }
    res.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  return res;
}

// هنا خلى الـ middleware يشتغل على المسارين معًا
export const config = {
  matcher: [
    "/general-manager/:path*",
    "/api/widget/:path*",
  ],
};
