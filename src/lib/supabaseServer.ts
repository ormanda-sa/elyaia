// src/lib/supabaseServer.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

let supabaseServerClient: SupabaseClient | null = null;

export function getSupabaseServerClient() {
  if (!supabaseServerClient) {
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase URL or SERVICE ROLE key is missing");
    }

    supabaseServerClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
      },
    });
  }

  return supabaseServerClient;
}
