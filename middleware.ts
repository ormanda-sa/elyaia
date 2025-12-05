// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ADMIN_SESSION_COOKIE = "gm_admin_session";

export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;
  const pathname = nextUrl.pathname;

  const isAdminArea = pathname.startsWith("/general-manager");
  const isWidgetApi = pathname.startsWith("/api/widget");

  // ===================== CORS لـ /api/widget/* =====================
  if (isWidgetApi) {
    const origin = req.headers.get("origin") || "*";

    const corsHeaders: Record<string, string> = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-widget-secret",
    };

    // طلبات الـ preflight (OPTIONS)
    if (req.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // باقي الطلبات (GET / POST) نعديها مع هيدرات CORS
    const res = NextResponse.next();
    for (const [key, value] of Object.entries(corsHeaders)) {
      res.headers.set(key, value);
    }
    return res;
  }

  // ===================== حماية لوحة المدير العام =====================
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

    return NextResponse.next();
  }

  // باقي المسارات ما نلمسها
  return NextResponse.next();
}

// نخلي الميدل وير يشتغل على المسارين
export const config = {
  matcher: ["/general-manager/:path*", "/api/widget/:path*"],
};
