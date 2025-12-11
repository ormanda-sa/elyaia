// FILE: src/app/(admin)/api/dashboard/whatsapp/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

type StoreWhatsappSettings = {
  store_id: string;
  provider: string;
  from_number: string | null;
  api_url: string | null;
  api_key: string | null;
  updated_at: string;
};

export async function GET(_req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("store_whatsapp_settings")
    .select("*")
    .eq("store_id", storeId)
    .maybeSingle<StoreWhatsappSettings>();

  if (error) {
    console.error("[whatsapp-settings GET] error", error);
    return NextResponse.json(
      { error: "WHATSAPP_SETTINGS_FETCH_ERROR" },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      {
        store_id: storeId,
        provider: "generic",
        from_number: null,
        api_url: null,
        api_key: null,
      },
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      store_id: data.store_id,
      provider: data.provider,
      from_number: data.from_number,
      api_url: data.api_url,
      api_key: data.api_key ? "********" : null,
    },
    { status: 200 },
  );
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: {
    provider?: string;
    from_number?: string | null;
    api_url?: string | null;
    api_key?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON" },
      { status: 400 },
    );
  }

  const {
    provider = "generic",
    from_number = null,
    api_url = null,
    api_key = null,
  } = body;

  const upsertPayload: Partial<StoreWhatsappSettings> = {
    store_id: storeId,
    provider,
    from_number,
    api_url,
  };

  if (api_key && api_key !== "********") {
    (upsertPayload as any).api_key = api_key;
  }

  const { error } = await supabase.from("store_whatsapp_settings").upsert(
    {
      ...upsertPayload,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "store_id",
    },
  );

  if (error) {
    console.error("[whatsapp-settings POST] error", error);
    return NextResponse.json(
      { error: "WHATSAPP_SETTINGS_SAVE_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
