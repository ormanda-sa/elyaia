// FILE: src/app/widgets-price-drop.js/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const js = `
// widgets-price-drop.js — Check target + simple popup + funnel events
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

    function createPopup() {
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
      box.style.borderRadius = "12px";
      box.style.padding = "16px";
      box.style.maxWidth = "360px";
      box.style.width = "100%";
      box.style.fontFamily =
        "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      box.style.boxShadow = "0 20px 60px rgba(15,23,42,0.35)";

      var title = document.createElement("div");
      title.textContent = "نزل سعر منتج شفته قبل 👀";
      title.style.fontSize = "16px";
      title.style.fontWeight = "600";
      title.style.marginBottom = "6px";

      var desc = document.createElement("div");
      desc.textContent =
        "عندك عرض خصم مخصص على منتج شفته من قبل، اضغط روح للمنتج وشوف التفاصيل.";
      desc.style.fontSize = "13px";
      desc.style.marginBottom = "10px";

      var btnRow = document.createElement("div");
      btnRow.style.display = "flex";
      btnRow.style.gap = "8px";

      var goBtn = document.createElement("button");
      goBtn.textContent = "روح للمنتج";
      goBtn.style.flex = "1";
      goBtn.style.padding = "8px 10px";
      goBtn.style.borderRadius = "6px";
      goBtn.style.border = "none";
      goBtn.style.background = "red";
      goBtn.style.color = "#ffffff";
      goBtn.style.cursor = "pointer";
      goBtn.style.fontSize = "14px";
      goBtn.style.fontWeight = "500";

      var closeBtn = document.createElement("button");
      closeBtn.textContent = "لاحقًا";
      closeBtn.style.flex = "0 0 auto";
      closeBtn.style.padding = "8px 10px";
      closeBtn.style.borderRadius = "6px";
      closeBtn.style.border = "1px solid #e5e7eb";
      closeBtn.style.background = "#ffffff";
      closeBtn.style.color = "#111827";
      closeBtn.style.cursor = "pointer";
      closeBtn.style.fontSize = "13px";

      btnRow.appendChild(goBtn);
      btnRow.appendChild(closeBtn);

      box.appendChild(title);
      box.appendChild(desc);
      box.appendChild(btnRow);

      overlay.appendChild(box);
      document.body.appendChild(overlay);

      try { sendPopupEvent("impression", null); } catch (e) {}

      function closePopup() {
        try { sendPopupEvent("close", null); } catch (e) {}
        overlay.remove();
      }

      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closePopup();
      });

      closeBtn.addEventListener("click", function () {
        closePopup();
      });

      goBtn.addEventListener("click", function () {
        try { sendPopupEvent("click", null); } catch (e) {}
        // TODO: لاحقًا نجيب رابط المنتج من API الحملة
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
              createPopup();
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
