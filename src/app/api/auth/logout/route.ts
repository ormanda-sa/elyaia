// src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const COOKIE_NAME = "darb_session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // نقرأ التوكن من الكوكي مباشرة من الطلب
    const sessionToken = req.cookies.get(COOKIE_NAME)?.value ?? null;

    const supabase = getSupabaseServerClient();

    if (sessionToken) {
      // نحذف السطر من جدول الجلسات
      const { error } = await supabase
        .from("sessions")
        .delete()
        .eq("session_token", sessionToken);

      if (error) {
        console.error("logout delete session error:", error);
      }
    }

    // نجهز الـ response ونمسح الكوكيز
    const res = NextResponse.json({ ok: true });

    // نمسح كوكي الجلسة
    res.cookies.set(COOKIE_NAME, "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });

    // نمسح logged_in لو كنت تستخدمه في الواجهة
    res.cookies.set("logged_in", "", {
      path: "/",
      maxAge: 0,
    });

    return res;
  } catch (err) {
    console.error("logout unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
