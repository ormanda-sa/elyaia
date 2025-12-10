// FILE: src/app/widgets-price-drop.js/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const js = `
// widgets-price-drop.js — Price Drop Popup (simple eligible)
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

    function createPopup(campaign) {
      var overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.background = "rgba(15,23,42,0.55)";
      overlay.style.zIndex = "99999";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.dir = "rtl";

      var box = document.createElement("div");
      box.style.background = "#fff";
      box.style.borderRadius = "12px";
      box.style.padding = "16px";
      box.style.maxWidth = "360px";
      box.style.width = "100%";
      box.style.boxShadow = "0 20px 60px rgba(15,23,42,0.35)";
      box.style.fontFamily =
        "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

      var title = document.createElement("div");
      title.textContent = "نزل سعر المنتج اللي شفته 👀";
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
      goBtn.style.borderRadius = "8px";
      goBtn.style.border = "none";
      goBtn.style.background = "#e5202a";
      goBtn.style.color = "#fff";
      goBtn.style.cursor = "pointer";
      goBtn.style.fontSize = "14px";
      goBtn.style.fontWeight = "500";

      var closeBtn = document.createElement("button");
      closeBtn.textContent = "لاحقًا";
      closeBtn.style.flex = "0 0 auto";
      closeBtn.style.padding = "8px 10px";
      closeBtn.style.borderRadius = "8px";
      closeBtn.style.border = "1px solid "#cbd5f5";
      closeBtn.style.background = "#fff";
      closeBtn.style.color = "#334155";
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

      function closePopup() { overlay.remove(); }

      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closePopup();
      });

      closeBtn.addEventListener("click", function () { closePopup(); });

      goBtn.addEventListener("click", function () {
        if (campaign.product_url) {
          window.location.href = campaign.product_url;
        } else {
          closePopup();
        }
      });
    }

    function getDetailFromDataLayerOnce() {
      var dl = window.dataLayer || [];
      for (var i = dl.length - 1; i >= 0; i--) {
        var ev = dl[i];
        if (!ev) continue;
        if (
          ev.event === "detail" &&
          ev.ecommerce &&
          ev.ecommerce.detail &&
          ev.ecommerce.detail.products &&
          ev.ecommerce.detail.products.length > 0 &&
          ev.customer
        ) {
          var product = ev.ecommerce.detail.products[0];
          var customer = ev.customer;

          if (customer.isGuest) return null; // ضيف → لا شيء

          var productId = product.id;
          if (!productId) return null;

          return String(productId);
        }
      }
      return null;
    }

    function waitForDetailAndRun(maxTries) {
      var tries = 0;
      var timer = setInterval(function () {
        tries++;
        var productId = getDetailFromDataLayerOnce();
        if (productId) {
          clearInterval(timer);
          fetchSimpleEligible(productId);
        } else if (tries >= maxTries) {
          clearInterval(timer);
        }
      }, 500);
    }

    function fetchSimpleEligible(productId) {
      fetch("/api/widget/price-drop/onsite/simple-eligible", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-widget-secret": WIDGET_SECRET
        },
        body: JSON.stringify({
          salla_store_id: String(sallaStoreId),
          product_id: String(productId)
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
      waitForDetailAndRun(10); // يحاول 5 ثواني
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentDOMContentLoaded", init);
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
