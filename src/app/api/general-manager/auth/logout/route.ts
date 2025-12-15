// src/app/api/general-manager/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
const ADMIN_SESSION_COOKIE = "gm_admin_session";

export async function POST(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const supabase = getSupabaseServerClient();

    if (sessionToken) {
      const { error } = await supabase
        .from("sessions")
        .delete()
        .eq("session_token", sessionToken);

      if (error) {
        console.error("admin logout session delete error:", error);
      }
    }

    const res = NextResponse.json({ ok: true });

    res.cookies.set(ADMIN_SESSION_COOKIE, "", {
      path: "/",
      maxAge: 0,
    });

    return res;
  } catch (err) {
    console.error("admin logout error:", err);

    const res = NextResponse.json(
      { ok: false, error: "LOGOUT_FAILED" },
      { status: 500 },
    );

    res.cookies.set(ADMIN_SESSION_COOKIE, "", {
      path: "/",
      maxAge: 0,
    });

    return res;
  }
}
