// FILE: src/app/widgets-price-drop.js/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const js = `
// widgets-price-drop.js — multi offers slider + countdown + funnel events
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

    function startCountdown(root, endIso) {
      if (!endIso) return;
      var end = new Date(endIso).getTime();
      if (!isFinite(end)) return;

      function update() {
        var now = Date.now();
        var diff = end - now;
        if (diff < 0) diff = 0;

        var totalSeconds = Math.floor(diff / 1000);
        var days = Math.floor(totalSeconds / 86400);
        var hours = Math.floor((totalSeconds % 86400) / 3600);
        var mins = Math.floor((totalSeconds % 3600) / 60);
        var secs = totalSeconds % 60;

        var dEl = root.querySelector("[data-tt='d']");
        var hEl = root.querySelector("[data-tt='h']");
        var mEl = root.querySelector("[data-tt='m']");
        var sEl = root.querySelector("[data-tt='s']");

        if (dEl) dEl.textContent = String(days).padStart(2, "0");
        if (hEl) hEl.textContent = String(hours).padStart(2, "0");
        if (mEl) mEl.textContent = String(mins).padStart(2, "0");
        if (sEl) sEl.textContent = String(secs).padStart(2, "0");
      }

      update();
      setInterval(update, 1000);
    }

    function createPopup(offers) {
      if (!offers || !offers.length) return;

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
      box.style.maxWidth = "720px";
      box.style.width = "100%";
      box.style.fontFamily =
        "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      box.style.boxShadow = "0 24px 80px rgba(15,23,42,0.45)";

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
        "عندك عروض خصم مخصصة على منتجات شفتها قبل، شوف تفاصيل العروض تحت:";
      box.appendChild(headerSub);

      var slider = document.createElement("div");
      slider.className = "s-slider-container darb-price-drop-slider";
      slider.style.display = "flex";
      slider.style.gap = "12px";
      slider.style.overflowX = "auto";
      slider.style.padding = "4px 2px 8px";
      slider.style.marginBottom = "10px";

      for (var i = 0; i < offers.length; i++) {
        (function (offer) {
          var card = document.createElement("div");
          card.style.minWidth = "220px";
          card.style.maxWidth = "240px";
          card.style.background = "#f9fafb";
          card.style.borderRadius = "14px";
          card.style.border = "1px solid #e5e7eb";
          card.style.padding = "10px";
          card.style.display = "flex";
          card.style.flexDirection = "column";
          card.style.gap = "6px";
          card.style.alignItems = "stretch";

          // صورة كبيرة فوق
          if (offer.product_image_url) {
            var imgWrap = document.createElement("div");
            imgWrap.style.width = "100%";
            imgWrap.style.height = "188px";
            imgWrap.style.borderRadius = "12px";
            imgWrap.style.overflow = "hidden";
            imgWrap.style.background = "#f3f4f6";
            imgWrap.style.flexShrink = "0";

            var img = document.createElement("img");
            img.src = offer.product_image_url;
            img.alt = offer.product_title || "";
            img.style.width = "100%";
            img.style.height = "100%";
            img.style.objectFit = "cover";

            imgWrap.appendChild(img);
            card.appendChild(imgWrap);
          }

          // العنوان تحت الصورة
          if (offer.product_title) {
            var pTitle = document.createElement("div");
            pTitle.textContent = offer.product_title;
            pTitle.style.fontSize = "13px";
            pTitle.style.fontWeight = "600";
            pTitle.style.color = "#111827";
            pTitle.style.marginTop = "6px";
            card.appendChild(pTitle);
          }

          var typeLabel = document.createElement("div");
          typeLabel.style.fontSize = "11px";
          typeLabel.style.color = "#6b7280";
          if (offer.discount_type === "coupon") {
            typeLabel.textContent = "عرض كوبون خصم";
          } else {
            typeLabel.textContent = "عرض خصم على سعر المنتج";
          }
          card.appendChild(typeLabel);

          // السعر
          var priceRow = document.createElement("div");
          priceRow.style.display = "flex";
          priceRow.style.alignItems = "baseline";
          priceRow.style.gap = "6px";

          var currentFormatted = formatPrice(
            offer.current_price != null
              ? offer.current_price
              : offer.new_price != null
              ? offer.new_price
              : null,
          );

          if (currentFormatted) {
            var currentPriceText = document.createElement("div");
            currentPriceText.textContent = currentFormatted + " ر.س";
            currentPriceText.style.fontSize = "15px";
            currentPriceText.style.fontWeight = "700";
            currentPriceText.style.color = "#e11d48";
            priceRow.appendChild(currentPriceText);
          }

          if (offer.discount_type === "price") {
            var oldFormatted = formatPrice(offer.original_price);
            if (oldFormatted) {
              var oldPriceText = document.createElement("div");
              oldPriceText.textContent = oldFormatted + " ر.س";
              oldPriceText.style.fontSize = "11px";
              oldPriceText.style.color = "#6b7280";
              oldPriceText.style.textDecoration = "line-through";
              priceRow.appendChild(oldPriceText);
            }
          }

          if (offer.discount_percent) {
            var badge = document.createElement("div");
            badge.textContent = "خصم " + String(offer.discount_percent) + "%";
            badge.style.marginLeft = "auto";
            badge.style.fontSize = "11px";
            badge.style.padding = "2px 8px";
            badge.style.borderRadius = "999px";
            badge.style.background = "#fee2e2";
            badge.style.color = "#b91c1c";
            priceRow.appendChild(badge);
          }

          if (priceRow.children.length > 0) {
            card.appendChild(priceRow);
          }

          // كوبون
          if (offer.discount_type === "coupon" && offer.coupon_code) {
            var cpLabel = document.createElement("div");
            cpLabel.textContent = "كوبون الخصم:";
            cpLabel.style.fontSize = "11px";
            cpLabel.style.color = "#4b5563";
            card.appendChild(cpLabel);

            var cpRow = document.createElement("div");
            cpRow.style.display = "flex";
            cpRow.style.alignItems = "center";
            cpRow.style.gap = "6px";

            var codeBtn = document.createElement("button");
            codeBtn.type = "button";
            codeBtn.textContent = offer.coupon_code;
            codeBtn.style.fontSize = "12px";
            codeBtn.style.fontWeight = "700";
            codeBtn.style.letterSpacing = "0.12em";
            codeBtn.style.padding = "4px 10px";
            codeBtn.style.borderRadius = "999px";
            codeBtn.style.border = "1px dashed #e11d48";
            codeBtn.style.background = "#fff1f2";
            codeBtn.style.color = "#b91c1c";
            codeBtn.style.cursor = "pointer";

            codeBtn.addEventListener("click", function () {
              try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(offer.coupon_code);
                }
              } catch (e) {}
              var old = codeBtn.textContent;
              codeBtn.textContent = "تم النسخ";
              setTimeout(function () {
                codeBtn.textContent = old;
              }, 1500);
            });

            cpRow.appendChild(codeBtn);

            if (offer.discount_percent) {
              var cpBadge = document.createElement("div");
              cpBadge.textContent = "خصم " + String(offer.discount_percent) + "%";
              cpBadge.style.fontSize = "11px";
              cpBadge.style.color = "#b91c1c";
              cpRow.appendChild(cpBadge);
            }

            card.appendChild(cpRow);
          }

          // التايمر
          if (offer.coupon_expires_at || offer.ends_at) {
            var timerRoot = document.createElement("div");
            timerRoot.style.display = "flex";
            timerRoot.style.gap = "4px";
            timerRoot.style.marginTop = "6px";

            function makeBox(label, attr) {
              var wrap = document.createElement("div");
              wrap.style.display = "flex";
              wrap.style.flexDirection = "column";
              wrap.style.alignItems = "center";
              wrap.style.fontSize = "9px";

              var num = document.createElement("div");
              num.setAttribute("data-tt", attr);
              num.textContent = "00";
              num.style.background = "#ef4444";
              num.style.color = "#ffffff";
              num.style.padding = "2px 6px";
              num.style.borderRadius = "6px";
              num.style.fontSize = "11px";
              num.style.fontWeight = "600";
              num.style.minWidth = "32px";
              num.style.textAlign = "center";

              var lab = document.createElement("div");
              lab.textContent = label;
              lab.style.color = "#6b7280";
              lab.style.marginTop = "1px";

              wrap.appendChild(num);
              wrap.appendChild(lab);
              return wrap;
            }

            timerRoot.appendChild(makeBox("أيام", "d"));
            timerRoot.appendChild(makeBox("ساعات", "h"));
            timerRoot.appendChild(makeBox("دقائق", "m"));
            timerRoot.appendChild(makeBox("ثواني", "s"));

            card.appendChild(timerRoot);

            startCountdown(
              timerRoot,
              offer.coupon_expires_at || offer.ends_at,
            );
          }

          // زر عرض المنتج داخل البطاقة
          var cardBtnRow = document.createElement("div");
          cardBtnRow.style.display = "flex";
          cardBtnRow.style.marginTop = "8px";

          var viewBtn = document.createElement("button");
          viewBtn.type = "button";
          viewBtn.textContent = "عرض المنتج";
          viewBtn.style.flex = "1";
          viewBtn.style.padding = "6px 8px";
          viewBtn.style.borderRadius = "8px";
          viewBtn.style.border = "none";
          viewBtn.style.background = "#e11d48";
          viewBtn.style.color = "#ffffff";
          viewBtn.style.cursor = "pointer";
          viewBtn.style.fontSize = "13px";
          viewBtn.style.fontWeight = "600";

          viewBtn.addEventListener("click", function () {
            try { sendPopupEvent("click", offer.product_id); } catch (e) {}
            if (offer.product_url) {
              try { window.location.href = offer.product_url; } catch (e) {}
            }
          });

          cardBtnRow.appendChild(viewBtn);
          card.appendChild(cardBtnRow);

          slider.appendChild(card);
        })(offers[i]);
      }

      box.appendChild(slider);

      var btnRow = document.createElement("div");
      btnRow.style.display = "flex";
      btnRow.style.gap = "8px";
      btnRow.style.marginTop = "10px";

      var spacer = document.createElement("div");
      spacer.style.flex = "1";
      btnRow.appendChild(spacer);

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

      btnRow.appendChild(closeBtn);
      box.appendChild(btnRow);

      overlay.appendChild(box);
      document.body.appendChild(overlay);

      var firstProductId =
        offers[0] && offers[0].product_id ? offers[0].product_id : null;
      try { sendPopupEvent("impression", firstProductId); } catch (e) {}

      function closePopup() {
        try { sendPopupEvent("close", firstProductId); } catch (e) {}
        overlay.remove();
      }

      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closePopup();
      });

      closeBtn.addEventListener("click", function () {
        closePopup();
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

    function fetchMultiOffers(customerId) {
      if (!PANEL_ORIGIN) return;

      var url =
        PANEL_ORIGIN +
        "/api/dashboard/price-drop/multi-offers" +
        "?store_id=" +
        encodeURIComponent(STORE_ID) +
        "&salla_customer_id=" +
        encodeURIComponent(customerId);

      fetch(url, { method: "GET" })
        .then(function (res) {
          return res.text().then(function (text) {
            var json = null;
            try { json = JSON.parse(text); } catch (e) {}
            console.log("[multi-offers]", res.status, json);

            if (res.ok && json && json.has_offers && json.offers) {
              createPopup(json.offers);
            }
          });
        })
        .catch(function (e) {
          console.warn("[multi-offers] fetch error", e);
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
          fetchMultiOffers(cid);
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
