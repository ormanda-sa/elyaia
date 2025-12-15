import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(_req: NextRequest) {
  const js = `
(function () {
  try {
    function getSelfScript() {
      try {
        if (document.currentScript) return document.currentScript;
        var scripts = document.getElementsByTagName("script");
        return scripts[scripts.length - 1] || null;
      } catch (e) {
        return null;
      }
    }

    var self = getSelfScript();
    var STORE_ID =
      (self && (self.getAttribute("data-store-id") || (self.dataset && self.dataset.storeId))) ||
      (window.DARB_STORE_ID || "");

    var API_BASE =
      (self && (self.getAttribute("data-api-base") || (self.dataset && self.dataset.apiBase))) ||
      (window.DARB_API_BASE || "https://elyaia.vercel.app");

    if (!STORE_ID) return;

    var OVERLAY_ID = "darb_mkt_overlay";
    var BAR_ID = "darb_mkt_bar";
    var lastUrl = "";

    function removeUI() {
      var o = document.getElementById(OVERLAY_ID);
      if (o && o.parentNode) o.parentNode.removeChild(o);
      var b = document.getElementById(BAR_ID);
      if (b && b.parentNode) b.parentNode.removeChild(b);
    }

    function getVisitorId() {
      var key = "darb_visitor_id";
      var v = localStorage.getItem(key);
      if (!v) {
        v = "v_" + Math.random().toString(16).slice(2) + Date.now().toString(16);
        localStorage.setItem(key, v);
      }
      return v;
    }

    function normalizePath(p) {
      try {
        return (p || "/").split("?")[0].split("#")[0] || "/";
      } catch (e) {
        return "/";
      }
    }

    async function apiCheck() {
      var visitor_id = getVisitorId();
      var path = normalizePath(location.pathname);
      var page_url = location.href;

      var url =
        API_BASE +
        "/api/widget/marketing/check?store_id=" +
        encodeURIComponent(STORE_ID) +
        "&visitor_id=" +
        encodeURIComponent(visitor_id) +
        "&path=" +
        encodeURIComponent(path) +
        "&page_url=" +
        encodeURIComponent(page_url);

      var res = await fetch(url, { method: "GET", credentials: "omit" });
      return res.json();
    }

    function postEvent(payload) {
      return fetch(API_BASE + "/api/widget/marketing/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(function () {});
    }

    function renderPopup(campaign) {
      removeUI();

      var wrap = document.createElement("div");
      wrap.id = OVERLAY_ID;
      wrap.style.cssText =
        "position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:16px;";

      var card = document.createElement("div");
      card.style.cssText =
        "width:min(520px,100%);background:#fff;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.25);padding:18px;direction:rtl;font-family:system-ui;";

      var h = document.createElement("div");
      h.style.cssText = "font-weight:800;font-size:16px;margin-bottom:10px;";
      h.textContent = campaign.headline || campaign.title || "";

      var p = document.createElement("div");
      p.style.cssText = "font-size:13px;line-height:1.7;color:#444;margin-bottom:14px;";
      p.textContent = campaign.body || "";

      var row = document.createElement("div");
      row.style.cssText = "display:flex;gap:10px;justify-content:flex-start;";

      var btn = document.createElement("button");
      btn.textContent = campaign.cta_text || "عرض";
      btn.style.cssText =
        "border:none;border-radius:12px;padding:10px 14px;background:#e5202a;color:#fff;font-weight:800;cursor:pointer;";

      var close = document.createElement("button");
      close.textContent = "إغلاق";
      close.style.cssText =
        "border:1px solid #ddd;border-radius:12px;padding:10px 14px;background:#fff;cursor:pointer;";

      var visitor_id = getVisitorId();

      btn.onclick = function () {
        postEvent({ store_id: STORE_ID, campaign_id: campaign.id, visitor_id: visitor_id, event_type: "click", meta: { page_url: location.href } });
        if (campaign.cta_url) location.href = campaign.cta_url;
        removeUI();
      };

      close.onclick = function () {
        postEvent({ store_id: STORE_ID, campaign_id: campaign.id, visitor_id: visitor_id, event_type: "close", meta: { page_url: location.href } });
        removeUI();
      };

      row.appendChild(btn);
      row.appendChild(close);

      card.appendChild(h);
      if (campaign.body) card.appendChild(p);
      card.appendChild(row);

      wrap.appendChild(card);
      document.body.appendChild(wrap);
    }

    function renderBar(campaign) {
      removeUI();

      var bar = document.createElement("div");
      bar.id = BAR_ID;
      bar.style.cssText =
        "position:fixed;left:12px;right:12px;bottom:12px;z-index:999999;background:#111;color:#fff;border-radius:14px;padding:12px;direction:rtl;font-family:system-ui;display:flex;gap:10px;align-items:center;justify-content:space-between;";

      var text = document.createElement("div");
      text.style.cssText = "font-size:13px;line-height:1.4;";
      text.textContent = (campaign.headline || campaign.title || "") + (campaign.body ? " — " + campaign.body : "");

      var btn = document.createElement("button");
      btn.textContent = campaign.cta_text || "عرض";
      btn.style.cssText =
        "border:none;border-radius:12px;padding:10px 12px;background:#e5202a;color:#fff;font-weight:800;cursor:pointer;white-space:nowrap;";

      var x = document.createElement("button");
      x.textContent = "✕";
      x.style.cssText =
        "border:none;background:transparent;color:#fff;font-size:16px;cursor:pointer;opacity:.8;";

      var visitor_id = getVisitorId();

      btn.onclick = function () {
        postEvent({ store_id: STORE_ID, campaign_id: campaign.id, visitor_id: visitor_id, event_type: "click" });
        if (campaign.cta_url) location.href = campaign.cta_url;
        removeUI();
      };

      x.onclick = function () {
        postEvent({ store_id: STORE_ID, campaign_id: campaign.id, visitor_id: visitor_id, event_type: "close" });
        removeUI();
      };

      bar.appendChild(text);
      bar.appendChild(btn);
      bar.appendChild(x);
      document.body.appendChild(bar);
    }

    async function runCheck() {
      try {
        var r = await apiCheck();
        if (!r || !r.show || !r.campaign) {
          removeUI();
          return;
        }
        if (r.campaign.variant === "bar") renderBar(r.campaign);
        else renderPopup(r.campaign);
      } catch (e) {
        // ignore
      }
    }

    // أول تشغيل
    lastUrl = location.href;
    runCheck();

    // ✅ مراقبة تغيّر الرابط بدون Refresh (سلة)
    setInterval(function () {
      try {
        if (location.href === lastUrl) return;
        lastUrl = location.href;
        runCheck();
      } catch (e) {}
    }, 800);
  } catch (e) {}
})();
`;

  return new NextResponse(js, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}
