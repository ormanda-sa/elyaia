// FILE: src/app/(admin)/api/dashboard/price-drop/messages/send-email/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

type DiscountType = "price" | "coupon";

type StoreEmailSettings = {
  store_id: string;
  from_name: string | null;
  from_email: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_username: string | null;
  smtp_password: string | null; // API Key تبع Resend
  use_tls: boolean;
  logo_url?: string | null; // شعار المتجر لو حطيناه في الجدول
};

type EmailTemplateRecord = {
  id: number;
  subject_template: string;
  text_template: string;
  html_template: string;
  is_default: boolean;
};

type CampaignForEmail = {
  id: number;
  product_title: string | null;
  product_url: string | null;
  product_image_url: string | null;
  discount_type: DiscountType;
  discount_percent: string | null;
  original_price: string | null;
  new_price: string | null;
  coupon_code: string | null;
  ends_at: string | null;
  email_template_id?: number | null;
};

type TemplateContext = {
  product_title: string;
  product_url: string;
  product_image_url: string | null;
  discount_type: DiscountType;
  discount_percent: string | null;
  original_price: string | null;
  new_price: string | null;
  coupon_code: string | null;
  store_name: string;
  store_logo_url: string | null;
  tracking_url: string;
  ends_at_label: string | null;
};

export async function POST(_req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const storeId = await getCurrentStoreId();

  if (!storeId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // 1) إعدادات الإيميل (Resend + الشعار)
  const { data: settings, error: settingsError } = await supabase
    .from("store_email_settings")
    .select("*")
    .eq("store_id", storeId)
    .maybeSingle<StoreEmailSettings>();

  if (settingsError) {
    console.error("[send-email] settingsError", settingsError);
    return NextResponse.json(
      { error: "EMAIL_SETTINGS_FETCH_ERROR" },
      { status: 500 },
    );
  }

  if (!settings || !settings.from_email || !settings.smtp_password) {
    return NextResponse.json(
      { error: "EMAIL_SETTINGS_INCOMPLETE" },
      { status: 400 },
    );
  }

  const apiKey = settings.smtp_password;
  const fromName = settings.from_name || "عروض درب لقطع الغيار";
  const fromEmail = settings.from_email;
  const storeLogoUrl = settings.logo_url ?? null;

  // 2) نجيب القوالب النشطة للمخزن
  const { data: templatesData, error: templatesError } = await supabase
    .from("email_templates")
    .select(
      "id, subject_template, text_template, html_template, is_default, is_active",
    )
    .eq("store_id", storeId)
    .eq("is_active", true);

  if (templatesError) {
    console.error("[send-email] templatesError", templatesError);
    return NextResponse.json(
      { error: "EMAIL_TEMPLATES_FETCH_ERROR" },
      { status: 500 },
    );
  }

  const templates = (templatesData ?? []) as (EmailTemplateRecord & {
    is_active: boolean;
  })[];

  const templatesMap = new Map<number, EmailTemplateRecord>();
  let defaultTemplate: EmailTemplateRecord | null = null;
  for (const t of templates) {
    templatesMap.set(t.id, t);
    if (t.is_default && !defaultTemplate) {
      defaultTemplate = t;
    }
  }

  // 3) نجيب الرسائل pending للقناة email
  const { data: pendingMsgs, error: msgsError } = await supabase
    .from("price_drop_messages")
    .select(
      `
      id,
      target_id,
      channel,
      status,
      target:price_drop_targets (
        id,
        store_id,
        campaign_id,
        product_id,
        customer_email,
        salla_customer_id
      ),
      campaign:price_drop_targets!price_drop_messages_target_id_fkey!inner(
        price_drop_campaigns (
          id,
          product_title,
          product_url,
          product_image_url,
          discount_type,
          discount_percent,
          original_price,
          new_price,
          coupon_code,
          ends_at,
          email_template_id
        )
      )
    `,
    )
    .eq("channel", "email")
    .eq("status", "pending")
    .limit(50);

  if (msgsError) {
    console.error("[send-email] msgsError", msgsError);
    return NextResponse.json(
      { error: "MESSAGES_FETCH_ERROR" },
      { status: 500 },
    );
  }

  const msgs = (pendingMsgs ?? []) as any[];

  if (!msgs.length) {
    return NextResponse.json(
      { sent: 0, failed: 0, skipped: 0 },
      { status: 200 },
    );
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  // لو مافيه ولا قالب → نرجع خطأ واضح وخلاص
  if (!templates.length) {
    console.warn("[send-email] NO_EMAIL_TEMPLATES_FOR_STORE", storeId);
    return NextResponse.json(
      { error: "NO_EMAIL_TEMPLATES_FOR_STORE" },
      { status: 400 },
    );
  }

  for (const m of msgs) {
    const target = m.target;
    const campaignWrapper = m.campaign?.price_drop_campaigns;
    const email = target?.customer_email as string | null;

    if (!email || !campaignWrapper) {
      skipped += 1;
      continue;
    }

    const c = campaignWrapper as CampaignForEmail;

    // 3.1: تحديد القالب المستخدم
    const templateForCampaign =
      (c.email_template_id &&
        templatesMap.get(Number(c.email_template_id))) ||
      defaultTemplate;

    // لو لا يوجد قالب مخصص ولا افتراضي → نستخدم البناء القديم كـ fallback
    const useLegacyBuilder = !templateForCampaign;

    // رابط تتبع النقر من الإيميل
    const trackingUrl =
      c.product_url
        ? `https://elyaia.vercel.app/api/dashboard/price-drop/email-click?m=${m.id}&redirect=${encodeURIComponent(
            c.product_url,
          )}`
        : "#";

    // تجهيز context
    const endsAtLabel =
      c.ends_at != null
        ? new Date(c.ends_at).toLocaleString("ar-SA", {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : null;

    const ctx: TemplateContext = {
      product_title: c.product_title || "المنتج الذي شاهدته",
      product_url: c.product_url || "#",
      product_image_url: c.product_image_url || null,
      discount_type: c.discount_type,
      discount_percent: c.discount_percent,
      original_price: c.original_price,
      new_price: c.new_price,
      coupon_code:
        c.discount_type === "coupon" && c.coupon_code ? c.coupon_code : null,
      store_name: fromName,
      store_logo_url: storeLogoUrl,
      tracking_url: trackingUrl,
      ends_at_label: endsAtLabel,
    };

    let subject: string;
    let bodyText: string;
    let bodyHtml: string;

    if (useLegacyBuilder) {
      // Fallback على النظام القديم لو ما كان فيه قالب
      subject = buildEmailSubject(c);
      const bodies = buildEmailBodies(
        c,
        fromName,
        trackingUrl,
      );
      bodyText = bodies.text;
      bodyHtml = bodies.html;
    } else {
      const tpl = templateForCampaign!;
      subject = applyTemplateToString(tpl.subject_template, ctx);
      bodyText = applyTemplateToString(tpl.text_template, ctx);
      bodyHtml = applyTemplateToString(tpl.html_template, ctx);
    }

    try {
      // 4) نرسل عبر Resend HTTP API + metadata للـ Webhooks
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [email],
          subject,
          text: bodyText,
          html: bodyHtml,
          metadata: {
            price_drop_message_id: m.id,
            campaign_id: c.id,
            store_id: target?.store_id ?? storeId,
          },
        }),
      });

      const body = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        console.error("[send-email] resendError", body);

        const { error: updErrFail } = await supabase
          .from("price_drop_messages")
          .update({
            status: "failed",
            failed_at: new Date().toISOString(),
            error_message: body.error || "RESEND_SEND_FAILED",
          })
          .eq("id", m.id);

        if (updErrFail) {
          console.error("[send-email] updateErrorFail", updErrFail);
        }

        failed += 1;
        continue;
      }

      const emailProviderId = body.id as string | undefined;

      const { error: updErr } = await supabase
        .from("price_drop_messages")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          error_message: null,
          email_provider_id: emailProviderId ?? null,
        })
        .eq("id", m.id);

      if (updErr) {
        console.error("[send-email] updateError", updErr);
        failed += 1;
      } else {
        sent += 1;
      }
    } catch (e: any) {
      console.error("[send-email] sendException", e);
      const { error: updErr2 } = await supabase
        .from("price_drop_messages")
        .update({
          status: "failed",
          failed_at: new Date().toISOString(),
          error_message: String(e?.message || "SEND_EXCEPTION"),
        })
        .eq("id", m.id);

      if (updErr2) {
        console.error("[send-email] updateError2", updErr2);
      }
      failed += 1;
    }
  }

  return NextResponse.json(
    {
      sent,
      failed,
      skipped,
    },
    { status: 200 },
  );
}

// ============= Helpers ============= //

function applyTemplateToString(str: string, ctx: TemplateContext): string {
  let out = str || "";

  out = out.replace(/{{\s*product_title\s*}}/g, ctx.product_title);
  out = out.replace(/{{\s*product_url\s*}}/g, ctx.product_url);
  out = out.replace(
    /{{\s*product_image_url\s*}}/g,
    ctx.product_image_url ?? "",
  );
  out = out.replace(/{{\s*discount_type\s*}}/g, ctx.discount_type);
  out = out.replace(
    /{{\s*discount_percent\s*}}/g,
    ctx.discount_percent ?? "",
  );
  out = out.replace(
    /{{\s*original_price\s*}}/g,
    ctx.original_price ?? "",
  );
  out = out.replace(/{{\s*new_price\s*}}/g, ctx.new_price ?? "");
  out = out.replace(/{{\s*coupon_code\s*}}/g, ctx.coupon_code ?? "");
  out = out.replace(/{{\s*store_name\s*}}/g, ctx.store_name);
  out = out.replace(
    /{{\s*store_logo_url\s*}}/g,
    ctx.store_logo_url ?? "",
  );
  out = out.replace(/{{\s*tracking_url\s*}}/g, ctx.tracking_url);
  out = out.replace(/{{\s*ends_at\s*}}/g, ctx.ends_at_label ?? "");

  return out;
}

function buildEmailSubject(c: {
  product_title: string | null;
  discount_type: DiscountType;
  discount_percent: string | null;
}): string {
  const title = c.product_title || "المنتج اللي شفته قبل";
  if (c.discount_type === "price" && c.discount_percent) {
    return `نزل سعر ${title} (خصم ${c.discount_percent}٪)`;
  }
  if (c.discount_type === "coupon" && c.discount_percent) {
    return `كوبون خصم ${c.discount_percent}٪ على ${title}`;
  }
  return `عرض خاص على ${title}`;
}

/**
 * البناء القديم fallback فقط لو ما فيه قالب
 */
function buildEmailBodies(
  c: {
    product_title: string | null;
    product_url: string | null;
    product_image_url: string | null;
    discount_type: DiscountType;
    discount_percent: string | null;
    original_price: string | null;
    new_price: string | null;
    coupon_code: string | null;
    ends_at: string | null;
  },
  storeName: string,
  trackingUrl: string,
): { text: string; html: string } {
  const title = c.product_title || "المنتج اللي شفته قبل";
  const url = trackingUrl || c.product_url || "#";

  const endsAtLabel =
    c.ends_at != null
      ? new Date(c.ends_at).toLocaleString("ar-SA", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : null;

  let text = `مرحبًا 👋\n\n`;
  text += `لاحظنا إنك مهتم بالمنتج: ${title}\n\n`;

  if (c.discount_type === "price") {
    if (c.original_price && c.new_price && c.original_price !== c.new_price) {
      text += `نزلنا سعره من ${c.original_price} إلى ${c.new_price} ريال`;
    } else {
      text += `عليه خصم خاص الآن.`;
    }
    if (c.discount_percent) {
      text += ` (خصم ${c.discount_percent}٪)`;
    }
    text += `.\n\n`;
  } else if (c.discount_type === "coupon" && c.coupon_code) {
    text += `فعّل كوبون الخصم: ${c.coupon_code}\n`;
    if (c.discount_percent) {
      text += `يعطيك خصم ${c.discount_percent}٪ على السعر.\n`;
    }
    text += `\n`;
  }

  if (endsAtLabel) {
    text += `العرض لفترة محدودة حتى: ${endsAtLabel}\n\n`;
  }

  text += `تقدر تشوف تفاصيل العرض من هنا:\n${url}\n\n`;
  text += `تحياتنا,\n${storeName}\n`;

  const safeOriginal =
    c.original_price != null ? `${c.original_price} ريال` : "";
  const safeNew = c.new_price != null ? `${c.new_price} ريال` : "";
  const hasPriceDrop =
    c.discount_type === "price" &&
    !!c.original_price &&
    !!c.new_price &&
    c.original_price !== c.new_price;

  const hasImage = !!(c.product_image_url && c.product_image_url.trim());
  const imageCell = hasImage
    ? `
      <td style="padding:12px 10px;" width="120">
        <img src="${c.product_image_url}" alt="${title}"
          style="width:100%;max-width:110px;border-radius:8px;display:block;object-fit:cover;border:1px solid #e5e7eb;" />
      </td>
    `
    : "";

  const detailsCell = `
      <td style="padding:12px 10px;">
        <h2 style="margin:0 0 8px 0;font-size:15px;color:#111827;">${title}</h2>

        ${
          hasPriceDrop
            ? `
        <p style="margin:0 0 4px 0;font-size:13px;color:#111827;">
          <span style="color:#9ca3af;text-decoration:line-through;">${safeOriginal}</span>
          <span style="margin-right:6px;color:#16a34a;font-weight:600;">${safeNew}</span>
        </p>
        `
            : c.new_price
            ? `
        <p style="margin:0 0 4px 0;font-size:13px;color:#111827;">
          السعر: <span style="color:#16a34a;font-weight:600;">${safeNew}</span>
        </p>
        `
            : ""
        }

        ${
          c.discount_type === "coupon" && c.coupon_code
            ? `
        <p style="margin:4px 0 4px 0;font-size:12px;color:#111827;">
          كوبون الخصم:
          <span style="display:inline-block;padding:2px 8px;border-radius:999px;background-color:#f97316;color:#ffffff;font-weight:600;">
            ${c.coupon_code}
          </span>
          ${
            c.discount_percent
              ? `<span style="margin-right:4px;color:#f97316;">(${c.discount_percent}٪)</span>`
              : ""
          }
        </p>
        `
            : ""
        }

        ${
          endsAtLabel
            ? `
        <p style="margin:4px 0 0 0;font-size:11px;color:#6b7280;">
          العرض ينتهي في: ${endsAtLabel}
        </p>
        `
            : ""
        }
      </td>
  `;

  const html = `
<!doctype html>
<html lang="ar" dir="rtl">
  <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:16px 0;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:16px 20px 8px 20px;">
                <p style="margin:0 0 8px 0;font-size:14px;color:#111827;">مرحبًا 👋</p>
                <p style="margin:0;font-size:13px;color:#4b5563;">
                  لاحظنا إنك مهتم بالمنتج التالي 👇
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:0 16px 16px 16px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;border:1px solid #e5e7eb;background-color:#f9fafb;">
                  <tr>
                    ${hasImage ? imageCell + detailsCell : detailsCell}
                  </tr>

                  <tr>
                    <td colspan="2" style="padding:0 14px 12px 14px;">
                      <a href="${url}"
                         style="
                           display:inline-block;
                           padding:10px 20px;
                           border-radius:999px;
                           background:linear-gradient(to left,#f97316,#fb923c);
                           color:#ffffff;
                           font-size:13px;
                           font-weight:600;
                           text-decoration:none;
                           margin-top:6px;
                           text-align:center;
                         ">
                        شوف العرض الآن في المتجر
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:10px 20px 14px 20px;">
                <p style="margin:0;font-size:11px;color:#9ca3af;">
                  مع تحيات <span style="color:#111827;font-weight:500;">${storeName}</span>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim();

  return { text, html };
}
