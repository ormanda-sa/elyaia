// src/lib/authGuard.ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const COOKIE_NAME = "darb_session";

export async function requireDashboardSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(COOKIE_NAME)?.value || null;

  if (!sessionToken) {
    redirect("/dashboard/login");
  }

  const supabase = getSupabaseServerClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, user_type, admin_user_id, store_id, expires_at")
    .eq("session_token", sessionToken)
    .limit(1)
    .maybeSingle();

  if (
    !session ||
    !session.expires_at ||
    new Date(session.expires_at) <= new Date()
  ) {
    redirect("/dashboard/login");
  }

  if (session.user_type === "admin") {
    const { data: admin } = await supabase
      .from("admin_users")
      .select("id")
      .eq("id", session.admin_user_id)
      .maybeSingle();

    if (!admin) {
      redirect("/dashboard/login");
    }
  } else if (session.user_type === "store") {
    const { data: store } = await supabase
      .from("stores")
      .select("id, status")
      .eq("id", session.store_id)
      .eq("status", "active")
      .maybeSingle();

    if (!store) {
      redirect("/dashboard/login");
    }
  } else {
    redirect("/dashboard/login");
  }

  return session;
}
