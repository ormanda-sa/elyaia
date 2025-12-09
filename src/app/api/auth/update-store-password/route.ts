import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const PASSWORD_SECRET = process.env.PASSWORD_SECRET || "darb-filter-secret";

function hashPassword(plain: string): string {
  return crypto
    .createHmac("sha256", PASSWORD_SECRET)
    .update(plain)
    .digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const { email, newPassword } = (await req.json()) as {
      email?: string;
      newPassword?: string;
    };

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: "EMAIL_PASSWORD_REQUIRED" },
        { status: 400 },
      );
    }

    const password_hash = hashPassword(newPassword);

    const { error } = await supabase
      .from("store_users")
      .update({ password_hash })
      .eq("email", email.trim().toLowerCase());

    if (error) {
      console.error("update-store-password error:", error);
      return NextResponse.json(
        { error: "UPDATE_FAILED", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("update-store-password exception:", e);
    return NextResponse.json(
      { error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
