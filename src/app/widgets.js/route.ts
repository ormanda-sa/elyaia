// src/app/widgets.js/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const js = `
// widgets.js — Darb Filter Hero (stable + events)
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

    // سر الأحداث من data-event-secret (اختياري)
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
        // لا نرسل كوكيز عشان نخفف مشاكل CORS
        credentials: "omit",
        ...(options || {}),
      });
      if (!res.ok) throw new Error("Request failed: " + res.status);
      return res.json();
    }

    async function loadBrands(storeId) {
      var data = await fetchJson(
        API_BASE + "/brands?store_id=" + encodeURIComponent(storeId)
      );
      return data.brands || [];
    }

    async function loadModels(storeId, brandId) {
      var data = await fetchJson(
        API_BASE +
          "/models?store_id=" +
          encodeURIComponent(storeId) +
          "&brand_id=" +
          encodeURIComponent(brandId)
      );
      return data.models || [];
    }

    async function loadYears(storeId, modelId) {
      var data = await fetchJson(
        API_BASE +
          "/years?store_id=" +
          encodeURIComponent(storeId) +
          "&model_id=" +
          encodeURIComponent(modelId)
      );
      return data.years || [];
    }

    async function loadSections(storeId /*, yearId */) {
      var data = await fetchJson(
        API_BASE + "/sections?store_id=" + encodeURIComponent(storeId)
      );
      return data.sections || [];
    }

    async function loadKeywords(
      storeId,
      brandId,
      modelId,
      yearId,
      sectionId
    ) {
      var params = new URLSearchParams();
      params.set("store_id", storeId);
      params.set("brand_id", brandId);
      params.set("model_id", modelId);
      params.set("year_id", yearId);
      params.set("section_id", sectionId);

      var data = await fetchJson(API_BASE + "/keywords?" + params.toString());
      return data.keywords || [];
    }

    // ========== جزء الأحداث (خفيف) ==========

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
      } catch (e) {
        // نسكت
      }
    }

    // ========== نهاية الأحداث ==========

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

        var heroTitle = "ابحث عن قطع غيار سيارتك";
        var bgImage = "https://static.darb.com.sa/hero-bg/shocks.webp";
        var counterTarget = 181825;

        var wrap = document.createElement("div");
        wrap.className = "widgets-filter-hero-wrap";

        var html = '\\
    <div class="hero-section widgets-filter-hero">\\
      <div class="hero-bg-img" style="background-image:url(' +
          bgImage.replace(/"/g, '\\"') +
          ');"></div>\\
      <div id="custom-filter-hero">\\
        <div class="hero-title-filter">\\
          <div class="hero-filter-head">' +
          heroTitle.replace(/</g, "&lt;") +
          '</div>\\
          <div class="hero-filter-desc">\\
            ابحث بين <span id="countUp" style="color:#e5202a;font-weight:700;">0</span> قطعة غيار لجميع سيارات تويوتا الأصلية واليابانية والتجارية<br>\\
            <span style="color:#2563eb;font-weight:600;">شحن سريع خلال 4-6 أيام</span> وسعر منافس جداً <span class="emoji-bounce">🚚</span><span class="emoji-bounce">🔥</span><br/>\\
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

        // ==== نركّب الودجت تحت <header> مباشرة ====
        var headerEl = document.querySelector("header");
        if (headerEl && headerEl.parentNode) {
          if (headerEl.nextSibling) {
            headerEl.parentNode.insertBefore(wrap, headerEl.nextSibling);
          } else {
            headerEl.parentNode.appendChild(wrap);
          }
        } else {
          // لو ما فيه هيدر لأي سبب، نرجّعه لنهاية البودي زي قبل
          document.body.appendChild(wrap);
        }

        // إظهار/إخفاء رابط Darb حسب showBranding
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

        // نخلي مؤشر الماوس يوحي أنه زر
        if (filterBtn) {
          filterBtn.style.cursor = "pointer";
        }

        var currentCategory = null;
        var currentModel = null;

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

        // 1) الماركات
        // أولاً نحط حالة "جاري التحميل..."
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
            // ما فيه أي ماركات
            setChoicesData(companyChoices, [], "لا توجد خيارات");
            company.disabled = true;
            companyChoices.disable();
          }
        } catch (e) {
          setChoicesData(companyChoices, [], "خطأ في تحميل الماركات");
          company.disabled = true;
          companyChoices.disable();
        }

        // 2) الشركة → الموديل (+ event)
        company.addEventListener("change", async function () {
          var brandId = companyChoices.getValue(true);

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
            return;
          }

          var brandNumeric = Number(brandId);
          if (!Number.isNaN(brandNumeric)) {
            logFilterEvent({
              event_type: "brand_select",
              brand_id: brandNumeric,
            });
          }

          // حالة "جاري التحميل..." للموديلات
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
              // ما فيه موديلات
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
        });

        // 3) الموديل → السنة (+ event)
        category.addEventListener("change", async function () {
          var categoryId = categoryChoices.getValue(true);

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
            return;
          }

          var modelNumeric = Number(categoryId);
          if (!Number.isNaN(modelNumeric)) {
            logFilterEvent({
              event_type: "model_select",
              model_id: modelNumeric,
            });
          }

          // حالة "جاري التحميل..." للسنوات
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
        });

        // 4) السنة → القسم (+ event)
        model.addEventListener("change", async function () {
          var modelId = modelChoices.getValue(true);

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
            return;
          }

          var yearNumeric = Number(modelId);
          if (!Number.isNaN(yearNumeric)) {
            logFilterEvent({
              event_type: "year_select",
              year_id: yearNumeric,
            });
          }

          // حالة "جاري التحميل..." للأقسام
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
        });

        // 5) القسم → الكلمات (+ event section_select فقط)
        section.addEventListener("change", async function () {
          var sectionId = sectionChoices.getValue(true);

          partsChoices.clearStore();
          parts.disabled = true;
          filterBtn.disabled = true;

          if (!sectionId) {
            partsChoices.disable();
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

          // حالة "جاري التحميل..." للقطع
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
              // لا توجد كلمات / قطع
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

            // زر البحث يشتغل حتى لو ما فيه كلمات
            filterBtn.disabled = false;
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
            filterBtn.disabled = false;
          }
        });

        // ===== زر البحث =====
        filterBtn.addEventListener("click", async function () {
          var brandId   = companyChoices.getValue(true);
          var modelId   = categoryChoices.getValue(true);
          var yearId    = modelChoices.getValue(true);
          var sectionId = sectionChoices.getValue(true);

          if (!brandId || !modelId || !yearId || !sectionId) {
            alert("حدد كل الفلاتر أولاً");
            return;
          }

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

          logFilterEvent({
            event_type: "search_submit",
            brand_id:   !Number.isNaN(brandNumeric)   ? brandNumeric   : null,
            model_id:   !Number.isNaN(modelNumeric)   ? modelNumeric   : null,
            year_id:    !Number.isNaN(yearNumeric)    ? yearNumeric    : null,
            section_id: !Number.isNaN(sectionNumeric) ? sectionNumeric : null,
            keyword_ids: keywordIdsNumeric,
            meta: {
              page_url: window.location.href,
              target_url: url,
              has_keywords: keywordIdsNumeric.length > 0,
              keyword_labels: keywordLabels,
            },
          });

          window.location.href = url;
        });

        var countEl = wrap.querySelector("#countUp");
        if (countEl) {
          var maxVal = counterTarget || 181825;
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
      // نخليه يشتغل في الصفحة الرئيسية فقط
      try {
        var path = window.location && window.location.pathname;
        if (path && path !== "/" && path !== "/index.html") {
          return; // باقي الصفحات ما نركب عليها هذا الودجت
        }
      } catch (e) {
        // لو صار أي خطأ نكمل عادي
      }

      // هنا نقرر: نخفي، أو نظهر، أو نظهر مع حقوق
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
            // المتجر موقوف → لا نظهر الودجت
            return;
          }

          var showBranding = !!(data && data.ok && data.show_branding);
          buildFilterHeroDom(showBranding);
        })
        .catch(function () {
          // لو فيه مشكلة في الـ API → نكمّل بدون حقوق
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
