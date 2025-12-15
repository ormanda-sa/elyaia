// FILE: src/app/(admin)/api/dashboard/settings/email/templates/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

// ================= PATCH ================= //

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params; // 👈 نفك الـ Promise

  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();
  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const templateId = Number(id);
  if (Number.isNaN(templateId)) {
    return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));

  const payload: any = {
    code:
      body.code !== undefined ? String(body.code ?? "").trim() : undefined,
    name:
      body.name !== undefined ? String(body.name ?? "").trim() : undefined,
    description:
      body.description !== undefined ? body.description ?? null : undefined,
    is_active:
      body.is_active !== undefined ? Boolean(body.is_active) : undefined,
    is_default:
      body.is_default !== undefined ? Boolean(body.is_default) : undefined,
    subject_template:
      body.subject_template !== undefined
        ? String(body.subject_template ?? "").trim()
        : undefined,
    text_template:
      body.text_template !== undefined
        ? String(body.text_template ?? "").trim()
        : undefined,
    html_template:
      body.html_template !== undefined
        ? String(body.html_template ?? "").trim()
        : undefined,
    updated_at: new Date().toISOString(),
  };

  // لو صار افتراضي → عطّل الافتراضيات الأخرى لنفس المتجر
  if (payload.is_default === true) {
    await supabase
      .from("email_templates")
      .update({ is_default: false })
      .eq("store_id", storeId);
  }

  const { data, error } = await supabase
    .from("email_templates")
    .update(payload)
    .eq("store_id", storeId)
    .eq("id", templateId)
    .select(
      "id, code, name, description, is_active, is_default, subject_template, text_template, html_template, design_json, created_at, updated_at",
    )
    .single();

  if (error) {
    console.error("email_templates PATCH error", error);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json(data);
}

// ================= DELETE ================= //

export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params; // 👈 نفك الـ Promise

  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();
  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const templateId = Number(id);
  if (Number.isNaN(templateId)) {
    return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
  }

  const { error } = await supabase
    .from("email_templates")
    .delete()
    .eq("store_id", storeId)
    .eq("id", templateId);

  if (error) {
    console.error("email_templates DELETE error", error);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
