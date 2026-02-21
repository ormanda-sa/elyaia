// src/app/widgets-mobile.js/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const js = `
// widgets-mobile.js — Darb Advanced Car Picker (snapshot-based) WITHOUT SECTION STEP
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
    } catch (_) {
      PANEL_ORIGIN = "";
    }

    var API_BASE = (PANEL_ORIGIN || "") + "/api/widget";
var SNAPSHOT_BASE = (PANEL_ORIGIN || "") + "/api/widget-data-v2";

    async function fetchJson(url, options) {
      var res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        ...(options || {}),
      });
      if (!res.ok) throw new Error("Request failed: " + res.status);
      return res.json();
    }

    // ===== snapshot =====
    var SNAPSHOT = null;

    async function ensureSnapshot(storeId) {
      if (SNAPSHOT) return SNAPSHOT;

      var url = SNAPSHOT_BASE + "/" + encodeURIComponent(storeId) + ".json";

      try {
        var res = await fetch(url, { credentials: "omit" });
        if (!res.ok) throw new Error("Snapshot request failed: " + res.status);
        var data = await res.json();
        SNAPSHOT = data || {};
      } catch (e) {
        console.error("[widgets-mobile] failed to load snapshot", e);
        SNAPSHOT = {
          store_id: storeId,
          brands: [],
          models: [],
          years: [],
          sections: [],
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
      if (Number.isNaN(idNum)) return allModels;
      return allModels.filter(function (m) {
        return Number(m.brand_id) === idNum;
      });
    }

    async function loadYears(storeId, modelId) {
      var snap = await ensureSnapshot(storeId);
      var allYears = snap.years || [];
      var idNum = Number(modelId);
      if (Number.isNaN(idNum)) return allYears;
      return allYears.filter(function (y) {
        return Number(y.model_id) === idNum;
      });
    }

    // ✅ بدون قسم: نجيب الكلمات حسب model_id فقط (ولو API يدعم section_id نخليه فاضي)
// ✅ كلمات حسب السنة (year_id)
async function loadKeywords(storeId, brandId, modelId, yearId) {
  // 1) Live API (اختياري) — إذا عندك endpoint يدعم year_id
  try {
    var url =
      API_BASE +
      "/year-keywords?store_id=" + encodeURIComponent(storeId) +
      "&year_id=" + encodeURIComponent(String(yearId || ""));

    var data = await fetchJson(url);
    var live = (data && data.keywords) || [];
    if (Array.isArray(live)) return live;
  } catch (e) {
    // fallback
  }
 
  // 2) Snapshot fallback
  var snap = await ensureSnapshot(storeId);
  var allKeywords = (snap && snap.keywords) || [];

  var yId = Number(yearId);
  return allKeywords.filter(function (k) {
    if (!Number.isNaN(yId) && Number(k.year_id) !== yId) return false;
    return true;
  });
}

    function getFilterSessionKey() {
      var KEY = "darb_filter_sid";
      try {
        var v = localStorage.getItem(KEY);
        if (!v) {
          if (window.crypto && window.crypto.randomUUID) v = window.crypto.randomUUID();
          else v = String(Date.now()) + "-" + Math.random();
          localStorage.setItem(KEY, v);
        }
        return v;
      } catch (e) {
        return "no-storage-" + Date.now();
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

    async function resolveStoreDomain(storeId) {
      try {
        var data = await fetchJson(
          API_BASE + "/store-domain?store_id=" + encodeURIComponent(storeId)
        );

        var domain = (data && data.domain) || "";
        if (!domain) {
          var originFallback = window.location.origin || "";
          return originFallback.replace(/\\/$/, "");
        }

        domain = String(domain).trim();
        if (!domain.toLowerCase().startsWith("http://") && !domain.toLowerCase().startsWith("https://")) {
          domain = "https://" + domain;
        }
        domain = domain.replace(/\\/$/, "");
        return domain;
      } catch (e) {
        var originFallback2 = window.location.origin || "";
        return originFallback2.replace(/\\/$/, "");
      }
    }

    function buildAdvancedSearchButton(widget) {
      var cfg = widget.config || {};
      var searchCfg = cfg.search || {};

      var maxParts = Number(searchCfg.maxParts || 5);

      var buttonLabel = typeof cfg.label === "string" ? cfg.label : "اختيار السيارة";

      var brands = [];
      var models = [];
      var years = [];
      var keywords = [];

      var state = {
        brand: null,
        type: null,   // modelRow
        model: null,  // yearRow
        options: [],
      };

      var step = 0;

      var openBtn = document.createElement("button");
      openBtn.className = "popup-open-btn";
      openBtn.textContent = buttonLabel && buttonLabel.trim() ? buttonLabel : "اختيار السيارة";
      document.body.appendChild(openBtn);

      var popup = document.createElement("div");
      popup.className = "fullpage-popup";
      popup.innerHTML =
        '<div class="popup-content">' +
          '<div class="popup-progress"></div>' +
          '<div class="popup-top-bar">' +
            '<button class="popup-back" style="display:none">رجوع</button>' +
            '<input class="popup-search" type="text" placeholder="بحث..." autocomplete="off">' +
            '<button class="popup-close">×</button>' +
          "</div>" +
          '<div class="popup-crumbs"></div>' +
          '<div class="popup-selected-options"></div>' +
          '<div class="popup-list"></div>' +
          '<button class="popup-confirm" style="display:none">تأكيد</button>' +
        "</div>";
      document.body.appendChild(popup);

      var backBtn = popup.querySelector(".popup-back");
      var closeBtn = popup.querySelector(".popup-close");
      var searchInput = popup.querySelector(".popup-search");
      var listDiv = popup.querySelector(".popup-list");
      var crumbs = popup.querySelector(".popup-crumbs");
      var confirmBtn = popup.querySelector(".popup-confirm");
      var selectedOptionsDiv = popup.querySelector(".popup-selected-options");
      var progressDiv = popup.querySelector(".popup-progress");

      // ✅ 4 خطوات فقط
      var stepsList = [
        { label: "01" }, // brand
        { label: "02" }, // model
        { label: "03" }, // year
        { label: "04" }, // parts
      ];

      function setProgressBar(currentStep) {
        progressDiv.innerHTML = stepsList
          .map(function (s, i) {
            return (
              '<div class="popup-step' +
                (i < currentStep ? " done" : "") +
                (i === currentStep ? " current" : "") +
                '" data-step="' + i + '"' +
                (i < currentStep ? ' tabindex="0"' : "") +
              ">" +
                '<span class="step-num">' + s.label + "</span>" +
                '<span class="checkmark">✓</span>' +
              "</div>"
            );
          })
          .join("");

        Array.prototype.forEach.call(
          progressDiv.querySelectorAll(".popup-step.done"),
          function (el) {
            el.onclick = function () {
              var stepIdx = Number(el.getAttribute("data-step"));
              if (stepIdx < step) {
                if (stepIdx < 3) state.options = [];
                if (stepIdx < 2) state.model = null;
                if (stepIdx < 1) state.type = null;
                renderStep(stepIdx);
              }
            };
          }
        );
      }

      function setPlaceholder(text) {
        listDiv.innerHTML =
          '<button disabled style="opacity:.7;border:none;background:#f3f4f6;border-radius:999px;padding:8px 12px;margin-top:16px;">' +
          text +
          "</button>";
      }

      function renderBreadcrumbs() {
        crumbs.innerHTML = "";
        if (state.brand) crumbs.innerHTML += "🏢 " + (state.brand.name_ar || state.brand.name || "—") + " / ";
        if (state.type) crumbs.innerHTML += (state.type.name_ar || state.type.name || "—") + " / ";
        if (state.model) crumbs.innerHTML += (String(state.model.year) || state.model.name || "—") + " / ";
      }

      function renderStep(newStep) {
        step = newStep;
        setProgressBar(step);
        listDiv.innerHTML = "";
        searchInput.value = "";
        confirmBtn.style.display = "none";
        selectedOptionsDiv.style.display = "none";
        selectedOptionsDiv.innerHTML = "";
        backBtn.style.display = step > 0 ? "inline-block" : "none";
        renderBreadcrumbs();

        if (step === 0) {
          if (!brands.length) return setPlaceholder("لا توجد ماركات متاحة حالياً");

          brands.forEach(function (brand) {
            var btn = document.createElement("button");
            btn.textContent = brand.name_ar || brand.name || "—";
            if (state.brand && state.brand.id === brand.id) btn.className = "selected";
            btn.onclick = async function () {
              state.brand = brand;
              state.type = null;
              state.model = null;
              state.options = [];
              models = [];
              years = [];
              keywords = [];

              setPlaceholder("جاري تحميل الموديلات...");
              try {
                models = await loadModels(storeId, brand.id);
              } catch (_) {
                models = [];
              }
              if (!models.length) return setPlaceholder("لا توجد موديلات لهذه الماركة");
              renderStep(1);
            };
            listDiv.appendChild(btn);
          });

        } else if (step === 1) {
          if (!models.length) return setPlaceholder("لا توجد موديلات متاحة");

          models.forEach(function (m) {
            var btn = document.createElement("button");
            btn.textContent = m.name_ar || m.name || "—";
            if (state.type && state.type.id === m.id) btn.className = "selected";
            btn.onclick = async function () {
              state.type = m;
              state.model = null;
              state.options = [];
              years = [];
              keywords = [];

              var modelNumeric = Number(m.id);
              if (!Number.isNaN(modelNumeric)) {
                logFilterEvent({ event_type: "model_select_popup", model_id: modelNumeric });
              }

              setPlaceholder("جاري تحميل السنوات...");
              try {
                years = await loadYears(storeId, m.id);
              } catch (_) {
                years = [];
              }
              if (!years.length) return setPlaceholder("لا توجد سنوات لهذا الموديل");
              renderStep(2);
            };
            listDiv.appendChild(btn);
          });

        } else if (step === 2) {
          if (!years.length) return setPlaceholder("لا توجد سنوات متاحة");

          years.forEach(function (y) {
            var btn = document.createElement("button");
            btn.textContent = String(y.year || y.name);
            if (state.model && state.model.id === y.id) btn.className = "selected";
            btn.onclick = async function () {
              state.model = y;
              state.options = [];
              keywords = [];

              var yearNumeric = Number(y.id);
              if (!Number.isNaN(yearNumeric)) {
                logFilterEvent({ event_type: "year_select_popup", year_id: yearNumeric });
              }

              setPlaceholder("جاري تحميل القطع...");
              try {
                keywords = await loadKeywords(
                  storeId,
                  state.brand && state.brand.id,
                  state.type && state.type.id,
                  state.model && state.model.id
                );
              } catch (_) {
                keywords = [];
              }
              renderStep(3);
            };
            listDiv.appendChild(btn);
          });

        } else if (step === 3) {
          // ✅ اختيار القطع + تأكيد
          selectedOptionsDiv.style.display = "flex";
          confirmBtn.style.display = "block";
          confirmBtn.textContent = "تأكيد";

          (state.options || []).forEach(function (opt) {
            var tag = document.createElement("span");
            tag.className = "selected-tag";
            tag.textContent = opt;

            var remove = document.createElement("button");
            remove.innerHTML = "×";
            remove.onclick = function () {
              state.options = state.options.filter(function (x) { return x !== opt; });
              renderStep(3);
            };

            tag.appendChild(remove);
            selectedOptionsDiv.appendChild(tag);
          });

          listDiv.innerHTML = "";
          (keywords || []).forEach(function (k) {
            var label = k.name_ar || k.slug || ("#" + k.id);
            var btn = document.createElement("button");
            btn.textContent = label;
            btn.className = state.options.indexOf(label) >= 0 ? "selected" : "";
            btn.onclick = function () {
              if (state.options.indexOf(label) < 0) {
                if (state.options.length < maxParts) state.options.push(label);
              } else {
                state.options = state.options.filter(function (x) { return x !== label; });
              }
              renderStep(3);
            };
            listDiv.appendChild(btn);
          });

          confirmBtn.onclick = async function () {
            var brandObj = state.brand;
            var modelRow = state.type;
            var yearRow = state.model;

            if (!brandObj || !modelRow || !yearRow) {
              alert("حدد جميع الخيارات أولاً");
              return;
            }

            var carSlug =
              (modelRow && modelRow.slug) ||
              (brandObj && brandObj.slug) ||
              "قطع-غيار";

            var sallaCompanyId = (brandObj && brandObj.salla_company_id) || brandObj.id;
            var sallaCategoryId = (modelRow && modelRow.salla_category_id) || modelRow.id;
            var sallaYearId = (yearRow && yearRow.salla_year_id) || yearRow.id;

            var keywordLabels = (state.options || []).slice();

            var keywordIdsNumeric = [];
            (keywords || []).forEach(function (k) {
              var label = k.name_ar || k.slug || ("#" + k.id);
              if (keywordLabels.indexOf(label) !== -1) {
                var numId = Number(k.id);
                if (!Number.isNaN(numId)) keywordIdsNumeric.push(numId);
              }
            });

            var keywordParam = "";
            if (keywordLabels.length) keywordParam = encodeURIComponent(keywordLabels.join("||"));

            var domain = await resolveStoreDomain(storeId);

            // ✅ بدون filters[brand_id] (القسم)
            var url =
              domain +
              "/category/" +
              encodeURIComponent(carSlug) +
              "?filters[company]=" +
              encodeURIComponent(sallaCompanyId) +
              "&filters[category_cat]=" +
              encodeURIComponent(sallaCategoryId) +
              "&filters[category_id]=" +
              encodeURIComponent(sallaYearId);

            if (keywordParam) url += "&keyword=" + keywordParam;

            var brandNumeric = Number(brandObj.id);
            var modelNumeric = Number(modelRow.id);
            var yearNumeric = Number(yearRow.id);

            await logFilterEvent({
              event_type: "search_submit",
              brand_id: !Number.isNaN(brandNumeric) ? brandNumeric : null,
              model_id: !Number.isNaN(modelNumeric) ? modelNumeric : null,
              year_id: !Number.isNaN(yearNumeric) ? yearNumeric : null,
              keyword_ids: keywordIdsNumeric,
              meta: {
                page_url: window.location.href,
                target_url: url,
                from: "advanced_popup",
                has_keywords: keywordLabels.length > 0,
                keyword_labels: keywordLabels,
              },
            });

            window.location.href = url;
          };
        }

        // بحث داخل القائمة
        searchInput.oninput = function () {
          var val = (this.value || "").trim();
          Array.prototype.forEach.call(listDiv.children, function (btn) {
            btn.style.display = !val || btn.textContent.indexOf(val) !== -1 ? "" : "none";
          });
        };
      }

      openBtn.onclick = function () {
        openBtn.disabled = true;
        openBtn.textContent = "جار التحميل...";
        popup.classList.add("active");

        state = { brand: null, type: null, model: null, options: [] };
        brands = [];
        models = [];
        years = [];
        keywords = [];
        step = 0;

        setPlaceholder("جاري تحميل الماركات...");
        loadBrands(storeId)
          .then(function (b) {
            brands = b || [];
            if (!brands.length) setPlaceholder("لا توجد ماركات متاحة");
            else renderStep(0);
          })
          .catch(function (e) {
            console.error("[widgets-mobile.js] loadBrands error:", e);
            setPlaceholder("خطأ في تحميل الماركات");
          })
          .finally(function () {
            openBtn.disabled = false;
            openBtn.textContent = buttonLabel || "اختيار السيارة";
          });
      };

      closeBtn.onclick = function () {
        popup.classList.remove("active");
      };

      backBtn.onclick = function () {
        if (step === 3) renderStep(2);
        else if (step === 2) {
          state.model = null;
          state.options = [];
          renderStep(1);
        } else if (step === 1) {
          state.type = null;
          state.model = null;
          state.options = [];
          renderStep(0);
        } else popup.classList.remove("active");
      };

      popup.onclick = function (e) {
        if (e.target === popup) popup.classList.remove("active");
      };
    }

    // تشغيل بوب أب الجوال
    buildAdvancedSearchButton({ config: {} });
  } catch (err) {
    console.error("[widgets-mobile.js] runtime error:", err);
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
