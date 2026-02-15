// src/app/widgets-mobile.jsT2/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const js = `

(function () {
  try {

    var script =
      document.currentScript ||
      (function () {
        var scripts = document.getElementsByTagName("script");
        return scripts[scripts.length - 1];
      })();

    if (!script) return;

    var storeId = script.getAttribute("data-store-id");
    if (!storeId) return;

    var WIDGET_SECRET = script.getAttribute("data-event-secret") || "";

    var PANEL_ORIGIN = "";
    try {
      var src = script.getAttribute("src") || "";
      var u = new URL(src, window.location.href);
      PANEL_ORIGIN = u.origin;
    } catch (_) {}

    var API_BASE = (PANEL_ORIGIN || "") + "/api/widget";
    var SNAPSHOT_BASE = (PANEL_ORIGIN || "") + "/api/widget-data";

    async function fetchJson(url, options) {
      var res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        ...(options || {}),
      });
      if (!res.ok) throw new Error("Request failed: " + res.status);
      return res.json();
    }

    var SNAPSHOT = null;

    async function ensureSnapshot(storeId) {
      if (SNAPSHOT) return SNAPSHOT;

      var url =
        SNAPSHOT_BASE +
        "/" +
        encodeURIComponent(storeId) +
        ".json";

      try {
        var res = await fetch(url, { credentials: "omit" });
        if (!res.ok) throw new Error();
        SNAPSHOT = await res.json();
      } catch (e) {
        SNAPSHOT = {
          brands: [],
          models: [],
          years: [],
          keywords: []
        };
      }

      return SNAPSHOT;
    }

    async function loadBrands(storeId) {
      var snap = await ensureSnapshot(storeId);
      return snap.brands || [];
    }

    async function loadModels(storeId, brandId) {
      var snap = await ensureSnapshot(storeId);
      var all = snap.models || [];
      return all.filter(function (m) {
        return Number(m.brand_id) === Number(brandId);
      });
    }

    async function loadYears(storeId, modelId) {
      var snap = await ensureSnapshot(storeId);
      var all = snap.years || [];
      return all.filter(function (y) {
        return Number(y.model_id) === Number(modelId);
      });
    }

    async function loadKeywords(storeId, brandId, modelId, yearId) {
      try {
        var url =
          API_BASE +
          "/keywords?store_id=" +
          encodeURIComponent(storeId) +
          "&model_id=" +
          encodeURIComponent(String(modelId || ""));

        var data = await fetchJson(url);
        if (Array.isArray(data.keywords)) return data.keywords;
      } catch (e) {}

      var snap = await ensureSnapshot(storeId);
      var all = snap.keywords || [];

      return all.filter(function (k) {
        return Number(k.model_id) === Number(modelId);
      });
    }

    async function resolveStoreDomain(storeId) {
      try {
        var data = await fetchJson(
          API_BASE + "/store-domain?store_id=" + encodeURIComponent(storeId)
        );

        var domain = data.domain || window.location.origin;
        if (!/^https?:\\/\\//i.test(domain)) {
          domain = "https://" + domain;
        }
        return domain.replace(/\\/$/, "");
      } catch (e) {
        return window.location.origin.replace(/\\/$/, "");
      }
    }

    function getFilterSessionKey() {
      try {
        var v = localStorage.getItem("darb_filter_sid");
        if (!v) {
          v = Date.now() + "-" + Math.random();
          localStorage.setItem("darb_filter_sid", v);
        }
        return v;
      } catch (e) {
        return "no-storage";
      }
    }

    async function logFilterEvent(payload) {
      try {
        if (!WIDGET_SECRET) return;
        await fetch(API_BASE + "/event", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-widget-secret": WIDGET_SECRET,
          },
          body: JSON.stringify({
            store_id: storeId,
            session_key: getFilterSessionKey(),
            ...payload,
          }),
        });
      } catch (e) {}
    }

    // ================= POPUP =================

    function buildAdvancedSearchButton() {

      var state = {
        brand: null,
        type: null,
        model: null,
        options: []
      };

      var step = 0;

      var brands = [];
      var models = [];
      var years = [];
      var keywords = [];

      var openBtn = document.createElement("button");
      openBtn.textContent = "اختيار السيارة";
      document.body.appendChild(openBtn);

      var popup = document.createElement("div");
      popup.style.display = "none";
      document.body.appendChild(popup);

      function renderStep(s) {
        step = s;
        popup.innerHTML = "";

        if (step === 0) {
          brands.forEach(function (b) {
            var btn = document.createElement("button");
            btn.textContent = b.name_ar || b.name;
            btn.onclick = async function () {
              state.brand = b;
              models = await loadModels(storeId, b.id);
              renderStep(1);
            };
            popup.appendChild(btn);
          });
        }

        else if (step === 1) {
          models.forEach(function (m) {
            var btn = document.createElement("button");
            btn.textContent = m.name_ar || m.name;
            btn.onclick = async function () {
              state.type = m;
              years = await loadYears(storeId, m.id);
              renderStep(2);
            };
            popup.appendChild(btn);
          });
        }

        else if (step === 2) {
          years.forEach(function (y) {
            var btn = document.createElement("button");
            btn.textContent = y.year;
            btn.onclick = async function () {
              state.model = y;
              keywords = await loadKeywords(storeId, state.brand.id, state.type.id, y.id);
              renderStep(3);
            };
            popup.appendChild(btn);
          });
        }

        else if (step === 3) {
          keywords.forEach(function (k) {
            var label = k.name_ar || k.slug;
            var btn = document.createElement("button");
            btn.textContent = label;
            btn.onclick = function () {
              if (state.options.indexOf(label) === -1)
                state.options.push(label);
              else
                state.options = state.options.filter(function (x) { return x !== label; });
            };
            popup.appendChild(btn);
          });

          var confirm = document.createElement("button");
          confirm.textContent = "تأكيد";
          confirm.onclick = async function () {

            var carSlug =
              state.type.slug ||
              state.brand.slug ||
              "قطع-غيار";

            var domain = await resolveStoreDomain(storeId);

            var url =
              domain +
              "/category/" +
              encodeURIComponent(carSlug) +
              "?filters[company]=" +
              encodeURIComponent(state.brand.id) +
              "&filters[category_cat]=" +
              encodeURIComponent(state.type.id) +
              "&filters[category_id]=" +
              encodeURIComponent(state.model.id);

            if (state.options.length) {
              url += "&keyword=" + encodeURIComponent(state.options.join("||"));
            }

            await logFilterEvent({
              event_type: "search_submit",
              brand_id: Number(state.brand.id),
              model_id: Number(state.type.id),
              year_id: Number(state.model.id),
              keyword_labels: state.options
            });

            window.location.href = url;
          };

          popup.appendChild(confirm);
        }
      }

      openBtn.onclick = async function () {
        popup.style.display = "block";
        brands = await loadBrands(storeId);
        renderStep(0);
      };

    }

    buildAdvancedSearchButton();

  } catch (err) {
    console.error("widgets-mobile error:", err);
  }
})();
`;

  return new NextResponse(js, {
    status: 200,
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
