// FILE: src/app/(admin)/api/dashboard/settings/email/templates/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

export async function GET() {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();
  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("email_templates")
    .select(
      "id, code, name, description, is_active, is_default, subject_template, text_template, html_template, design_json, created_at, updated_at",
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("email_templates GET error", error);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();
  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  const payload = {
    store_id: storeId,
    code: String(body.code ?? "").trim(),
    name: String(body.name ?? "").trim(),
    description: body.description ?? null,
    is_active: Boolean(body.is_active),
    is_default: Boolean(body.is_default),
    subject_template: String(body.subject_template ?? "").trim(),
    text_template: String(body.text_template ?? "").trim(),
    html_template: String(body.html_template ?? "").trim(),
    design_json: body.design_json ?? null,
  };

  if (!payload.code || !payload.name || !payload.subject_template) {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  if (payload.is_default) {
    await supabase
      .from("email_templates")
      .update({ is_default: false })
      .eq("store_id", storeId);
  }

  const { data, error } = await supabase
    .from("email_templates")
    .insert(payload)
    .select(
      "id, code, name, description, is_active, is_default, subject_template, text_template, html_template, design_json, created_at, updated_at",
    )
    .single();

  if (error) {
    console.error("email_templates POST error", error);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
