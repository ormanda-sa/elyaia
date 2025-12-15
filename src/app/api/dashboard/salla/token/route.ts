// FILE: src/app/(admin)/api/dashboard/salla/token/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

// GET: تجيب حالة التوكن (متصل / غير متصل) + معلومات أساسية عن المتجر
export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const storeId = await getCurrentStoreId();

    if (!storeId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { data: store, error } = await supabase
      .from("stores")
      .select("id, name, salla_store_id, access_token")
      .eq("id", storeId)
      .single();

    if (error || !store) {
      return NextResponse.json({ error: "STORE_NOT_FOUND" }, { status: 404 });
    }

    const hasToken = !!store.access_token;

    return NextResponse.json({
      store_name: store.name,
      salla_store_id: store.salla_store_id,
      has_token: hasToken,
      status: hasToken ? "connected" : "disconnected",
    });
  } catch (e) {
    console.error("GET /salla/token error", e);
    return NextResponse.json(
      { error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

type Body = {
  access_token?: string | null;
};

// POST: حفظ / تحديث توكن سلة في جدول stores.access_token
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const storeId = await getCurrentStoreId();

    if (!storeId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;

    if (!body || !body.access_token || typeof body.access_token !== "string") {
      return NextResponse.json(
        { error: "ACCESS_TOKEN_REQUIRED" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("stores")
      .update({
        access_token: body.access_token,
        updated_at: new Date().toISOString(),
      })
      .eq("id", storeId);

    if (error) {
      console.error("POST /salla/token update error", error);
      return NextResponse.json(
        { error: "UPDATE_FAILED", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /salla/token error", e);
    return NextResponse.json(
      { error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

// DELETE: إيقاف التكامل (مسح التوكن من قاعدة البيانات)
export async function DELETE() {
  try {
    const supabase = getSupabaseServerClient();
    const storeId = await getCurrentStoreId();

    if (!storeId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { error } = await supabase
      .from("stores")
      .update({
        access_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", storeId);

    if (error) {
      console.error("DELETE /salla/token update error", error);
      return NextResponse.json(
        { error: "UPDATE_FAILED", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /salla/token error", e);
    return NextResponse.json(
      { error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
