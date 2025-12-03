// src/app/api/dashboard/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const storeId = await getCurrentStoreId();

    if (!storeId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    // المتجر + العنوان
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select(
        "id, name, owner_email, status, domain, country, city, street, postal_code, tax_id",
      )
      .eq("id", storeId)
      .maybeSingle();

    if (storeError) {
      console.error("profile GET stores error:", storeError);
      return NextResponse.json(
        { error: "FAILED_STORE" },
        { status: 500 },
      );
    }

    // صاحب المتجر + الصورة + الجوال + النبذة
    const { data: owner, error: ownerError } = await supabase
      .from("store_users")
      .select("id, name, email, role, phone, bio, avatar_url")
      .eq("store_id", storeId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (ownerError) {
      console.error("profile GET owner error:", ownerError);
    }

    const fullName =
      owner?.name ||
      store?.name ||
      "صاحب المتجر";

    let firstName = "";
    let lastName = "";
    if (owner?.name) {
      const parts = owner.name.split(" ").filter(Boolean);
      firstName = parts[0] || "";
      lastName = parts.slice(1).join(" ") || "";
    }

    const basic = {
      fullName,
      role: owner?.role === "owner" ? "صاحب المتجر" : owner?.role || "مستخدم",
      location:
        store?.city && store?.country
          ? `${store.city}، ${store.country}`
          : store?.city || store?.country || undefined,
      email: owner?.email || store?.owner_email || null,
      avatarUrl: owner?.avatar_url || null,
    };

    const meta = {
      firstName: firstName || fullName,
      lastName,
      email: owner?.email || store?.owner_email || "",
      phone: owner?.phone || "",
      bio: owner?.bio || "",
    };

    const address = {
      country: store?.country || "",
      city: store?.city || "",
      street: store?.street || "",
      postalCode: store?.postal_code || "",
      taxId: store?.tax_id || "",
    };

    return NextResponse.json({ basic, meta, address });
  } catch (err) {
    console.error("profile GET unexpected error:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
