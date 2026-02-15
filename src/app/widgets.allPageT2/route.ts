// src/app/widgets.allPageT2/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const js = `
// widgets.allPage.js — Darb Filter (snapshot-based, all pages except home)
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
    var SNAPSHOT_BASE = (PANEL_ORIGIN || "") + "/api/widget-data";

    // ========== Helpers ==========

    function ensureChoicesAssets() {
      return new Promise(function (resolve) {
        if (window.Choices) return resolve();

        if (!document.querySelector('link[data-choices-css="1"]')) {
          var link = document.createElement("link");
          link.rel = "stylesheet";
          link.href =
            "https://cdn.jsdelivr.net/npm/choices.js/public/assets/styles/choices.min.css";
          link.setAttribute("data-choices-css", "1");
          document.head.appendChild(link);
        }

        if (!document.querySelector('script[data-choices-js="1"]')) {
          var s = document.createElement("script");
          s.src =
            "https://cdn.jsdelivr.net/npm/choices.js/public/assets/scripts/choices.min.js";
          s.async = true;
          s.defer = true;
          s.setAttribute("data-choices-js", "1");
          s.onload = function () {
            resolve();
          };
          s.onerror = function () {
            resolve();
          };
          document.head.appendChild(s);
        } else {
          resolve();
        }
      });
    }

    async function fetchJson(url, options) {
      var res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        ...(options || {}),
      });
      if (!res.ok) throw new Error("Request failed: " + res.status);
      return res.json();
    }

    // ========= snapshot =========

    var SNAPSHOT = null;

    async function ensureSnapshot(storeId) {
      if (SNAPSHOT) return SNAPSHOT;

      var url =
        SNAPSHOT_BASE + "/" + encodeURIComponent(storeId) + ".json";

      try {
        var res = await fetch(url, { credentials: "omit" });
        if (!res.ok) throw new Error("Snapshot request failed: " + res.status);
        var data = await res.json();
        SNAPSHOT = data || {};
      } catch (e) {
        console.error("[widgets.allPage] failed to load snapshot", e);
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

    // ✅ حذفنا loadSections لأن "القسم" انحذف

    async function loadKeywords(storeId, brandId, modelId, yearId) {
      // 1) Live من DB عبر API (يحُل نقص snapshot)
      try {
        var url =
          API_BASE +
          "/keywords?store_id=" +
          encodeURIComponent(storeId) +
          "&model_id=" +
          encodeURIComponent(String(modelId || ""));

        // إذا عندك year_id بالـ API لاحقاً:
        // url += "&year_id=" + encodeURIComponent(String(yearId || ""));

        var data = await fetchJson(url);
        var live = (data && data.keywords) || [];
        if (Array.isArray(live)) return live;
      } catch (e) {
        // fallback
      }

      // 2) Fallback: snapshot
      var snap = await ensureSnapshot(storeId);
      var allKeywords = (snap && snap.keywords) || [];

      var mId = Number(modelId);
      return allKeywords.filter(function (k) {
        if (!Number.isNaN(mId) && Number(k.model_id) !== mId) return false;
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
        if (
          !domain.toLowerCase().startsWith("http://") &&
          !domain.toLowerCase().startsWith("https://")
        ) {
          domain = "https://" + domain;
        }

        return domain.replace(/\\/$/, "");
      } catch (e) {
        var originFallback2 = window.location.origin || "";
        return originFallback2.replace(/\\/$/, "");
      }
    }

    function parseCurrentUrlFilters() {
      var result = {
        pathSlug: "",
        sCompany: null,
        sCategory: null,
        sYear: null,
        keywordLabels: [],
      };

      try {
        var url = new URL(window.location.href);
        var m = url.pathname.match(/\\/category\\/([^/?#]+)/);
        if (m) result.pathSlug = decodeURIComponent(m[1]);

        var sp = url.searchParams;
        result.sCompany = sp.get("filters[company]");
        result.sCategory = sp.get("filters[category_cat]");
        result.sYear = sp.get("filters[category_id]");

        // ✅ حذفنا filters[brand_id] (كان للقسم)

        var keyword = sp.get("keyword");
        if (keyword) {
          result.keywordLabels = keyword.split("||").filter(function (x) {
            return x && x.trim();
          });
        }
      } catch (e) {}

      return result;
    }

    // ========== Build Inline Filter ==========

    function buildAllPageFilter() {
      (async function () {
        await ensureChoicesAssets();

        var wrap = document.createElement("div");
        wrap.className = "zzz";

        // ✅ حذف select القسم
        var html = '\\
      <div class="X1">\\
        <div class="hero-filters-wrapper">\\
          <form id="filters-form-ap" onsubmit="return false;" dir="rtl" class="hero-filters-form">\\
            <select id="company-ap"></select>\\
            <select id="category-ap" disabled></select>\\
            <select id="model-ap" disabled></select>\\
            <select id="parts-ap" multiple disabled></select>\\
            <button id="filter-btn-ap" type="button" class="hero-search-btn">\\
              بحث <span style="font-size:18px;vertical-align:middle;">&#8594;</span>\\
            </button>\\
          </form>\\
        </div>\\
      </div>';

        wrap.innerHTML = html;

        var headerEl = document.querySelector("header");
        if (headerEl && headerEl.parentNode) {
          if (headerEl.nextSibling) headerEl.parentNode.insertBefore(wrap, headerEl.nextSibling);
          else headerEl.parentNode.appendChild(wrap);
        } else {
          document.body.insertBefore(wrap, document.body.firstChild);
        }

        var styleId = "darb-inline-filter-style";
        if (!document.getElementById(styleId)) {
          var styleEl = document.createElement("style");
          styleEl.id = styleId;
          styleEl.textContent =
            ".widgets-filter-hero-wrap{margin:12px auto 16px auto;max-width:1200px;background:transparent;padding:0 16px;}" +
            ".widgets-filter-hero-wrap .hero-filters-wrapper{width:100%;display:flex;justify-content:center;}" +
            ".choices{position:relative;overflow:hidden;margin-bottom:6px;font-size:16px;}" +
            ".hero-filters-form{" +
              "position:relative;z-index:10;width:100%;max-width:100%;margin:4px auto 4px 0;padding:20px 3%;border-radius:9px;" +
              "display:flex;align-items:center;gap:8px;flex-wrap:nowrap;" +
              "background:#fbfbfb;border:1px solid #e5e7eb;box-shadow:none;" +
              "-webkit-backdrop-filter:blur(0);" +
            "}" +
            ".select-with-step{display:flex;flex-direction:column;align-items:flex-start;position:relative;margin-bottom:0;flex:1 1 0;min-width:150px;}" +
            ".select-with-step .step-label{" +
              "background:#d50026;color:#ffffff;text-align:center;font-size:9px;border:1.5px solid #eef0f8;" +
              "margin-top:10px;margin-bottom:6px;letter-spacing:1px;position:absolute;display:inline-flex;" +
              "align-items:center;justify-content:center;font-weight:600;line-height:1;width:1.375rem;height:1.375rem;" +
              "border-radius:50%;inset-inline-start:0.625rem;pointer-events:none;z-index:1;" +
            "}" +
            ".hero-filters-form select{" +
              "min-width:0;width:100%;height:49px;border-radius:6px;border:1.5px solid #e5e7eb;font-size:14px;font-weight:500;" +
              "background:#ffffff;box-shadow:none;padding:0 12px;appearance:none;-webkit-appearance:none;-moz-appearance:none;" +
            "}" +
            ".hero-search-btn{" +
              "background:#e5202a;color:#fff;font-size:18px;min-width:140px;padding:0 34px;height:54px;border-radius:12px;border:none;" +
              "font-weight:bold;letter-spacing:0.5px;box-shadow:0 3px 12px #e5202a22;display:flex;align-items:center;justify-content:center;gap:4px;" +
              "transition:background 0.2s,transform 0.13s,box-shadow 0.2s;flex:0 0 auto;margin-bottom:10px;cursor:pointer;" +
            "}" +
            ".hero-search-btn:hover{" +
              "background:#b1101e;box-shadow:0 8px 18px #e5202a33;transform:translateY(-2px);" +
            "}" +
            ".hero-search-btn[disabled]{opacity:0.6;cursor:not-allowed;}" +
            ".hero-filters-form select.df-field-error{border-color:#ef4444 !important;}" +
            "@media(max-width:900px){" +
              ".widgets-filter-hero-wrap{padding:0 8px;}" +
              ".hero-filters-form{display:block;width:100%;max-width:100%;padding:14px 10px;}" +
              ".hero-filters-form > .select-with-step{width:100%;min-width:0;margin-bottom:6px !important;}" +
              ".hero-filters-form select{width:100%;min-width:0;display:block;}" +
              ".hero-search-btn{width:100%;margin-top:4px;margin-bottom:0;}" +
            "}";
          document.head.appendChild(styleEl);
        }

        var company = wrap.querySelector("#company-ap");
        var category = wrap.querySelector("#category-ap");
        var model = wrap.querySelector("#model-ap");
        var parts = wrap.querySelector("#parts-ap");
        var filterBtn = wrap.querySelector("#filter-btn-ap");

        function initChoices(selectEl, placeholder) {
          return new Choices(selectEl, {
            searchEnabled: true,
            shouldSort: false,
            itemSelectText: "",
            noResultsText: "لا توجد نتائج",
            placeholderValue: placeholder,
            searchPlaceholderValue: "بحث...",
          });
        }

        var companyChoices = initChoices(company, "اختر الموديل");
        var categoryChoices = initChoices(category, "اختر السنة");
        var modelChoices = initChoices(model, "اختر القسم");
        var partsChoices = new Choices(parts, {
          removeItemButton: true,
          maxItemCount: 5,
          placeholder: true,
          placeholderValue: "بحث أو اختيار القطع...",
          searchPlaceholderValue: "بحث عن القطعة...",
          shouldSort: false,
          searchEnabled: true,
          noResultsText: "لا توجد نتائج",
          itemSelectText: "اختر",
        });

        company.disabled = true;
        category.disabled = true;
        model.disabled = true;
        parts.disabled = true;
        filterBtn.disabled = true;

        var brands = [];
        var models = [];
        var years = [];
        var keywords = [];

        function setFieldError(selectEl, hasError) {
          if (!selectEl) return;
          if (hasError) selectEl.classList.add("df-field-error");
          else selectEl.classList.remove("df-field-error");
        }

        function updateFilterButtonState() {
          var brandId = companyChoices.getValue(true);
          var modelId = categoryChoices.getValue(true);
          var yearId = modelChoices.getValue(true);
          var ready = !!(brandId && modelId && yearId);
          filterBtn.disabled = !ready;
        }

        function markMissingRequiredFields() {
          var brandId = companyChoices.getValue(true);
          var modelId = categoryChoices.getValue(true);
          var yearId = modelChoices.getValue(true);

          setFieldError(company, !brandId);
          setFieldError(category, !modelId);
          setFieldError(model, !yearId);
        }

        function setChoicesData(choicesInstance, list, placeholder, labelKey) {
          var items = [{ value: "", label: placeholder, selected: true }].concat(
            (list || []).map(function (item) {
              var label =
                (labelKey && item[labelKey]) ||
                item.year ||
                item.name_ar ||
                item.name ||
                ("#" + item.id);

              return { value: String(item.id), label: label, selected: false };
            })
          );

          choicesInstance.clearStore();
          choicesInstance.setChoices(items, "value", "label", true);
        }

        setChoicesData(companyChoices, [], "جاري تحميل الموديلات...", "name_ar");

        try {
          brands = await loadBrands(storeId);
          if (brands.length > 0) {
            setChoicesData(companyChoices, brands, "اختر الموديل", "name_ar");
            company.disabled = false;
            companyChoices.enable();
          } else {
            setChoicesData(companyChoices, [], "لا توجد موديلات", "name_ar");
            company.disabled = true;
            companyChoices.disable();
          }
        } catch (e) {
          setChoicesData(companyChoices, [], "خطأ في تحميل الموديلات", "name_ar");
          company.disabled = true;
          companyChoices.disable();
        }

        company.addEventListener("change", async function () {
          var brandId = companyChoices.getValue(true);

          setChoicesData(categoryChoices, [], "اختر السنة", "name_ar");
          setChoicesData(modelChoices, [], "اختر القسم", "year");
          partsChoices.clearStore();

          category.disabled = true;
          model.disabled = true;
          parts.disabled = true;
          filterBtn.disabled = true;

          if (!brandId) {
            categoryChoices.disable();
            modelChoices.disable();
            partsChoices.disable();
            return;
          }

          var brandNumeric = Number(brandId);
          if (!Number.isNaN(brandNumeric)) {
            logFilterEvent({ event_type: "brand_select", brand_id: brandNumeric });
          }

          setChoicesData(categoryChoices, [], "جاري التحميل...", "name_ar");
          category.disabled = true;
          categoryChoices.disable();

          try {
            models = await loadModels(storeId, brandId);
            if (models.length > 0) {
              setChoicesData(categoryChoices, models, "اختر السنة", "name_ar");
              category.disabled = false;
              categoryChoices.enable();
            } else {
              setChoicesData(categoryChoices, [], "لا توجد سنوات", "name_ar");
              category.disabled = true;
              categoryChoices.disable();
            }
          } catch (e) {
            setChoicesData(categoryChoices, [], "خطأ في تحميل السنوات", "name_ar");
            category.disabled = true;
            categoryChoices.disable();
          }

          updateFilterButtonState();
        });

        category.addEventListener("change", async function () {
          var categoryId = categoryChoices.getValue(true);

          setChoicesData(modelChoices, [], "اختر القسم", "year");
          partsChoices.clearStore();

          model.disabled = true;
          parts.disabled = true;
          filterBtn.disabled = true;

          if (!categoryId) {
            modelChoices.disable();
            partsChoices.disable();
            return;
          }

          var modelNumeric = Number(categoryId);
          if (!Number.isNaN(modelNumeric)) {
            logFilterEvent({ event_type: "model_select", model_id: modelNumeric });
          }

          setChoicesData(modelChoices, [], "جاري التحميل...", "year");
          model.disabled = true;
          modelChoices.disable();

          try {
            years = await loadYears(storeId, categoryId);
            if (years.length > 0) {
              setChoicesData(modelChoices, years, "اختر الاقسام", "year");
              model.disabled = false;
              modelChoices.enable();
            } else {
              setChoicesData(modelChoices, [], "لا توجد اقسام", "year");
              model.disabled = true;
              modelChoices.disable();
            }
          } catch (e) {
            setChoicesData(modelChoices, [], "خطأ في تحميل الاقسام", "year");
            model.disabled = true;
            modelChoices.disable();
          }

          updateFilterButtonState();
        });

        // ✅ بعد اختيار السنة نحمل القطع مباشرة
        model.addEventListener("change", async function () {
          var yearId = modelChoices.getValue(true);

          partsChoices.clearStore();
          parts.disabled = true;
          filterBtn.disabled = true;

          if (!yearId) {
            partsChoices.disable();
            updateFilterButtonState();
            return;
          }

          var yearNumeric = Number(yearId);
          if (!Number.isNaN(yearNumeric)) {
            logFilterEvent({ event_type: "year_select", year_id: yearNumeric });
          }

          var brandId = companyChoices.getValue(true);
          var modelId = categoryChoices.getValue(true);

          partsChoices.setChoices(
            [{ value: "", label: "جاري التحميل...", selected: true }],
            "value",
            "label",
            true
          );
          parts.disabled = true;
          partsChoices.disable();

          try {
            keywords = await loadKeywords(storeId, brandId, modelId, yearId);

            partsChoices.clearStore();

            if ((keywords || []).length > 0) {
              parts.disabled = false;
              partsChoices.setChoices(
                (keywords || []).map(function (k) {
                  var label = k.name_ar || k.slug || ("#" + k.id);
                  return { value: String(k.id), label: label, selected: false };
                }),
                "value",
                "label",
                true
              );
              partsChoices.enable();
            } else {
              parts.disabled = true;
              partsChoices.setChoices(
                [{ value: "", label: "لا توجد خيارات", selected: true }],
                "value",
                "label",
                true
              );
              partsChoices.disable();
            }

            updateFilterButtonState();
          } catch (e) {
            partsChoices.clearStore();
            partsChoices.setChoices(
              [{ value: "", label: "خطأ في تحميل الكلمات", selected: true }],
              "value",
              "label",
              true
            );
            parts.disabled = true;
            partsChoices.disable();
            updateFilterButtonState();
          }
        });

        filterBtn.addEventListener("click", async function () {
          var brandId = companyChoices.getValue(true);
          var modelId = categoryChoices.getValue(true);
          var yearId = modelChoices.getValue(true);

          if (!brandId || !modelId || !yearId) {
            markMissingRequiredFields();
            return;
          }

          var brandObj =
            brands.find(function (b) { return String(b.id) === String(brandId); }) || null;

          var modelRow =
            models.find(function (m) { return String(m.id) === String(modelId); }) || null;

          var yearRow =
            years.find(function (y) { return String(y.id) === String(yearId); }) || null;

          var carSlug =
            (modelRow && modelRow.slug) ||
            (brandObj && brandObj.slug) ||
            "قطع-غيار";

          var sallaCompanyId = (brandObj && brandObj.salla_company_id) || brandId;
          var sallaCategoryId = (modelRow && modelRow.salla_category_id) || modelId;
          var sallaYearId = (yearRow && yearRow.salla_year_id) || yearId;

          var selectedKeywordIds = partsChoices.getValue(true) || [];
          if (!Array.isArray(selectedKeywordIds)) selectedKeywordIds = [selectedKeywordIds];

          var keywordIdsNumeric = selectedKeywordIds
            .map(function (v) { return Number(v); })
            .filter(function (v) { return !Number.isNaN(v); });

          var keywordLabels = [];
          keywordIdsNumeric.forEach(function (id) {
            var k = (keywords || []).find(function (kw) { return Number(kw.id) === id; });
            if (k) keywordLabels.push(k.name_ar || k.slug || ("#" + k.id));
          });

          var keywordParam = "";
          if (keywordLabels.length) keywordParam = encodeURIComponent(keywordLabels.join("||"));

          var domain = await resolveStoreDomain(storeId);

          // ✅ حذفنا filters[brand_id]
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

          var brandNumeric = Number(brandId);
          var modelNumeric = Number(modelId);
          var yearNumeric = Number(yearId);

          logFilterEvent({
            event_type: "search_submit",
            brand_id: !Number.isNaN(brandNumeric) ? brandNumeric : null,
            model_id: !Number.isNaN(modelNumeric) ? modelNumeric : null,
            year_id: !Number.isNaN(yearNumeric) ? yearNumeric : null,
            keyword_ids: keywordIdsNumeric,
            meta: {
              page_url: window.location.href,
              target_url: url,
              has_keywords: keywordLabels.length > 0,
              keyword_labels: keywordLabels,
              from: "all_page_filter",
            },
          });

          window.location.href = url;
        });

        async function prefillFromUrl() {
          var info = parseCurrentUrlFilters();
          if (
            !info ||
            (!info.sCompany &&
              !info.sCategory &&
              !info.sYear &&
              !(info.keywordLabels && info.keywordLabels.length))
          ) {
            return;
          }

          var preBrand = null;
          if (info.sCompany) {
            preBrand = brands.find(function (b) {
              return (
                String(b.salla_company_id) === String(info.sCompany) ||
                String(b.id) === String(info.sCompany)
              );
            });
          }
          if (!preBrand && info.pathSlug) {
            preBrand = brands.find(function (b) { return String(b.slug) === String(info.pathSlug); });
          }
          if (!preBrand) return;

          companyChoices.setChoiceByValue(String(preBrand.id));
          company.disabled = false;

          try {
            models = await loadModels(storeId, preBrand.id);
            if (models.length > 0) {
              setChoicesData(categoryChoices, models, "اختر الموديل", "name_ar");
              category.disabled = false;
              categoryChoices.enable();
            } else return;
          } catch (e) {
            return;
          }

          var preModel = null;
          if (info.sCategory) {
            preModel = models.find(function (m) {
              return (
                String(m.salla_category_id) === String(info.sCategory) ||
                String(m.id) === String(info.sCategory)
              );
            });
          }
          if (!preModel && info.pathSlug) {
            preModel = models.find(function (m) { return String(m.slug) === String(info.pathSlug); });
          }
          if (!preModel) { updateFilterButtonState(); return; }

          categoryChoices.setChoiceByValue(String(preModel.id));

          try {
            years = await loadYears(storeId, preModel.id);
            if (years.length > 0) {
              setChoicesData(modelChoices, years, "اختر السنة", "year");
              model.disabled = false;
              modelChoices.enable();
            } else { updateFilterButtonState(); return; }
          } catch (e) {
            return;
          }

          var preYear = null;
          if (info.sYear) {
            preYear = years.find(function (y) {
              return (
                String(y.salla_year_id) === String(info.sYear) ||
                String(y.id) === String(info.sYear)
              );
            });
          }
          if (!preYear && info.pathSlug) {
            preYear = years.find(function (y) { return String(y.slug) === String(info.pathSlug); });
          }
          if (!preYear) { updateFilterButtonState(); return; }

          modelChoices.setChoiceByValue(String(preYear.id));

          // إذا فيه keyword بالـ URL نجهز القطع ونختارها
          if (info.keywordLabels && info.keywordLabels.length) {
            try {
              keywords = await loadKeywords(storeId, preBrand.id, preModel.id, preYear.id);

              partsChoices.clearStore();
              if ((keywords || []).length > 0) {
                parts.disabled = false;
                partsChoices.setChoices(
                  (keywords || []).map(function (k) {
                    var label = k.name_ar || k.slug || ("#" + k.id);
                    return { value: String(k.id), label: label, selected: false };
                  }),
                  "value",
                  "label",
                  true
                );
                partsChoices.enable();

                var selectedIds = [];
                info.keywordLabels.forEach(function (lbl) {
                  var k = keywords.find(function (kw) {
                    var nm = kw.name_ar || kw.slug || ("#" + kw.id);
                    return nm === lbl;
                  });
                  if (k) selectedIds.push(String(k.id));
                });
                if (selectedIds.length) partsChoices.setChoiceByValue(selectedIds);
              }
            } catch (e) {}
          }

          updateFilterButtonState();
        }

        prefillFromUrl();
      })();
    }

    function loadAllPageWidget() {
      try {
        var path = window.location && window.location.pathname;
        if (!path) return;

        // =========================
        // BLOCK PAGES (المطلوب فقط)
        // =========================
        var p = String(path);
        if (p.length > 1) p = p.replace(/\\/+$/, "");
        var pl = p.toLowerCase();

        var blockedExact = {
          "/": true,
          "/index.html": true,
          "/cart": true,
          "/pending_orders": true,
          "/notifications": true,
          "/orders": true,
          "/wishlist": true,
          "/settings": true,
        };

        var isInfoPage = pl === "/p" || pl.indexOf("/p/") === 0;

        var isRootSlug =
          pl.charAt(0) === "/" &&
          pl.indexOf("/", 1) === -1 &&
          pl !== "/" &&
          pl !== "/index.html";

        var isCategory = pl.indexOf("/category/") === 0;

        var isProductPage = isRootSlug && !isCategory && !isInfoPage && !blockedExact[pl];

        if (blockedExact[pl] || isInfoPage || isProductPage) return;
        // =========================
      } catch (e) {}

      var statusUrl =
        (PANEL_ORIGIN || "") +
        "/api/widget/subscription-status?store_id=" +
        encodeURIComponent(storeId);

      fetch(statusUrl)
        .then(function (res) { return res.json().catch(function () { return {}; }); })
        .then(function (data) {
          if (data && data.ok && data.suspended) return;
          buildAllPageFilter();
        })
        .catch(function () { buildAllPageFilter(); });
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", loadAllPageWidget);
    } else {
      loadAllPageWidget();
    }
  } catch (err) {
    console.error("[widgets.allPage.js] runtime error:", err);
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
