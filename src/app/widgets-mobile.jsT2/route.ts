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
        if (!res.ok) throw new Error("Snapshot failed");
        SNAPSHOT = await res.json();
      } catch (e) {
        SNAPSHOT = {
          brands: [],
          models: [],
          years: [],
          keywords: [],
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
      var allModels = snap.models || [];
      var idNum = Number(brandId);
      return allModels.filter(function (m) {
        return Number(m.brand_id) === idNum;
      });
    }

    async function loadYears(storeId, modelId) {
      var snap = await ensureSnapshot(storeId);
      var allYears = snap.years || [];
      var idNum = Number(modelId);
      return allYears.filter(function (y) {
        return Number(y.model_id) === idNum;
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
      var allKeywords = snap.keywords || [];
      var mId = Number(modelId);
      return allKeywords.filter(function (k) {
        return Number(k.model_id) === mId;
      });
    }

    async function resolveStoreDomain(storeId) {
      try {
        var data = await fetchJson(
          API_BASE + "/store-domain?store_id=" + encodeURIComponent(storeId)
        );
        var domain = (data && data.domain) || window.location.origin;
        if (!/^https?:\\/\\//i.test(domain)) {
          domain = "https://" + domain;
        }
        return domain.replace(/\\/$/, "");
      } catch (e) {
        return window.location.origin.replace(/\\/$/, "");
      }
    }

    function buildMobileFilter() {
      var state = {
        brand: null,
        model: null,
        year: null,
        keywords: [],
      };

      var container = document.createElement("div");
      container.className = "mobile-filter";

      container.innerHTML =
        '<select id="brand"></select>' +
        '<select id="model" disabled></select>' +
        '<select id="year" disabled></select>' +
        '<select id="parts" multiple disabled></select>' +
        '<button id="searchBtn" disabled>بحث</button>';

      document.body.prepend(container);

      var brandSel = container.querySelector("#brand");
      var modelSel = container.querySelector("#model");
      var yearSel = container.querySelector("#year");
      var partsSel = container.querySelector("#parts");
      var searchBtn = container.querySelector("#searchBtn");

      loadBrands(storeId).then(function (brands) {
        brandSel.innerHTML =
          '<option value="">اختر الماركة</option>' +
          brands.map(function (b) {
            return '<option value="'+b.id+'">'+(b.name_ar || b.name)+'</option>';
          }).join("");
      });

      brandSel.onchange = function () {
        state.brand = this.value;
        modelSel.disabled = false;
        loadModels(storeId, state.brand).then(function (models) {
          modelSel.innerHTML =
            '<option value="">اختر الموديل</option>' +
            models.map(function (m) {
              return '<option value="'+m.id+'">'+(m.name_ar || m.name)+'</option>';
            }).join("");
        });
      };

      modelSel.onchange = function () {
        state.model = this.value;
        yearSel.disabled = false;
        loadYears(storeId, state.model).then(function (years) {
          yearSel.innerHTML =
            '<option value="">اختر السنة</option>' +
            years.map(function (y) {
              return '<option value="'+y.id+'">'+y.year+'</option>';
            }).join("");
        });
      };

      yearSel.onchange = function () {
        state.year = this.value;
        partsSel.disabled = false;
        loadKeywords(storeId, state.brand, state.model, state.year).then(function (keys) {
          partsSel.innerHTML =
            keys.map(function (k) {
              return '<option value="'+k.name_ar+'">'+k.name_ar+'</option>';
            }).join("");
        });
        searchBtn.disabled = false;
      };

      searchBtn.onclick = async function () {
        if (!state.brand || !state.model || !state.year) return;

        var domain = await resolveStoreDomain(storeId);

        var url =
          domain +
          "/category/قطع-غيار" +
          "?filters[company]=" + encodeURIComponent(state.brand) +
          "&filters[category_cat]=" + encodeURIComponent(state.model) +
          "&filters[category_id]=" + encodeURIComponent(state.year);

        window.location.href = url;
      };
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", buildMobileFilter);
    } else {
      buildMobileFilter();
    }

  } catch (err) {
    console.error("[widgets-mobileT2] error:", err);
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
