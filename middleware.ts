// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ADMIN_SESSION_COOKIE = "gm_admin_session";

export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;

  const isAdminArea = nextUrl.pathname.startsWith("/general-manager");

  if (!isAdminArea) {
    return NextResponse.next();
  }

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

export const config = {
  matcher: ["/general-manager/:path*"],
};
