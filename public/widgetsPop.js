// FILE: widgetsPop.js (تحطه في الثيم أو سكربت خارجي)

(function () {
  // TODO: غيّر هذي القيم من الثيم نفسه
  const STORE_ID = window.SALLA_STORE_ID; // أو أي متغير عندك
  const CUSTOMER_ID = window.SALLA_CUSTOMER_ID || null;
  const PRODUCT_ID = window.SALLA_PRODUCT_ID; // رقم/معرّف المنتج الحالي
  const WIDGET_SECRET = window.WIDGET_EVENT_SECRET; // تحطه كـ data-attr أو ثابت

  if (!STORE_ID || !PRODUCT_ID) {
    return;
  }

  // لو ما عندنا عميل معروف، تقدر تختار:
  // - يا تتجاهل العرض
  // - يا تستخدم session_id بدلًا عنه (بس حالياً بنلتزم بالمسجلين فقط)
  if (!CUSTOMER_ID) {
    return;
  }

  async function fetchEligible() {
    const res = await fetch("/api/widget/price-drop/onsite/eligible", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-widget-secret": WIDGET_SECRET,
      },
      body: JSON.stringify({
        store_id: STORE_ID,
        product_id: String(PRODUCT_ID),
        salla_customer_id: String(CUSTOMER_ID),
      }),
    });

    if (!res.ok) {
      console.warn("eligible failed", await res.text());
      return null;
    }

    const json = await res.json();
    if (!json.eligible) return null;

    return json; // { eligible: true, target_id, campaign }
  }

  async function sendEvent(eventType, extra) {
    try {
      const payload = {
        store_id: STORE_ID,
        campaign_id: extra.campaign_id,
        product_id: String(PRODUCT_ID),
        target_id: extra.target_id,
        salla_customer_id: String(CUSTOMER_ID),
        event_type: eventType,
        cart_id: extra.cart_id ?? null,
        order_id: extra.order_id ?? null,
      };

      await fetch("/api/widget/price-drop/onsite/event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-widget-secret": WIDGET_SECRET,
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.warn("sendEvent error", e);
    }
  }

  function createPopup(campaign, targetId) {
    // عنصر الغطاء (خلفية شفافة)
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(15,23,42,0.55)";
    overlay.style.zIndex = "99999";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.dir = "rtl";

    // الكرت
    const box = document.createElement("div");
    box.style.background = "#fff";
    box.style.borderRadius = "12px";
    box.style.padding = "16px";
    box.style.maxWidth = "360px";
    box.style.width = "100%";
    box.style.boxShadow = "0 20px 60px rgba(15,23,42,0.35)";
    box.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

    const title = document.createElement("div");
    title.textContent = "نزل سعر المنتج اللي شفته 👀";
    title.style.fontSize = "16px";
    title.style.fontWeight = "600";
    title.style.marginBottom = "6px";

    const name = document.createElement("div");
    name.textContent = campaign.product_title || "المنتج";
    name.style.fontSize = "14px";
    name.style.marginBottom = "4px";

    const priceLine = document.createElement("div");
    priceLine.style.fontSize = "13px";
    priceLine.style.marginBottom = "8px";

    const original = campaign.original_price
      ? Number(campaign.original_price)
      : null;
    const newPrice = campaign.new_price ? Number(campaign.new_price) : null;
    const percent = campaign.discount_percent
      ? Number(campaign.discount_percent)
      : null;

    let priceText = "";
    if (original && newPrice) {
      priceText = `من ${original} إلى ${newPrice}`;
    } else if (percent && original) {
      priceText = `خصم ${percent}%`;
    } else if (percent) {
      priceText = `خصم ${percent}%`;
    } else {
      priceText = "عليك عرض خاص الآن";
    }
    priceLine.textContent = priceText;

    const btnRow = document.createElement("div");
    btnRow.style.display = "flex";
    btnRow.style.gap = "8px";
    btnRow.style.marginTop = "8px";

    const goBtn = document.createElement("button");
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

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "لاحقًا";
    closeBtn.style.flex = "0 0 auto";
    closeBtn.style.padding = "8px 10px";
    closeBtn.style.borderRadius = "8px";
    closeBtn.style.border = "1px solid #cbd5f5";
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

    // ◀️ الأحداث

    // أول ما ينعرض → impression
    sendEvent("impression", {
      campaign_id: campaign.id,
      target_id: targetId,
    });

    // إغلاق
    function closePopup() {
      overlay.remove();
    }

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closePopup();
      }
    });

    closeBtn.addEventListener("click", () => {
      closePopup();
    });

    // الذهاب للمنتج
    goBtn.addEventListener("click", () => {
      sendEvent("click", {
        campaign_id: campaign.id,
        target_id: targetId,
      });

      if (campaign.product_url) {
        window.location.href = campaign.product_url;
      } else {
        closePopup();
      }
    });
  }

  async function init() {
    try {
      const eligible = await fetchEligible();
      if (!eligible || !eligible.eligible) {
        return;
      }

      const { campaign, target_id } = eligible;
      createPopup(campaign, target_id);
    } catch (e) {
      console.warn("widget price-drop init error", e);
    }
  }

  // تشغيل بعد تحميل الصفحة
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
