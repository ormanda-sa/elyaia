import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

const SESSION_COOKIE = "darb_session";

export async function getCurrentStoreId() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value || null;

  if (!token) return null;

  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("sessions")
    .select("store_id")
    .eq("session_token", token)
    .maybeSingle();

  if (error || !data?.store_id) {
    console.error("getCurrentStoreId error:", error);
    return null;
  }

  return data.store_id as string;
}
