// FILE: src/app/(admin)/api/dashboard/email/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

type StoreEmailSettings = {
  store_id: string;
  from_name: string | null;
  from_email: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_username: string | null;
  smtp_password: string | null;
  use_tls: boolean;
  updated_at: string;
  logo_url: string | null; // 👈 أضفنا حقل الشعار هنا
};

export async function GET(_req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("store_email_settings")
    .select("*")
    .eq("store_id", storeId)
    .maybeSingle<StoreEmailSettings>();

  if (error) {
    console.error("[email-settings GET] error", error);
    return NextResponse.json(
      { error: "EMAIL_SETTINGS_FETCH_ERROR" },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      {
        store_id: storeId,
        from_name: null,
        from_email: null,
        smtp_host: null,
        smtp_port: null,
        smtp_username: null,
        smtp_password: null,
        use_tls: true,
        logo_url: null, // 👈 نرجّع الشعار كـ null افتراضياً
      },
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      store_id: data.store_id,
      from_name: data.from_name,
      from_email: data.from_email,
      smtp_host: data.smtp_host,
      smtp_port: data.smtp_port,
      smtp_username: data.smtp_username,
      smtp_password: data.smtp_password ? "********" : null,
      use_tls: data.use_tls,
      logo_url: data.logo_url ?? null, // 👈 نرجّع قيمة الشعار من الجدول
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
    from_name?: string | null;
    from_email?: string | null;
    smtp_host?: string | null;
    smtp_port?: number | null;
    smtp_username?: string | null;
    smtp_password?: string | null;
    use_tls?: boolean | null;
    logo_url?: string | null; // 👈 نستقبل logo_url من الـ body
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const {
    from_name = null,
    from_email = null,
    smtp_host = null,
    smtp_port = null,
    smtp_username = null,
    smtp_password = null,
    use_tls = true,
    logo_url = null,
  } = body;

  const upsertPayload: Partial<StoreEmailSettings> = {
    store_id: storeId,
    from_name,
    from_email,
    smtp_host,
    smtp_port: smtp_port ?? null,
    smtp_username,
    use_tls: use_tls ?? true,
    logo_url: logo_url ?? null, // 👈 نخزّن الرابط في الجدول
  };

  if (smtp_password && smtp_password !== "********") {
    (upsertPayload as any).smtp_password = smtp_password;
  }

  const { error } = await supabase.from("store_email_settings").upsert(
    {
      ...upsertPayload,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "store_id",
    },
  );

  if (error) {
    console.error("[email-settings POST] error", error);
    return NextResponse.json(
      { error: "EMAIL_SETTINGS_SAVE_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
