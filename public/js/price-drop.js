(function () {
  var cfg = window.DARB_PRICE_DROP_CONFIG || {};

  if (!cfg.apiBase || !cfg.storeId || !cfg.productId) return;

  var payload = {
    store_id: cfg.storeId,
    session_key: cfg.sessionKey || null,
    product_id: cfg.productId,
    product_title: cfg.productTitle || null,
    product_url: cfg.productUrl || window.location.href,
    current_price: cfg.currentPrice || null,
    salla_customer_id: cfg.sallaCustomerId || null,
    customer_email: cfg.customerEmail || null,
  };

  // تسجيل المشاهدة
  fetch(cfg.apiBase + "/track-view", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  }).catch(function () {});

  // التحقق من وجود عرض
  fetch(cfg.apiBase + "/active-offer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      store_id: cfg.storeId,
      product_id: cfg.productId,
      salla_customer_id: cfg.sallaCustomerId || null,
      customer_email: cfg.customerEmail || null,
    }),
    credentials: "include",
  })
    .then(function (res) {
      if (!res.ok) throw new Error("bad response");
      return res.json();
    })
    .then(function (data) {
      if (!data || !data.has_offer) return;
      showPriceDropBanner(data, cfg);
    })
    .catch(function () {});
})();

function showPriceDropBanner(data, cfg) {
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
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
