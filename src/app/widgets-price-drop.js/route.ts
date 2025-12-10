// FILE: src/app/widgets-price-drop.js/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const js = `
// widgets-price-drop.js — Check target + product card popup + funnel events
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
      box.style.borderRadius = "18px";
      box.style.padding = "18px 18px 16px";
      box.style.maxWidth = "520px";
      box.style.width = "100%";
      box.style.fontFamily =
        "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      box.style.boxShadow = "0 24px 80px rgba(15,23,42,0.45)";

      // عنوان عام فوق السلايدر
      var headerTitle = document.createElement("div");
      headerTitle.textContent = "نزل سعر منتج شفته قبل 👀";
      headerTitle.style.fontSize = "16px";
      headerTitle.style.fontWeight = "700";
      headerTitle.style.marginBottom = "4px";
      box.appendChild(headerTitle);

      var headerSub = document.createElement("div");
      headerSub.style.fontSize = "13px";
      headerSub.style.color = "#4b5563";
      headerSub.style.marginBottom = "10px";
      headerSub.textContent =
        "عندك عرض خصم مخصص على منتج شفته قبل، شوف تفاصيل العرض تحت:";
      box.appendChild(headerSub);

      // سلايدر منتج واحد حالياً (s-slider-container) — جاهز للتوسّع لاحقاً
      var slider = document.createElement("div");
      slider.className = "s-slider-container darb-price-drop-slider";
      slider.style.marginBottom = "10px";

      var wrapper = document.createElement("div");
      wrapper.className = "swiper-wrapper";

      var slide = document.createElement("div");
      slide.className = "swiper-slide";

      var card = document.createElement("div");
      card.style.display = "flex";
      card.style.gap = "12px";
      card.style.alignItems = "stretch";
      card.style.border = "1px solid #e5e7eb";
      card.style.borderRadius = "14px";
      card.style.padding = "10px";
      card.style.background = "#f9fafb";

      // صورة المنتج
      if (offer && offer.product_image_url) {
        var imgWrap = document.createElement("div");
        imgWrap.style.width = "90px";
        imgWrap.style.minWidth = "90px";
        imgWrap.style.height = "90px";
        imgWrap.style.borderRadius = "12px";
        imgWrap.style.overflow = "hidden";
        imgWrap.style.background = "#f3f4f6";
        imgWrap.style.display = "flex";
        imgWrap.style.alignItems = "center";
        imgWrap.style.justifyContent = "center";

        var img = document.createElement("img");
        img.src = offer.product_image_url;
        img.alt = offer.product_title || "";
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";

        imgWrap.appendChild(img);
        card.appendChild(imgWrap);
      }

      var cardContent = document.createElement("div");
      cardContent.style.flex = "1";
      cardContent.style.display = "flex";
      cardContent.style.flexDirection = "column";
      cardContent.style.gap = "6px";

      if (offer && offer.product_title) {
        var pTitle = document.createElement("div");
        pTitle.textContent = offer.product_title;
        pTitle.style.fontSize = "14px";
        pTitle.style.fontWeight = "600";
        pTitle.style.color = "#111827";
        cardContent.appendChild(pTitle);
      }

      // سطر السعر
      var priceRow = document.createElement("div");
      priceRow.style.display = "flex";
      priceRow.style.alignItems = "baseline";
      priceRow.style.gap = "8px";

      var currentFormatted = formatPrice(
        offer && offer.current_price != null
          ? offer.current_price
          : offer && offer.new_price != null
          ? offer.new_price
          : null,
      );

      if (currentFormatted) {
        var currentPriceText = document.createElement("div");
        currentPriceText.textContent = currentFormatted + " ر.س";
        currentPriceText.style.fontSize = "16px";
        currentPriceText.style.fontWeight = "700";
        currentPriceText.style.color = "#e11d48";
        priceRow.appendChild(currentPriceText);
      }

      if (offer && offer.discount_type === "price") {
        var oldFormatted = formatPrice(offer.original_price);
        if (oldFormatted) {
          var oldPriceText = document.createElement("div");
          oldPriceText.textContent = oldFormatted + " ر.س";
          oldPriceText.style.fontSize = "12px";
          oldPriceText.style.color = "#6b7280";
          oldPriceText.style.textDecoration = "line-through";
          priceRow.appendChild(oldPriceText);
        }
      }

      if (offer && offer.discount_percent) {
        var badge = document.createElement("div");
        badge.textContent = "خصم " + String(offer.discount_percent) + "%";
        badge.style.marginLeft = "auto";
        badge.style.fontSize = "11px";
        badge.style.padding = "2px 8px";
        badge.style.borderRadius = "999px";
        badge.style.background = "#fef2f2";
        badge.style.color = "#b91c1c";
        priceRow.appendChild(badge);
      }

      if (priceRow.children.length > 0) {
        cardContent.appendChild(priceRow);
      }

      // كوبون إن وجد
      if (offer && offer.discount_type === "coupon") {
        var cpLabel = document.createElement("div");
        cpLabel.textContent = "عندك كوبون خصم على هذا المنتج:";
        cpLabel.style.fontSize = "12px";
        cpLabel.style.color = "#4b5563";
        cardContent.appendChild(cpLabel);

        var couponRow = document.createElement("div");
        couponRow.style.display = "flex";
        couponRow.style.alignItems = "center";
        couponRow.style.gap = "8px";

        if (offer.coupon_code) {
          var codeBox = document.createElement("div");
          codeBox.textContent = offer.coupon_code;
          codeBox.style.fontSize = "13px";
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

        cardContent.appendChild(couponRow);
      }

      if (offer && (offer.coupon_expires_at || offer.ends_at)) {
        var ends = document.createElement("div");
        ends.style.fontSize = "11px";
        ends.style.color = "#9ca3af";
        var d = offer.coupon_expires_at || offer.ends_at;
        ends.textContent = "ينتهي العرض بتاريخ: " + d;
        cardContent.appendChild(ends);
      }

      card.appendChild(cardContent);
      slide.appendChild(card);
      wrapper.appendChild(slide);
      slider.appendChild(wrapper);
      box.appendChild(slider);

      // أزرار أسفل
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

      var currentProductId = offer && offer.product_id ? offer.product_id : null;
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
        if (offer && offer.product_url) {
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

    function fetchCheckTarget(customerId) {
      if (!PANEL_ORIGIN) return;

      var url =
        PANEL_ORIGIN +
        "/api/dashboard/price-drop/check-target" +
        "?store_id=" +
        encodeURIComponent(STORE_ID) +
        "&salla_customer_id=" +
        encodeURIComponent(customerId);

      fetch(url, { method: "GET" })
        .then(function (res) {
          return res.text().then(function (text) {
            var json = null;
            try { json = JSON.parse(text); } catch (e) {}
            console.log("[check-target]", res.status, json);

            if (res.ok && json && json.has_target) {
              if (json.campaign) {
                createPopup(json.campaign);
              } else {
                createPopup(null);
              }
            }
          });
        })
        .catch(function (e) {
          console.warn("[check-target] fetch error", e);
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
          fetchCheckTarget(cid);
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
