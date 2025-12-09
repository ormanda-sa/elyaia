// src/app/price-drop.js/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const SCRIPT = `
// == DARB PRICE DROP ==
(function () {
  try {
    var cfg = window.DARB_PRICE_DROP_CONFIG || {};
    console.log("DARB PRICE DROP START", cfg);

    if (!cfg.apiBase || !cfg.storeId || !cfg.productId) {
      console.warn("DARB PRICE DROP: missing config");
      return;
    }

    var payload = {
      store_id: cfg.storeId,
      session_key: cfg.sessionKey || null,

      product_id: cfg.productId,
      product_title: cfg.productTitle || null,
      product_url: cfg.productUrl || window.location.href,
      current_price: cfg.currentPrice || null,

      salla_customer_id: cfg.sallaCustomerId || null,
      customer_name: cfg.customerName || null,
      customer_phone: cfg.customerPhone || null,
      customer_email: cfg.customerEmail || null
    };

    console.log("DARB PRICE DROP payload", payload);

    // 1) track view
    try {
      fetch(cfg.apiBase + "/track-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include"
      })
        .then(function (res) {
          console.log("DARB track-view status", res.status);
        })
        .catch(function (e) {
          console.error("DARB track-view error", e);
        });
    } catch (e) {
      console.error("DARB track-view exception", e);
    }

    // 2) check active offer (الآن فقط نرسل الطلب عشان المستقبل)
    try {
      fetch(cfg.apiBase + "/active-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: cfg.storeId,
          product_id: cfg.productId,
          salla_customer_id: cfg.sallaCustomerId || null,
          customer_email: cfg.customerEmail || null
        }),
        credentials: "include"
      })
        .then(function (res) {
          console.log("DARB active-offer status", res.status);
          if (!res.ok) return null;
          return res.json();
        })
        .then(function (data) {
          if (!data || !data.has_offer) return;
          showPriceDropBanner(data, cfg);
        })
        .catch(function (e) {
          console.error("DARB active-offer error", e);
        });
    } catch (e) {
      console.error("DARB active-offer exception", e);
    }
  } catch (e) {
    if (typeof console !== "undefined" && console.error) {
      console.error("DARB PRICE DROP ERROR", e);
    }
  }
})();

function showPriceDropBanner(data, cfg) {
  try {
    var bar = document.createElement("div");
    bar.setAttribute("dir", "rtl");

    bar.style.position = "fixed";
    bar.style.bottom = "16px";
    bar.style.right = "16px";
    bar.style.left = "16px";
    bar.style.maxWidth = "480px";
    bar.style.margin = "0 auto";
    bar.style.zIndex = "9999";
    bar.style.background = "#111827";
    bar.style.color = "#f9fafb";
    bar.style.borderRadius = "999px";
    bar.style.padding = "10px 16px";
    bar.style.boxShadow = "0 10px 30px rgba(15,23,42,0.35)";
    bar.style.display = "flex";
    bar.style.alignItems = "center";
    bar.style.gap = "10px";
    bar.style.fontFamily =
      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    bar.style.fontSize = "13px";

    var title = data.product_title || cfg.productTitle || "";

    var text = document.createElement("div");
    text.style.flex = "1";
    text.innerHTML =
      "المنتج <strong>" +
      escapeHtml(title) +
      "</strong> اللي شفته قبل نزل سعره الآن " +
      (data.discount_percent
        ? "(خصم " + Math.round(data.discount_percent) + "%)"
        : "") +
      (data.ends_at ? " – ينتهي العرض قريباً." : "");

    var btn = document.createElement("a");
    btn.textContent = "اذهب للعرض";
    btn.href = data.product_url || cfg.productUrl || window.location.href;
    btn.target = "_self";
    btn.style.background = "#e5202a";
    btn.style.color = "#fff";
    btn.style.borderRadius = "999px";
    btn.style.padding = "6px 14px";
    btn.style.fontSize = "12px";
    btn.style.textDecoration = "none";
    btn.style.whiteSpace = "nowrap";

    var close = document.createElement("button");
    close.type = "button";
    close.innerHTML = "×";
    close.style.background = "transparent";
    close.style.border = "none";
    close.style.color = "#9ca3af";
    close.style.cursor = "pointer";
    close.style.fontSize = "16px";
    close.style.lineHeight = "1";

    close.onclick = function () {
      bar.remove();
    };

    bar.appendChild(text);
    bar.appendChild(btn);
    bar.appendChild(close);

    document.body.appendChild(bar);
  } catch (e) {
    console.error("DARB showPriceDropBanner error", e);
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
// == /DARB PRICE DROP ==
`;

export async function GET(_req: NextRequest) {
  return new NextResponse(SCRIPT, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
