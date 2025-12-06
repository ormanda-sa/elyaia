// src/app/widgets.js/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const js = `
// widgets.js — Darb Filter Hero (snapshot + events + full config)
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

    var SNAPSHOT = null;

    async function ensureSnapshot(storeId) {
      if (SNAPSHOT) return SNAPSHOT;

      var url =
        SNAPSHOT_BASE +
        "/" +
        encodeURIComponent(storeId) +
        ".json";

      try {
        var data = await fetchJson(url);
        SNAPSHOT = data || {};
      } catch (e) {
        console.error("[DarbFilter] failed to load snapshot", e);
        SNAPSHOT = {
          store_id: storeId,
          brands: [],
          models: [],
          years: [],
          sections: [],
          keywords: [],
          config: null,
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

    async function loadSections(storeId) {
      var snap = await ensureSnapshot(storeId);
      return snap.sections || [];
    }

    async function loadKeywords(
      storeId,
      brandId,
      modelId,
      yearId,
      sectionId
    ) {
      var snap = await ensureSnapshot(storeId);
      var allKeywords = snap.keywords || [];

      var mId = Number(modelId);
      var sId = Number(sectionId);

      var result = allKeywords.filter(function (k) {
        if (!Number.isNaN(mId) && Number(k.model_id) !== mId) return false;
        if (!Number.isNaN(sId) && Number(k.section_id) !== sId) return false;
        return true;
      });

      return result;
    }

    function getFilterSessionKey() {
      var KEY = "darb_filter_sid";
      try {
        var v = localStorage.getItem(KEY);
        if (!v) {
          if (window.crypto && window.crypto.randomUUID) {
            v = window.crypto.randomUUID();
          } else {
            v = String(Date.now()) + "-" + Math.random();
          }
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

        domain = domain.replace(/\\/$/, "");

        return domain;
      } catch (e) {
        var originFallback2 = window.location.origin || "";
        return originFallback2.replace(/\\/$/, "");
      }
    }

    function buildFilterHeroDom(showBranding) {
      (async function () {
        await ensureChoicesAssets();

        var snap = await ensureSnapshot(storeId);
        var cfg = (snap && snap.config) || {};

        var heroTitle =
          cfg.title_text || "ابحث عن قطع غيار سيارتك";

        var counterTarget = cfg.counter_target || 181825;

        var heroBgMode = cfg.hero_bg_mode || "image";
        var heroBgGradient = cfg.hero_bg_gradient || "";
        var heroBgImage =
          cfg.background_image_url ||
          "https://static.darb.com.sa/hero-bg/shocks.webp";

        var heroTitleColor = cfg.hero_title_color || "#ffffff";
        var heroDescColor = cfg.hero_desc_color || "#f9fafb";
        var counterColor = cfg.counter_color || "#e5202a";
        var shippingColor = cfg.shipping_color || "#2563eb";
        var stepBadgeBg = cfg.step_badge_bg || "#d50026";

        // نصوص القالب
        var prefixTemplate =
          cfg.hero_description_prefix ||
          "ابحث بين {counter} قطعة غيار لجميع سيارات تويوتا الأصلية واليابانية والتجارية";
        var shippingLine =
          cfg.hero_shipping_line ||
          "شحن سريع خلال 4-6 أيام وسعر منافس جداً";

        // نبني HTML من القوالب إذا ما فيه subtitle_text مخصص
        var heroDescHtml =
          cfg.subtitle_text ||
          (
            prefixTemplate.replace(
              "{counter}",
              '<span id="countUp" class="darb-counter">0</span>'
            ) +
            '<br><span class="darb-shipping">' +
            String(shippingLine) +
            '</span> <span class="emoji-bounce">🚚</span><span class="emoji-bounce">🔥</span>'
          );

        var heroBgStyle =
          heroBgMode === "gradient" && heroBgGradient
            ? heroBgGradient
            : "url(" + heroBgImage.replace(/"/g, '\\"') + ")";

        var heroButtonBg =
          cfg.hero_button_bg ||
          "linear-gradient(90deg, #e5202a 0%, #f97316 100%)";
        var heroButtonText =
          cfg.hero_button_text_color || "#ffffff";

        var capsuleBg =
          cfg.hero_capsule_bg ||
          "radial-gradient(circle at 0 0, rgba(59,130,246,0.2), transparent 55%), radial-gradient(circle at 100% 100%, rgba(244,54,54,0.25), transparent 55%), rgba(15,23,42,0.72)";
        var capsuleShadow =
          cfg.hero_capsule_shadow ||
          "0 26px 80px rgba(15,23,42,0.65), 0 0 0 1px rgba(148,163,184,0.45)";

        var wrap = document.createElement("div");
        wrap.className = "widgets-filter-hero-wrap";

        var html = '\\
    <div class="hero-section widgets-filter-hero">\\
      <div class="hero-bg-img" style="background:' +
          heroBgStyle.replace(/"/g, '\\"') +
          ';"></div>\\
      <div id="custom-filter-hero">\\
        <div class="hero-title-filter">\\
          <div class="hero-filter-head">' +
          heroTitle.replace(/</g, "&lt;") +
          '</div>\\
          <div class="hero-filter-desc">' +
          heroDescHtml.replace(/"/g, '\\"') +
          '<br/>\\
            <a id="darb-branding-link" href="https://darbfilters.com" target="_blank" rel="noopener"\\
               style="display:none;margin-top:6px;font-size:11px;color:#e5e7eb;text-decoration:none;">\\
              تم إنشاء الفلتر الذكي بواسطة مؤسسة درب — <span style="text-decoration:underline;">Darb Filters</span>\\
            </a>\\
          </div>\\
        </div>\\
        <div class="X1">\\
          <div class="hero-filters-wrapper">\\
            <form id="filters-form" onsubmit="return false;" dir="rtl" class="hero-filters-form">\\
              <select id="company"></select>\\
              <select id="category" disabled></select>\\
              <select id="model" disabled></select>\\
              <select id="section" disabled></select>\\
              <select id="parts" multiple disabled></select>\\
              <button id="filter-btn" type="button" class="hero-search-btn">\\
                بحث <span style="font-size:18px;vertical-align:middle;">&#8594;</span>\\
              </button>\\
            </form>\\
          </div>\\
        </div>\\
      </div>\\
    </div>';

        wrap.innerHTML = html;

        var headerEl = document.querySelector("header");
        if (headerEl && headerEl.parentNode) {
          if (headerEl.nextSibling) {
            headerEl.parentNode.insertBefore(wrap, headerEl.nextSibling);
          } else {
            headerEl.parentNode.appendChild(wrap);
          }
        } else {
          document.body.appendChild(wrap);
        }

        var styleId = "darb-filter-style";
        if (!document.getElementById(styleId)) {
          var styleEl = document.createElement("style");
          styleEl.id = styleId;
          styleEl.textContent =
            ".widgets-filter-hero-wrap select.df-field-error{border-color:#ef4444 !important;outline:0;}" +
            ".widgets-filter-hero-wrap .hero-search-btn[disabled]{opacity:.6;cursor:not-allowed;}" +
            ".widgets-filter-hero-wrap .hero-filter-head{color:" + heroTitleColor + " !important;}" +
            ".widgets-filter-hero-wrap .hero-filter-desc{color:" + heroDescColor + " !important;}" +
            ".widgets-filter-hero-wrap .hero-filters-form{background:" + capsuleBg + " !important;box-shadow:" + capsuleShadow + " !important;}" +
            ".widgets-filter-hero-wrap .hero-search-btn{background:" + heroButtonBg + " !important;color:" + heroButtonText + " !important;}" +
            ".widgets-filter-hero-wrap .step-label{background:" + stepBadgeBg + " !important;}" +
            ".widgets-filter-hero-wrap .darb-counter{color:" + counterColor + " !important;font-weight:700;}" +
            ".widgets-filter-hero-wrap .darb-shipping{color:" + shippingColor + " !important;font-weight:600;}";
          document.head.appendChild(styleEl);
        }

        var link = wrap.querySelector("#darb-branding-link");
        if (link) {
          link.style.display = showBranding ? "inline-block" : "none";
        }

        var steps = ["01", "02", "03", "04", "05"];
        wrap.querySelectorAll(".hero-filters-form select").forEach(function (
          el,
          idx
        ) {
          if (steps[idx]) {
            var holder = document.createElement("div");
            holder.className = "select-with-step";
            var label = document.createElement("span");
            label.className = "step-label";
            label.textContent = steps[idx];
            holder.appendChild(label);
            el.parentNode.insertBefore(holder, el);
            holder.appendChild(el);
          }
        });

        var company = wrap.querySelector("#company");
        var category = wrap.querySelector("#category");
        var model = wrap.querySelector("#model");
        var section = wrap.querySelector("#section");
        var parts = wrap.querySelector("#parts");
        var filterBtn = wrap.querySelector("#filter-btn");

        if (filterBtn) {
          filterBtn.style.cursor = "pointer";
        }

        var currentCategory = null;
        var currentModel = null;

        function setFieldError(selectEl, hasError) {
          if (!selectEl) return;
          if (hasError) {
            selectEl.classList.add("df-field-error");
          } else {
            selectEl.classList.remove("df-field-error");
          }
        }

        function updateFilterButtonState() {
          var brandId   = companyChoices && companyChoices.getValue(true);
          var modelId   = categoryChoices && categoryChoices.getValue(true);
          var yearId    = modelChoices && modelChoices.getValue(true);
          var sectionId = sectionChoices && sectionChoices.getValue(true);

          var ready = !!(brandId && modelId && yearId && sectionId);
          if (filterBtn) {
            filterBtn.disabled = !ready;
          }
        }

        function markMissingRequiredFields() {
          var brandId   = companyChoices.getValue(true);
          var modelId   = categoryChoices.getValue(true);
          var yearId    = modelChoices.getValue(true);
          var sectionId = sectionChoices.getValue(true);

          setFieldError(company, !brandId);
          setFieldError(category, !modelId);
          setFieldError(model, !yearId);
          setFieldError(section, !sectionId);
        }

        function setButtonLoading(isLoading) {
          if (!filterBtn) return;
          if (isLoading) {
            if (!filterBtn.dataset.originalText) {
              filterBtn.dataset.originalText = filterBtn.innerHTML;
            }
            filterBtn.disabled = true;
            filterBtn.innerHTML = "جاري التحميل...";
          } else {
            var original = filterBtn.dataset.originalText;
            if (original) {
              filterBtn.innerHTML = original;
            }
            updateFilterButtonState();
          }
        }

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

        var companyChoices = initChoices(company, "اختر الماركة");
        var categoryChoices = initChoices(category, "اختر الموديل");
        var modelChoices = initChoices(model, "اختر السنة");
        var sectionChoices = initChoices(section, "اختر القسم");
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
        section.disabled = true;
        parts.disabled = true;
        filterBtn.disabled = true;

        var brands = [];
        var models = [];
        var years = [];
        var sections = [];
        var keywords = [];

        function setChoicesData(choicesInstance, list, placeholder, labelKey) {
          var items = [
            {
              value: "",
              label: placeholder,
              selected: true,
            },
          ].concat(
            (list || []).map(function (item) {
              var label =
                (labelKey && item[labelKey]) ||
                item.year ||
                item.name_ar ||
                item.name ||
                ("#" + item.id);

              return {
                value: String(item.id),
                label: label,
                selected: false,
              };
            })
          );

          choicesInstance.clearStore();
          choicesInstance.setChoices(items, "value", "label", true);
        }

        setChoicesData(companyChoices, [], "جاري التحميل...");
        company.disabled = true;
        companyChoices.disable();

        try {
          brands = await loadBrands(storeId);

          if (brands.length > 0) {
            setChoicesData(companyChoices, brands, "اختر الماركة", "name_ar");
            company.disabled = false;
            companyChoices.enable();
          } else {
            setChoicesData(companyChoices, [], "لا توجد خيارات");
            company.disabled = true;
            companyChoices.disable();
          }
        } catch (e) {
          setChoicesData(companyChoices, [], "خطأ في تحميل الماركات");
          company.disabled = true;
          companyChoices.disable();
        }

        company.addEventListener("change", async function () {
          var brandId = companyChoices.getValue(true);

          if (brandId) {
            setFieldError(company, false);
          }

          setChoicesData(categoryChoices, [], "اختر الموديل");
          setChoicesData(modelChoices, [], "اختر السنة");
          setChoicesData(sectionChoices, [], "اختر القسم");
          partsChoices.clearStore();

          category.disabled = true;
          model.disabled = true;
          section.disabled = true;
          parts.disabled = true;
          filterBtn.disabled = true;

          currentCategory = null;
          currentModel = null;

          if (!brandId) {
            categoryChoices.disable();
            modelChoices.disable();
            sectionChoices.disable();
            partsChoices.disable();
            updateFilterButtonState();
            return;
          }

          var brandNumeric = Number(brandId);
          if (!Number.isNaN(brandNumeric)) {
            logFilterEvent({
              event_type: "brand_select",
              brand_id: brandNumeric,
            });
          }

          setChoicesData(categoryChoices, [], "جاري التحميل...");
          category.disabled = true;
          categoryChoices.disable();

          try {
            models = await loadModels(storeId, brandId);

            if (models.length > 0) {
              setChoicesData(
                categoryChoices,
                models,
                "اختر الموديل",
                "name_ar"
              );
              category.disabled = false;
              categoryChoices.enable();
            } else {
              setChoicesData(categoryChoices, [], "لا توجد خيارات");
              category.disabled = true;
              categoryChoices.disable();
            }
          } catch (e) {
            setChoicesData(
              categoryChoices,
              [],
              "خطأ في تحميل الموديلات"
            );
            category.disabled = true;
            categoryChoices.disable();
          }

          updateFilterButtonState();
        });

        category.addEventListener("change", async function () {
          var categoryId = categoryChoices.getValue(true);

          if (categoryId) {
            setFieldError(category, false);
          }

          setChoicesData(modelChoices, [], "اختر السنة");
          setChoicesData(sectionChoices, [], "اختر القسم");
          partsChoices.clearStore();

          model.disabled = true;
          section.disabled = true;
          parts.disabled = true;
          filterBtn.disabled = true;

          currentCategory =
            models.find(function (m) {
              return String(m.id) === String(categoryId);
            }) || null;

          if (!categoryId) {
            modelChoices.disable();
            sectionChoices.disable();
            partsChoices.disable();
            updateFilterButtonState();
            return;
          }

          var modelNumeric = Number(categoryId);
          if (!Number.isNaN(modelNumeric)) {
            logFilterEvent({
              event_type: "model_select",
              model_id: modelNumeric,
            });
          }

          setChoicesData(modelChoices, [], "جاري التحميل...");
          model.disabled = true;
          modelChoices.disable();

          try {
            years = await loadYears(storeId, categoryId);

            if (years.length > 0) {
              setChoicesData(modelChoices, years, "اختر السنة", "year");
              model.disabled = false;
              modelChoices.enable();
            } else {
              setChoicesData(modelChoices, [], "لا توجد خيارات");
              model.disabled = true;
              modelChoices.disable();
            }
          } catch (e) {
            setChoicesData(modelChoices, [], "خطأ في تحميل السنوات");
            model.disabled = true;
            modelChoices.disable();
          }

          updateFilterButtonState();
        });

        model.addEventListener("change", async function () {
          var modelId = modelChoices.getValue(true);

          if (modelId) {
            setFieldError(model, false);
          }

          setChoicesData(sectionChoices, [], "اختر القسم");
          partsChoices.clearStore();

          section.disabled = true;
          parts.disabled = true;
          filterBtn.disabled = true;

          currentModel =
            years.find(function (y) {
              return String(y.id) === String(modelId);
            }) || null;

          if (!modelId) {
            sectionChoices.disable();
            partsChoices.disable();
            updateFilterButtonState();
            return;
          }

          var yearNumeric = Number(modelId);
          if (!Number.isNaN(yearNumeric)) {
            logFilterEvent({
              event_type: "year_select",
              year_id: yearNumeric,
            });
          }

          setChoicesData(sectionChoices, [], "جاري التحميل...");
          section.disabled = true;
          sectionChoices.disable();

          try {
            sections = await loadSections(storeId);
            if (sections.length > 0) {
              setChoicesData(
                sectionChoices,
                sections,
                "اختر القسم",
                "name_ar"
              );
              section.disabled = false;
              sectionChoices.enable();
            } else {
              setChoicesData(sectionChoices, [], "لا توجد خيارات");
              section.disabled = true;
              sectionChoices.disable();
            }
          } catch (e) {
            setChoicesData(
              sectionChoices,
              [],
              "خطأ في تحميل الأقسام"
            );
            section.disabled = true;
            sectionChoices.disable();
          }

          updateFilterButtonState();
        });

        section.addEventListener("change", async function () {
          var sectionId = sectionChoices.getValue(true);

          if (sectionId) {
            setFieldError(section, false);
          }

          partsChoices.clearStore();
          parts.disabled = true;
          filterBtn.disabled = true;

          if (!sectionId) {
            partsChoices.disable();
            updateFilterButtonState();
            return;
          }

          var sectionNumeric = Number(sectionId);
          if (!Number.isNaN(sectionNumeric)) {
            logFilterEvent({
              event_type: "section_select",
              section_id: sectionNumeric,
            });
          }

          var brandId = companyChoices.getValue(true);
          var modelId = categoryChoices.getValue(true);
          var yearId = modelChoices.getValue(true);

          partsChoices.setChoices(
            [
              {
                value: "",
                label: "جاري التحميل...",
                selected: true,
              },
            ],
            "value",
            "label",
            true
          );
          parts.disabled = true;
          partsChoices.disable();

          try {
            keywords = await loadKeywords(
              storeId,
              brandId,
              modelId,
              yearId,
              sectionId
            );

            partsChoices.clearStore();

            if ((keywords || []).length > 0) {
              parts.disabled = false;
              partsChoices.setChoices(
                (keywords || []).map(function (k) {
                  var label = k.name_ar || k.slug || ("#" + k.id);
                  return {
                    value: String(k.id),
                    label: label,
                    selected: false,
                  };
                }),
                "value",
                "label",
                true
              );
              partsChoices.enable();
            } else {
              parts.disabled = true;
              partsChoices.setChoices(
                [
                  {
                    value: "",
                    label: "لا توجد خيارات",
                    selected: true,
                  },
                ],
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
              [
                {
                  value: "",
                  label: "خطأ في تحميل الكلمات",
                  selected: true,
                },
              ],
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
          var brandId   = companyChoices.getValue(true);
          var modelId   = categoryChoices.getValue(true);
          var yearId    = modelChoices.getValue(true);
          var sectionId = sectionChoices.getValue(true);

          if (!brandId || !modelId || !yearId || !sectionId) {
            markMissingRequiredFields();
            return;
          }

          setButtonLoading(true);

          try {
            var brandObj =
              brands.find(function (b) {
                return String(b.id) === String(brandId);
              }) || null;

            var modelRow =
              models.find(function (m) {
                return String(m.id) === String(modelId);
              }) || null;

            var carSlug =
              (modelRow && modelRow.slug) ||
              (brandObj && brandObj.slug) ||
              "قطع-غيار";

            var yearRow =
              years.find(function (y) {
                return String(y.id) === String(yearId);
              }) || null;

            var sectionRow =
              sections.find(function (s) {
                return String(s.id) === String(sectionId);
              }) || null;

            var sallaCompanyId  = (brandObj && brandObj.salla_company_id) || brandId;
            var sallaCategoryId = (modelRow && modelRow.salla_category_id) || modelId;
            var sallaYearId     = (yearRow && yearRow.salla_year_id) || yearId;
            var sallaSectionId  = (sectionRow && sectionRow.salla_section_id) || sectionId;

            var selectedKeywordIds = partsChoices.getValue(true) || [];
            if (!Array.isArray(selectedKeywordIds)) {
              selectedKeywordIds = [selectedKeywordIds];
            }

            var keywordIdsNumeric = selectedKeywordIds
              .map(function (v) { return Number(v); })
              .filter(function (v) { return !Number.isNaN(v); });

            var keywordLabels = [];
            keywordIdsNumeric.forEach(function (id) {
              var k = (keywords || []).find(function (kw) {
                return Number(kw.id) === id;
              });
              if (k) {
                keywordLabels.push(k.name_ar || k.slug || ("#" + k.id));
              }
            });

            var keywordParam = "";
            if (keywordLabels.length) {
              keywordParam = encodeURIComponent(keywordLabels.join("||"));
            }

            var domain = await resolveStoreDomain(storeId);

            var url =
              domain +
              "/category/" +
              encodeURIComponent(carSlug) +
              "?filters[company]=" +
              encodeURIComponent(sallaCompanyId) +
              "&filters[category]=" +
              encodeURIComponent(sallaCategoryId) +
              "&filters[category_id]=" +
              encodeURIComponent(sallaYearId) +
              "&filters[brand_id]=" +
              encodeURIComponent(sallaSectionId);

            if (keywordParam) {
              url += "&keyword=" + keywordParam;
            }

            var brandNumeric   = Number(brandId);
            var modelNumeric   = Number(modelId);
            var yearNumeric    = Number(yearId);
            var sectionNumeric = Number(sectionId);

            await logFilterEvent({
              event_type: "search_submit",
              brand_id: !Number.isNaN(brandNumeric) ? brandNumeric : null,
              model_id: !Number.isNaN(modelNumeric) ? modelNumeric : null,
              year_id: !Number.isNaN(yearNumeric) ? yearNumeric : null,
              section_id: !Number.isNaN(sectionNumeric) ? sectionNumeric : null,
              keyword_ids: keywordIdsNumeric,
              meta: {
                page_url: window.location.href,
                target_url: url,
                from: "hero_widget",
                has_keywords: keywordLabels.length > 0,
                keyword_labels: keywordLabels,
              },
            });

            window.location.href = url;
          } catch (err) {
            console.error("[widgets.js] search click error:", err);
            setButtonLoading(false);
          }
        });

        var countEl = wrap.querySelector("#countUp");
        if (countEl && counterTarget) {
          var maxVal = counterTarget;
          var c = 0;
          var interval = setInterval(function () {
            c += Math.ceil((maxVal - c) / 11);
            if (c >= maxVal) {
              c = maxVal;
              clearInterval(interval);
            }
            countEl.textContent = c.toLocaleString("en-US");
          }, 25);
        }
      })();
    }

    function loadWidgets() {
      try {
        var path = window.location && window.location.pathname;
        if (path && path !== "/" && path !== "/index.html") {
          return;
        }
      } catch (e) {}

      var statusUrl =
        (PANEL_ORIGIN || "") +
        "/api/widget/subscription-status?store_id=" +
        encodeURIComponent(storeId);

      fetch(statusUrl)
        .then(function (res) {
          return res.json().catch(function () { return {}; });
        })
        .then(function (data) {
          if (data && data.ok && data.suspended) {
            return;
          }

          var showBranding = !!(data && data.ok && data.show_branding);
          buildFilterHeroDom(showBranding);
        })
        .catch(function () {
          buildFilterHeroDom(false);
        });
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", loadWidgets);
    } else {
      loadWidgets();
    }
  } catch (err) {
    console.error("[widgets.js] runtime error:", err);
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
