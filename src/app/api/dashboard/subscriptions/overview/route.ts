// src/app/api/dashboard/subscriptions/overview/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

type SessionRow = {
  id: string;
  user_type: "store" | "admin";
  store_id: string | null;
  expires_at: string;
};

type StoreRow = {
  id: string;
  name: string;
  domain: string | null;
  status: string;
  created_at: string;
};

type SubscriptionRow = {
  id: string;
  store_id: string;
  plan_code: string;
  billing_cycle: string;
  price_cents: number;
  start_at: string;
  end_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type SubscriptionPlanRow = {
  id: string;
  code: string;
  name_ar: string;
  description_ar: string | null;
  price_cents: number;
  billing_cycle: string;
  is_active: boolean;
};

type InvoiceRow = {
  id: string;
  store_id: string;
  subscription_id: string | null;
  amount_cents: number;
  status: string;
  issued_at: string;
  due_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();

    // قراءة الكوكي للجلسة
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("darb_session")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: "NO_SESSION", message: "لم يتم العثور على جلسة مستخدم" },
        { status: 401 }
      );
    }

    // 1) نجيب الجلسة
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("session_token", sessionToken)
      .single<SessionRow>();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "INVALID_SESSION", message: "الجلسة غير صالحة" },
        { status: 401 }
      );
    }

    if (session.user_type !== "store" || !session.store_id) {
      return NextResponse.json(
        {
          error: "NOT_STORE_USER",
          message: "هذه الواجهة مخصصة لصاحب المتجر فقط",
        },
        { status: 403 }
      );
    }

    const storeId = session.store_id;

    // 2) بيانات المتجر
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, name, domain, status, created_at")
      .eq("id", storeId)
      .single<StoreRow>();

    if (storeError || !store) {
      return NextResponse.json(
        { error: "STORE_NOT_FOUND", message: "لم يتم العثور على المتجر" },
        { status: 404 }
      );
    }

    // 3) اشتراكات المتجر
    const { data: subscriptions, error: subsError } = (await supabase
      .from("subscriptions")
      .select("*")
      .eq("store_id", storeId)
      .order("start_at", { ascending: false })) as {
      data: SubscriptionRow[] | null;
      error: any;
    };

    if (subsError) {
      return NextResponse.json(
        { error: "SUBSCRIPTIONS_ERROR", message: subsError.message },
        { status: 500 }
      );
    }

    const allSubscriptions = subscriptions ?? [];

    // 4) تحديد الاشتراك الفعّال حاليًا (زمنياً و status)
    const now = new Date();
    const currentSubscription =
      allSubscriptions.find((sub) => {
        if (sub.status !== "active") return false;
        const start = new Date(sub.start_at);
        const end = sub.end_at ? new Date(sub.end_at) : null;
        if (start > now) return false;
        if (end && end < now) return false;
        return true;
      }) ?? null;

    // 5) تعريف الخطة الحالية من subscription_plans (لو موجودة)
    let currentPlan: SubscriptionPlanRow | null = null;
    if (currentSubscription) {
      const { data: planRow } = await supabase
        .from("subscription_plans")
        .select(
          "id, code, name_ar, description_ar, price_cents, billing_cycle, is_active"
        )
        .eq("code", currentSubscription.plan_code)
        .maybeSingle<SubscriptionPlanRow>();

      currentPlan = planRow ?? null;
    }

    // 6) فواتير المتجر
    const { data: invoices, error: invoicesError } = (await supabase
      .from("invoices")
      .select("*")
      .eq("store_id", storeId)
      .order("issued_at", { ascending: false })) as {
      data: InvoiceRow[] | null;
      error: any;
    };

    if (invoicesError) {
      return NextResponse.json(
        { error: "INVOICES_ERROR", message: invoicesError.message },
        { status: 500 }
      );
    }

    const allInvoices = invoices ?? [];

    // 7) حساب المجاميع (الصحيح: فقط الفواتير غير المدفوعة)
    const totalOutstandingCents = allInvoices
      .filter((inv) => inv.status === "unpaid")
      .reduce((sum, inv) => sum + (inv.amount_cents ?? 0), 0);

    const unpaidCount = allInvoices.filter(
      (inv) => inv.status === "unpaid"
    ).length;

    const paidCount = allInvoices.filter(
      (inv) => inv.status === "paid"
    ).length;

    // 8) تركيب الـ payload النهائي
    const payload = {
      store: {
        id: store.id,
        name: store.name,
        domain: store.domain,
        status: store.status,
        created_at: store.created_at,
      },
      current_subscription: currentSubscription,
      current_plan: currentPlan,
      subscriptions: allSubscriptions,
      invoices: allInvoices,
      metrics: {
        total_outstanding_cents: totalOutstandingCents,
        total_outstanding: totalOutstandingCents / 100,
        unpaid_invoices_count: unpaidCount,
        paid_invoices_count: paidCount,
        total_invoices_count: allInvoices.length,
      },
    };

    return NextResponse.json(payload);
  } catch (err: any) {
    console.error("DASHBOARD_OVERVIEW_ERROR", err);
    return NextResponse.json(
      {
        error: "SERVER_ERROR",
        message: "حدث خطأ غير متوقع في لوحة التاجر",
      },
      { status: 500 }
    );
  }
}
