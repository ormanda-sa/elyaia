// src/app/general-manager/layout.tsx
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { GeneralManagerShell } from "./GeneralManagerShell";

const ADMIN_SESSION_COOKIE = "gm_admin_session";

type LayoutProps = {
  children: ReactNode;
};

export default async function GeneralManagerLayout({ children }: LayoutProps) {
  // 👈 هنا كانت المشكلة: لازم await
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  // لو مافيه كوكي أصلاً → روح صفحة تسجيل الدخول
  if (!sessionToken) {
    redirect("/admin-login");
  }

  const supabase = getSupabaseServerClient();
  const nowIso = new Date().toISOString();

  const { data: sessionRow, error } = await supabase
    .from("sessions")
    .select("id, user_type, expires_at")
    .eq("session_token", sessionToken)
    .gt("expires_at", nowIso)
    .maybeSingle();

  // لو مافيه جلسة admin فعّالة → رجّعه برضه
  if (error || !sessionRow || sessionRow.user_type !== "admin") {
    redirect("/admin-login");
  }

  // هنا فقط لو الأمور تمام
  return <GeneralManagerShell>{children}</GeneralManagerShell>;
}
