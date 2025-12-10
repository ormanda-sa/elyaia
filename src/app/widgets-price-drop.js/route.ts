// FILE: src/app/widgets-price-drop.js/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const js = `
// widgets-price-drop.js — active-offer-by-customer + funnel events
(function () {
  try {
    var script =
      document.currentScript ||
      (function () {
        var scripts = document.getElementsByTagName("script");
        return scripts[scripts.length - 1];
      })();

    if (!script) return;

    var STORE_ID = script.getAttribute("data-store-id");
    if (!STORE_ID) return;

    var PANEL_ORIGIN = "";
    try {
      var src = script.getAttribute("src") || "";
      var u = new URL(src, window.location.href);
      PANEL_ORIGIN = u.origin;
    } catch (e) {
      PANEL_ORIGIN = "";
    }

    var SALLA_CUSTOMER_ID = null;

    function sendPopupEvent(eventType, productId) {
      if (!PANEL_ORIGIN || !STORE_ID || !SALLA_CUSTOMER_ID) return;

      var url = PANEL_ORIGIN + "/api/dashboard/price-drop/popup-event";

      var payload = {
        store_id: STORE_ID,
        salla_customer_id: SALLA_CUSTOMER_ID,
        event_type: eventType,
      };

      if (productId) {
        payload.product_id = productId;
      }

      try {
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
          .then(function (res) {
            return res.text().then(function (text) {
              var json = null;
              try { json = JSON.parse(text); } catch (e) {}
              console.log("[popup-event]", eventType, res.status, json);
            });
          })
          .catch(function (e) {
            console.warn("[popup-event] fetch error", eventType, e);
          });
      } catch (e) {
        console.warn("[popup-event] error building request", eventType, e);
      }
    }

    function formatPrice(value) {
      if (value == null) return null;
      var num = Number(value);
      if (!isFinite(num)) return null;
      return num.toLocaleString("ar-SA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }

    function createPopup(offer) {
      if (!offer) return;

      var overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.top = "0";
      overlay.style.left = "0";
      overlay.style.right = "0";
      overlay.style.bottom = "0";
      overlay.style.background = "rgba(0,0,0,0.45)";
      overlay.style.zIndex = "99999";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.dir = "rtl";

      var box = document.createElement("div");
      box.style.background = "#ffffff";
      box.style.borderRadius = "16px";
      box.style.padding = "18px 18px 16px";
      box.style.maxWidth = "420px";
      box.style.width = "100%";
      box.style.fontFamily =
        "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      box.style.boxShadow = "0 24px 80px rgba(15,23,42,0.45)";

      var headerRow = document.createElement("div");
      headerRow.style.display = "flex";
      headerRow.style.alignItems = "center";
      headerRow.style.gap = "10px";
      headerRow.style.marginBottom = "10px";

      if (offer.product_image_url) {
        var imgWrap = document.createElement("div");
        imgWrap.style.width = "56px";
        imgWrap.style.height = "56px";
        imgWrap.style.borderRadius = "12px";
        imgWrap.style.overflow = "hidden";
        imgWrap.style.flexShrink = "0";
        imgWrap.style.background = "#f3f4f6";

        var img = document.createElement("img");
        img.src = offer.product_image_url;
        img.alt = offer.product_title || "";
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";

        imgWrap.appendChild(img);
        headerRow.appendChild(imgWrap);
      }

      var headerText = document.createElement("div");

      var title = document.createElement("div");
      title.textContent = "نزل سعر منتج شفته قبل 👀";
      title.style.fontSize = "15px";
      title.style.fontWeight = "700";
      title.style.marginBottom = "4px";

      var sub = document.createElement("div");
      sub.style.fontSize = "13px";
      sub.style.color = "#4b5563";
      var baseText = "عندك عرض خصم مخصص على ";
      if (offer.product_title) {
        baseText += "المنتج: " + offer.product_title;
      } else {
        baseText += "منتج شفته من قبل.";
      }
      sub.textContent = baseText;

      headerText.appendChild(title);
      headerText.appendChild(sub);

      headerRow.appendChild(headerText);
      box.appendChild(headerRow);

      var priceRow = document.createElement("div");
      priceRow.style.display = "flex";
      priceRow.style.alignItems = "baseline";
      priceRow.style.gap = "8px";
      priceRow.style.marginTop = "6px";
      priceRow.style.marginBottom = "6px";

      if (offer.type === "price") {
        var newFormatted = formatPrice(offer.new_price);
        var oldFormatted = formatPrice(offer.original_price);

        if (newFormatted) {
          var newPriceText = document.createElement("div");
          newPriceText.textContent = newFormatted + " ر.س";
          newPriceText.style.fontSize = "18px";
          newPriceText.style.fontWeight = "700";
          newPriceText.style.color = "#e11d48";
          priceRow.appendChild(newPriceText);
        }

        if (oldFormatted) {
          var oldPriceText = document.createElement("div");
          oldPriceText.textContent = oldFormatted + " ر.س";
          oldPriceText.style.fontSize = "12px";
          oldPriceText.style.color = "#6b7280";
          oldPriceText.style.textDecoration = "line-through";
          priceRow.appendChild(oldPriceText);
        }

        if (offer.discount_percent) {
          var badge = document.createElement("div");
          badge.textContent = "خصم " + String(offer.discount_percent) + "%";
          badge.style.display = "inline-flex";
          badge.style.alignItems = "center";
          badge.style.justifyContent = "center";
          badge.style.padding = "2px 8px";
          badge.style.borderRadius = "999px";
          badge.style.background = "#fef2f2";
          badge.style.color = "#b91c1c";
          badge.style.fontSize = "11px";
          badge.style.marginLeft = "auto";
          priceRow.appendChild(badge);
        }

        if (priceRow.children.length > 0) {
          box.appendChild(priceRow);
        }
      } else if (offer.type === "coupon") {
        var info = document.createElement("div");
        info.style.fontSize = "13px";
        info.style.marginTop = "6px";
        info.style.marginBottom = "4px";

        var line = "عندك كوبون خصم على هذا المنتج.";
        info.textContent = line;
        box.appendChild(info);

        var couponRow = document.createElement("div");
        couponRow.style.display = "flex";
        couponRow.style.alignItems = "center";
        couponRow.style.gap = "8px";
        couponRow.style.marginBottom = "6px";

        if (offer.coupon_code) {
          var codeBox = document.createElement("div");
          codeBox.textContent = offer.coupon_code;
          codeBox.style.fontSize = "14px";
          codeBox.style.fontWeight = "700";
          codeBox.style.letterSpacing = "0.12em";
          codeBox.style.padding = "4px 10px";
          codeBox.style.borderRadius = "999px";
          codeBox.style.border = "1px dashed #e11d48";
          codeBox.style.background = "#fff1f2";
          codeBox.style.color = "#b91c1c";
          couponRow.appendChild(codeBox);
        }

        if (offer.discount_percent) {
          var cpBadge = document.createElement("div");
          cpBadge.textContent = "خصم " + String(offer.discount_percent) + "%";
          cpBadge.style.fontSize = "12px";
          cpBadge.style.color = "#b91c1c";
          couponRow.appendChild(cpBadge);
        }

        box.appendChild(couponRow);
      }

      if (offer.ends_at) {
        var ends = document.createElement("div");
        ends.style.fontSize = "11px";
        ends.style.color = "#9ca3af";
        ends.style.marginBottom = "8px";
        ends.textContent = "ينتهي العرض بتاريخ: " + offer.ends_at;
        box.appendChild(ends);
      }

      var btnRow = document.createElement("div");
      btnRow.style.display = "flex";
      btnRow.style.gap = "8px";
      btnRow.style.marginTop = "10px";

      var goBtn = document.createElement("button");
      goBtn.textContent = "روح للمنتج";
      goBtn.style.flex = "1";
      goBtn.style.padding = "9px 10px";
      goBtn.style.borderRadius = "8px";
      goBtn.style.border = "none";
      goBtn.style.background = "#e11d48";
      goBtn.style.color = "#ffffff";
      goBtn.style.cursor = "pointer";
      goBtn.style.fontSize = "14px";
      goBtn.style.fontWeight = "600";

      var closeBtn = document.createElement("button");
      closeBtn.textContent = "لاحقًا";
      closeBtn.style.flex = "0 0 auto";
      closeBtn.style.padding = "9px 12px";
      closeBtn.style.borderRadius = "8px";
      closeBtn.style.border = "1px solid #e5e7eb";
      closeBtn.style.background = "#ffffff";
      closeBtn.style.color = "#111827";
      closeBtn.style.cursor = "pointer";
      closeBtn.style.fontSize = "13px";

      btnRow.appendChild(goBtn);
      btnRow.appendChild(closeBtn);
      box.appendChild(btnRow);

      overlay.appendChild(box);
      document.body.appendChild(overlay);

      var currentProductId = offer.product_id || null;

      try { sendPopupEvent("impression", currentProductId); } catch (e) {}

      function closePopup() {
        try { sendPopupEvent("close", currentProductId); } catch (e) {}
        overlay.remove();
      }

      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closePopup();
      });

      closeBtn.addEventListener("click", function () {
        closePopup();
      });

      goBtn.addEventListener("click", function () {
        try { sendPopupEvent("click", currentProductId); } catch (e) {}
        if (offer.product_url) {
          try { window.location.href = offer.product_url; } catch (e) {}
        } else {
          closePopup();
        }
      });
    }

    function getCustomerIdFromDataLayer() {
      var dl = window.dataLayer || [];
      for (var i = dl.length - 1; i >= 0; i--) {
        var ev = dl[i];
        if (!ev || !ev.customer) continue;
        var c = ev.customer;
        if (c.isGuest) return null;
        var cid = c.email_hashed || c.phone_hashed || null;
        if (!cid) return null;
        return String(cid);
      }
      return null;
    }

    function fetchActiveOffer(customerId) {
      if (!PANEL_ORIGIN) return;

      var url =
        PANEL_ORIGIN +
        "/api/dashboard/price-drop/active-offer-by-customer" +
        "?store_id=" +
        encodeURIComponent(STORE_ID) +
        "&salla_customer_id=" +
        encodeURIComponent(customerId);

      fetch(url, { method: "GET" })
        .then(function (res) {
          return res.text().then(function (text) {
            var json = null;
            try { json = JSON.parse(text); } catch (e) {}
            console.log("[active-offer-by-customer]", res.status, json);

            if (res.ok && json && json.has_offer) {
              createPopup(json);
            }
          });
        })
        .catch(function (e) {
          console.warn("[active-offer-by-customer] fetch error", e);
        });
    }

    function waitForCustomerAndRun(maxTries) {
      var tries = 0;
      var timer = setInterval(function () {
        tries++;
        var cid = getCustomerIdFromDataLayer();
        if (cid) {
          clearInterval(timer);
          SALLA_CUSTOMER_ID = cid;
          fetchActiveOffer(cid);
        } else if (tries >= maxTries) {
          clearInterval(timer);
        }
      }, 500);
    }

    function init() {
      waitForCustomerAndRun(10);
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  } catch (e) {
    console.error("[price-drop] fatal error", e);
  }
})();
`;

  return new NextResponse(js, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
