// FILE: src/app/widgets-price-drop.js/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const js = `
// widgets-price-drop.js — check target only (no popup yet)
(function () {
  try {
    var script =
      document.currentScript ||
      (function () {
        var scripts = document.getElementsByTagName("script");
        return scripts[scripts.length - 1];
      })();

    if (!script) return;

    var sallaStoreId = script.getAttribute("data-store-id");
    if (!sallaStoreId) return;

    var WIDGET_SECRET = script.getAttribute("data-event-secret") || "";

    // نحدد origin حق البانل من src (elyaia.vercel.app)
    var PANEL_ORIGIN = "";
    try {
      var src = script.getAttribute("src") || "";
      var u = new URL(src, window.location.href);
      PANEL_ORIGIN = u.origin;
    } catch (e) {
      PANEL_ORIGIN = "";
    }

    // نجيب ID العميل من dataLayer (email_hashed / phone_hashed)
    function getCustomerIdFromDataLayer() {
      var dl = window.dataLayer || [];
      for (var i = dl.length - 1; i >= 0; i--) {
        var ev = dl[i];
        if (!ev || !ev.customer) continue;
        var c = ev.customer;
        if (c.isGuest) return null; // ضيف → مو هدفنا الآن
        var cid = c.email_hashed || c.phone_hashed || null;
        if (!cid) return null;
        return String(cid);
      }
      return null;
    }

    // ينادي API check-target
   function fetchByCustomer(customerId) {
  if (!PANEL_ORIGIN) return;

  var url =
    PANEL_ORIGIN +
    "/api/dashboard/price-drop/check-target" +   // 👈 هنا
    "?salla_store_id=" +
    encodeURIComponent(String(sallaStoreId)) +
    "&salla_customer_id=" +
    encodeURIComponent(String(customerId));

  fetch(url, {
    method: "GET",
  })
    .then(function (res) {
      return res.text().then(function (text) {
        var json = null;
        try { json = JSON.parse(text); } catch (e) {}

        console.log("[check-target]", res.status, json);

        if (res.ok && json && json.has_target) {
          console.log("نعم");
        }
      });
    })
    .catch(function (e) {
      console.warn("[check-target] fetch error", e);
    });
}



    // ننتظر dataLayer لين يجهز
    function waitForCustomerAndRun(maxTries) {
      var tries = 0;
      var timer = setInterval(function () {
        tries++;
        var cid = getCustomerIdFromDataLayer();
        if (cid) {
          clearInterval(timer);
          fetchByCustomer(cid);
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
