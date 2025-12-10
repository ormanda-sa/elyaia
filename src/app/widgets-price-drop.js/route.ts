// FILE: src/app/widgets-price-drop.js/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const js = `
// widgets-price-drop.js — Popup by customer (any page)
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

    // نحدد origin حق البانل عشان الـ fetch ما يروح على متجر درب
    var PANEL_ORIGIN = "";
    try {
      var src = script.getAttribute("src") || "";
      var u = new URL(src, window.location.href);
      PANEL_ORIGIN = u.origin;
    } catch (e) {
      PANEL_ORIGIN = "";
    }

    function createPopup(campaign) {
      var overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.top = "0";
      overlay.style.left = "0";
      overlay.style.right = "0";
      overlay.style.bottom = "0";
      overlay.style.background = "rgba(0,0,0,0.4)";
      overlay.style.zIndex = "99999";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.dir = "rtl";

      var box = document.createElement("div");
      box.style.background = "#ffffff";
      box.style.borderRadius = "10px";
      box.style.padding = "16px";
      box.style.maxWidth = "360px";
      box.style.width = "100%";
      box.style.fontFamily =
        "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

      var title = document.createElement("div");
      title.textContent = "نزل سعر منتج شفته قبل 👀";
      title.style.fontSize = "16px";
      title.style.fontWeight = "600";
      title.style.marginBottom = "6px";

      var name = document.createElement("div");
      name.textContent = campaign.product_title || "المنتج";
      name.style.fontSize = "14px";
      name.style.marginBottom = "4px";

      var priceLine = document.createElement("div");
      priceLine.style.fontSize = "13px";
      priceLine.style.marginBottom = "8px";

      var original = campaign.original_price
        ? Number(campaign.original_price)
        : null;
      var newPrice = campaign.new_price ? Number(campaign.new_price) : null;
      var percent = campaign.discount_percent
        ? Number(campaign.discount_percent)
        : null;

      var priceText = "";
      if (original && newPrice) {
        priceText = "من " + original + " إلى " + newPrice;
      } else if (percent && original) {
        priceText = "خصم " + percent + "%";
      } else if (percent) {
        priceText = "خصم " + percent + "%";
      } else {
        priceText = "عليك عرض خاص الآن";
      }
      priceLine.textContent = priceText;

      var btnRow = document.createElement("div");
      btnRow.style.display = "flex";
      btnRow.style.gap = "8px";
      btnRow.style.marginTop = "8px";

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
      closeBtn.style.border = "1px solid gray";
      closeBtn.style.background = "#ffffff";
      closeBtn.style.color = "black";
      closeBtn.style.cursor = "pointer";
      closeBtn.style.fontSize = "13px";

      btnRow.appendChild(goBtn);
      btnRow.appendChild(closeBtn);

      box.appendChild(title);
      box.appendChild(name);
      box.appendChild(priceLine);
      box.appendChild(btnRow);

      overlay.appendChild(box);
      document.body.appendChild(overlay);

      function closePopup() {
        overlay.remove();
      }

      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closePopup();
      });

      closeBtn.addEventListener("click", function () {
        closePopup();
      });

      goBtn.addEventListener("click", function () {
        if (campaign.product_url) {
          window.location.href = campaign.product_url;
        } else {
          closePopup();
        }
      });
    }

    // نجيب بيانات العميل من dataLayer (نفس فورم اللي أرسلته)
    function getCustomerIdFromDataLayer() {
      var dl = window.dataLayer || [];
      for (var i = dl.length - 1; i >= 0; i--) {
        var ev = dl[i];
        if (!ev) continue;
        if (ev.customer) {
          var c = ev.customer;
          if (c.isGuest) return null; // ضيف → لا شيء
          var cid = c.email_hashed || c.phone_hashed || null;
          if (!cid) return null;
          return String(cid);
        }
      }
      return null;
    }

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

    function fetchByCustomer(customerId) {
      if (!PANEL_ORIGIN) return;

      fetch(PANEL_ORIGIN + "/api/widget/price-drop/onsite/by-customer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-widget-secret": WIDGET_SECRET
        },
        body: JSON.stringify({
          salla_store_id: String(sallaStoreId),
          salla_customer_id: String(customerId)
        })
      })
        .then(function (res) {
          return res.text().then(function (text) {
            var json = null;
            try { json = JSON.parse(text); } catch (e) {}
            if (!res.ok || !json || !json.eligible) return;
            createPopup(json.campaign);
          });
        })
        .catch(function () {});
    }

    function init() {
      // يشتغل في أي صفحة، المهم العميل يكون مسجل
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
