// app/api/widget/store-domain/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(req.url);

    const storeId = searchParams.get("store_id");

    if (!storeId) {
      return NextResponse.json(
        { error: "store_id is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("stores")
      .select("domain")
      .eq("id", storeId)
      .single();

    if (error) {
      console.error("Error fetching store domain:", error);
      return NextResponse.json(
        { domain: null },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { domain: data?.domain ?? null },
      { status: 200 }
    );
  } catch (err) {
    console.error("Unexpected error in /api/widget/store-domain:", err);
    return NextResponse.json(
      { domain: null },
      { status: 200 }
    );
  }
}
