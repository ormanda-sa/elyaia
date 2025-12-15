// FILE: src/app/widgets-marketing-onsite.js/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge"; // تقدر تشيلها لو تبي Node

function escapeJs(str: string) {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // اختياري: تقدر تمررهم بالـ query:
  // /widgets-marketing-onsite.js?store_id=...&api_base=...
  const storeIdFromQuery = searchParams.get("store_id");
  const apiBaseFromQuery = searchParams.get("api_base");

  const js = `
(function () {
  const STORE_ID = ${
    storeIdFromQuery ? "`" + escapeJs(storeIdFromQuery) + "`" : "window.DARB_STORE_ID"
  };
  const API_BASE = ${
    apiBaseFromQuery ? "`" + escapeJs(apiBaseFromQuery) + "`" : "window.DARB_API_BASE"
  } || (location.origin);

  if (!STORE_ID) return;

  function getVisitorId() {
    const key = "darb_visitor_id";
    let v = localStorage.getItem(key);
    if (!v) {
      v = "v_" + Math.random().toString(16).slice(2) + Date.now().toString(16);
      localStorage.setItem(key, v);
    }
    return v;
  }

  async function apiCheck() {
    const visitor_id = getVisitorId();
    const path = location.pathname;
    const page_url = location.href;

    const url =
      API_BASE +
      "/api/widget/marketing/check?store_id=" +
      encodeURIComponent(STORE_ID) +
      "&visitor_id=" +
      encodeURIComponent(visitor_id) +
      "&path=" +
      encodeURIComponent(path) +
      "&page_url=" +
      encodeURIComponent(page_url);

    const res = await fetch(url, { method: "GET", credentials: "omit" });
    return res.json();
  }

  function postEvent(payload) {
    return fetch(API_BASE + "/api/widget/marketing/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }

  function renderPopup(campaign) {
    const wrap = document.createElement("div");
    wrap.style.cssText =
      "position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:16px;";

    const card = document.createElement("div");
    card.style.cssText =
      "width:min(420px,100%);background:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.25);padding:16px;direction:rtl;font-family:system-ui;";

    const h = document.createElement("div");
    h.style.cssText = "font-weight:700;font-size:16px;margin-bottom:8px;";
    h.textContent = campaign.headline || campaign.title;

    const p = document.createElement("div");
    p.style.cssText = "font-size:13px;line-height:1.6;color:#444;margin-bottom:12px;";
    p.textContent = campaign.body || "";

    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:8px;justify-content:flex-start;";

    const btn = document.createElement("button");
    btn.textContent = campaign.cta_text || "عرض";
    btn.style.cssText =
      "border:none;border-radius:12px;padding:10px 12px;background:#e5202a;color:#fff;font-weight:700;cursor:pointer;";

    const close = document.createElement("button");
    close.textContent = "إغلاق";
    close.style.cssText =
      "border:1px solid #ddd;border-radius:12px;padding:10px 12px;background:#fff;cursor:pointer;";

    const visitor_id = getVisitorId();

    btn.onclick = () => {
      postEvent({
        store_id: STORE_ID,
        campaign_id: campaign.id,
        visitor_id,
        event_type: "click",
        meta: { page_url: location.href }
      });
      if (campaign.cta_url) window.location.href = campaign.cta_url;
      document.body.removeChild(wrap);
    };

    close.onclick = () => {
      postEvent({
        store_id: STORE_ID,
        campaign_id: campaign.id,
        visitor_id,
        event_type: "close",
        meta: { page_url: location.href }
      });
      document.body.removeChild(wrap);
    };

    row.appendChild(btn);
    row.appendChild(close);

    card.appendChild(h);
    card.appendChild(p);
    card.appendChild(row);
    wrap.appendChild(card);
    document.body.appendChild(wrap);
  }

  function renderBar(campaign) {
    const bar = document.createElement("div");
    bar.style.cssText =
      "position:fixed;left:12px;right:12px;bottom:12px;z-index:999999;background:#111;color:#fff;border-radius:14px;padding:12px;direction:rtl;font-family:system-ui;display:flex;gap:10px;align-items:center;justify-content:space-between;";

    const text = document.createElement("div");
    text.style.cssText = "font-size:13px;line-height:1.4;";
    text.textContent = (campaign.headline || campaign.title) + (campaign.body ? " — " + campaign.body : "");

    const btn = document.createElement("button");
    btn.textContent = campaign.cta_text || "عرض";
    btn.style.cssText =
      "border:none;border-radius:12px;padding:10px 12px;background:#e5202a;color:#fff;font-weight:700;cursor:pointer;white-space:nowrap;";

    const x = document.createElement("button");
    x.textContent = "✕";
    x.style.cssText =
      "border:none;background:transparent;color:#fff;font-size:16px;cursor:pointer;opacity:.8;";

    const visitor_id = getVisitorId();

    btn.onclick = () => {
      postEvent({ store_id: STORE_ID, campaign_id: campaign.id, visitor_id, event_type: "click" });
      if (campaign.cta_url) window.location.href = campaign.cta_url;
      bar.remove();
    };

    x.onclick = () => {
      postEvent({ store_id: STORE_ID, campaign_id: campaign.id, visitor_id, event_type: "close" });
      bar.remove();
    };

    bar.appendChild(text);
    bar.appendChild(btn);
    bar.appendChild(x);
    document.body.appendChild(bar);
  }

  apiCheck()
    .then((r) => {
      if (!r || !r.show || !r.campaign) return;
      if (r.campaign.variant === "bar") renderBar(r.campaign);
      else renderPopup(r.campaign);
    })
    .catch(() => {});
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
