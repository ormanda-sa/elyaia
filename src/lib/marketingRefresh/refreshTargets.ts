// FILE: src/lib/marketing/refreshTargets.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export async function refreshTargetsInternal(opts: {
  supabase: SupabaseClient;
  storeId: string;
  campaignId: number;
}) {
  const { supabase, storeId, campaignId } = opts;

  // 👇 انسخ هنا نفس منطق SYNC + upsert اللي عندك حرفيًا
  // (تحميل الحملة -> signals -> filter scope -> group -> rows -> delete non-eligible pending/skipped -> upsert -> update meta)
}
