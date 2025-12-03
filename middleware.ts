// middleware.ts
import { NextRequest, NextResponse } from "next/server";

const ADMIN_SESSION_COOKIE = "gm_admin_session";

export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;

  // نشتغل فقط على مسار لوحة المدير العام
  const isAdminArea = nextUrl.pathname.startsWith("/general-manager");

  if (!isAdminArea) {
    // ما نتدخل في أي مسار ثاني
    return NextResponse.next();
  }

  const sessionToken = cookies.get(ADMIN_SESSION_COOKIE)?.value;

  // لو ما فيه جلسة → رجّعه على صفحة الدخول
  if (!sessionToken) {
    const loginUrl = new URL("/admin-login", req.url);

    // نحفظ المسار الأصلي (ممكن نستفيد منه لاحقًا)
    loginUrl.searchParams.set(
      "redirect_to",
      nextUrl.pathname + nextUrl.search
    );

    return NextResponse.redirect(loginUrl);
  }

  // لو فيه كوكي نمشيه (التحقق من DB نضيفه لاحقًا لو حاب)
  return NextResponse.next();
}

// يشتغل فقط على /general-manager/*
export const config = {
  matcher: ["/general-manager/:path*"],
};
