// src/app/widgets-mobile.js/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const js = `
// widgets-mobile.js — Darb Filters Mobile Popup
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

    async function fetchJson(url, options) {
      var res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
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

    async function loadSections(storeId) {
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

    function injectMobileStyles() {
      var styleId = "darb-mobile-filter-style";
      if (document.getElementById(styleId)) return;

      var css =
        ".darb-m-open-btn{position:fixed;bottom:16px;left:16px;z-index:9999;padding:10px 16px;border-radius:999px;border:none;background:#111827;color:#f9fafb;font-size:14px;display:flex;align-items:center;gap:8px;box-shadow:0 4px 16px rgba(0,0,0,.25);cursor:pointer;}" +
        ".darb-m-open-btn span.darb-m-open-icon{display:inline-flex;align-items:center;justify-content:center;}" +
        ".darb-m-popup-overlay{position:fixed;inset:0;z-index:9998;background:rgba(15,23,42,.8);display:none;align-items:flex-end;justify-content:center;}" +
        ".darb-m-popup-overlay.darb-m-active{display:flex;}" +
        ".darb-m-popup{width:100%;max-height:90%;background:#0b1120;border-radius:18px 18px 0 0;padding:16px 16px 24px;color:#e5e7eb;box-shadow:0 -10px 30px rgba(0,0,0,.4);display:flex;flex-direction:column;gap:12px;}" +
        ".darb-m-header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;}" +
        ".darb-m-title{font-size:16px;font-weight:700;}" +
        ".darb-m-close{background:none;border:none;color:#9ca3af;font-size:20px;cursor:pointer;}" +
        ".darb-m-steps{display:flex;gap:6px;font-size:11px;margin-bottom:4px;}" +
        ".darb-m-step-pill{padding:3px 8px;border-radius:999px;border:1px solid #4b5563;color:#9ca3af;}" +
        ".darb-m-step-pill.darb-m-step-current{background:#10b9811a;border-color:#10b981;color:#e5e7eb;}" +
        ".darb-m-form{display:flex;flex-direction:column;gap:8px;}" +
        ".darb-m-field{display:flex;flex-direction:column;gap:4px;}" +
        ".darb-m-label{font-size:12px;color:#9ca3af;}" +
        ".darb-m-select,.darb-m-multiselect{width:100%;padding:8px 10px;border-radius:8px;border:1px solid #4b5563;background:#020617;color:#e5e7eb;font-size:13px;}" +
        ".darb-m-select.darb-m-error,.darb-m-multiselect.darb-m-error{border-color:#ef4444;}" +
        ".darb-m-help{font-size:11px;color:#6b7280;}" +
        ".darb-m-footer{display:flex;align-items:center;justify-content:space-between;margin-top:8px;gap:8px;}" +
        ".darb-m-badge{font-size:11px;color:#9ca3af;}" +
        ".darb-m-submit{flex:1;padding:9px 12px;border-radius:999px;border:none;background:#16a34a;color:#f9fafb;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;}" +
        ".darb-m-submit[disabled]{opacity:.5;cursor:not-allowed;}" +
        ".darb-m-submit span.dots{display:inline-block;min-width:40px;text-align:center;}" +
        ".darb-m-keywords{min-height:34px;border-radius:8px;border:1px dashed #374151;padding:6px 8px;font-size:12px;color:#9ca3af;background:#020617;}" +
        ".darb-m-keyword-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;}" +
        ".darb-m-tag{padding:3px 7px;border-radius:999px;background:#111827;color:#e5e7eb;font-size:11px;display:inline-flex;align-items:center;gap:4px;}" +
        ".darb-m-tag button{background:none;border:none;color:#9ca3af;font-size:10px;cursor:pointer;}" +
        "@media(min-width:1025px){.darb-m-open-btn{display:none !important;}.darb-m-popup-overlay{display:none !important;}}";

      var styleEl = document.createElement("style");
      styleEl.id = styleId;
      styleEl.textContent = css;
      document.head.appendChild(styleEl);
    }

    function buildMobileFilter() {
      injectMobileStyles();

      var openBtn = document.createElement("button");
      openBtn.className = "darb-m-open-btn";
      openBtn.innerHTML =
        '<span class="darb-m-open-icon" aria-hidden="true">🚗</span>' +
        '<span>بحث متقدم للموبايل</span>';

      document.body.appendChild(openBtn);

      var overlay = document.createElement("div");
      overlay.className = "darb-m-popup-overlay";

      var popup = document.createElement("div");
      popup.className = "darb-m-popup";

      var header = document.createElement("div");
      header.className = "darb-m-header";
      header.innerHTML =
        '<div class="darb-m-title">اختيار السيارة</div>' +
        '<button class="darb-m-close" type="button">×</button>';

      var stepsBar = document.createElement("div");
      stepsBar.className = "darb-m-steps";
      stepsBar.innerHTML =
        '<div class="darb-m-step-pill darb-m-step-current" data-step="1">01 الماركة</div>' +
        '<div class="darb-m-step-pill" data-step="2">02 الموديل</div>' +
        '<div class="darb-m-step-pill" data-step="3">03 السنة</div>' +
        '<div class="darb-m-step-pill" data-step="4">04 القسم</div>';

      var form = document.createElement("div");
      form.className = "darb-m-form";

      function makeField(labelText, selectId) {
        var wrap = document.createElement("div");
        wrap.className = "darb-m-field";
        var label = document.createElement("label");
        label.className = "darb-m-label";
        label.textContent = labelText;
        var select = document.createElement("select");
        select.className = "darb-m-select";
        select.id = selectId;
        wrap.appendChild(label);
        wrap.appendChild(select);
        return { wrap: wrap, select: select };
      }

      var brandField = makeField("اختر الماركة", "darb-m-brand");
      var modelField = makeField("اختر الموديل", "darb-m-model");
      var yearField = makeField("اختر السنة", "darb-m-year");
      var sectionField = makeField("اختر القسم", "darb-m-section");

      var help = document.createElement("div");
      help.className = "darb-m-help";
      help.textContent = "حدد السيارة بشكل صحيح ليظهر لك الفلتر بدقة.";

      var keywordsWrap = document.createElement("div");
      keywordsWrap.className = "darb-m-field";
      var kwLabel = document.createElement("div");
      kwLabel.className = "darb-m-label";
      kwLabel.textContent = "اختياري: حدد القطع المطلوبة";
      var kwBox = document.createElement("div");
      kwBox.className = "darb-m-keywords";
      kwBox.innerHTML =
        '<div>يمكنك اختيار حتى 5 قطع لزيادة دقة النتائج.</div>' +
        '<div class="darb-m-keyword-tags"></div>';
      keywordsWrap.appendChild(kwLabel);
      keywordsWrap.appendChild(kwBox);

      var footer = document.createElement("div");
      footer.className = "darb-m-footer";
      footer.innerHTML =
        '<div class="darb-m-badge">تم تطويره بواسطة Darb Filters</div>' +
        '<button type="button" class="darb-m-submit" disabled>' +
        '<span class="dots">بحث</span>' +
        "</button>";

      form.appendChild(brandField.wrap);
      form.appendChild(modelField.wrap);
      form.appendChild(yearField.wrap);
      form.appendChild(sectionField.wrap);
      form.appendChild(help);
      form.appendChild(keywordsWrap);

      popup.appendChild(header);
      popup.appendChild(stepsBar);
      popup.appendChild(form);
      popup.appendChild(footer);

      overlay.appendChild(popup);
      document.body.appendChild(overlay);

      var closeBtn = header.querySelector(".darb-m-close");
      var submitBtn = footer.querySelector(".darb-m-submit");
      var kwTagsContainer = kwBox.querySelector(".darb-m-keyword-tags");

      var brands = [];
      var models = [];
      var years = [];
      var sections = [];
      var keywords = [];

      var selectedKeywordIds = [];

      function setStep(step) {
        var pills = stepsBar.querySelectorAll(".darb-m-step-pill");
        pills.forEach(function (pill) {
          var s = pill.getAttribute("data-step");
          if (String(s) === String(step)) {
            pill.classList.add("darb-m-step-current");
          } else {
            pill.classList.remove("darb-m-step-current");
          }
        });
      }

      function setFieldError(el, hasError) {
        if (!el) return;
        if (hasError) el.classList.add("darb-m-error");
        else el.classList.remove("darb-m-error");
      }

      function updateSubmitState() {
        var brandId = brandField.select.value;
        var modelId = modelField.select.value;
        var yearId = yearField.select.value;
        var sectionId = sectionField.select.value;

        var ready = !!(brandId && modelId && yearId && sectionId);
        submitBtn.disabled = !ready;
      }

      function markMissingFields() {
        var brandId = brandField.select.value;
        var modelId = modelField.select.value;
        var yearId = yearField.select.value;
        var sectionId = sectionField.select.value;

        setFieldError(brandField.select, !brandId);
        setFieldError(modelField.select, !modelId);
        setFieldError(yearField.select, !yearId);
        setFieldError(sectionField.select, !sectionId);
      }

      function setSelectOptions(selectEl, list, placeholder, labelKey) {
        while (selectEl.firstChild) selectEl.removeChild(selectEl.firstChild);
        var optPlaceholder = document.createElement("option");
        optPlaceholder.value = "";
        optPlaceholder.textContent = placeholder;
        selectEl.appendChild(optPlaceholder);

        (list || []).forEach(function (item) {
          var opt = document.createElement("option");
          var label =
            (labelKey && item[labelKey]) ||
            item.year ||
            item.name_ar ||
            item.name ||
            ("#" + item.id);
          opt.value = String(item.id);
          opt.textContent = label;
          selectEl.appendChild(opt);
        });

        selectEl.value = "";
      }

      function renderKeywordTags() {
        kwTagsContainer.innerHTML = "";
        if (!keywords || !keywords.length || !selectedKeywordIds.length) {
          return;
        }
        selectedKeywordIds.forEach(function (id) {
          var k = keywords.find(function (kk) {
            return String(kk.id) === String(id);
          });
          if (!k) return;
          var tag = document.createElement("span");
          tag.className = "darb-m-tag";
          tag.textContent = k.name_ar || k.slug || ("#" + k.id);
          var btn = document.createElement("button");
          btn.type = "button";
          btn.textContent = "×";
          btn.onclick = function () {
            selectedKeywordIds = selectedKeywordIds.filter(function (x) {
              return String(x) !== String(id);
            });
            renderKeywordTags();
          };
          tag.appendChild(btn);
          kwTagsContainer.appendChild(tag);
        });
      }

      function setButtonLoading(isLoading) {
        var span = submitBtn.querySelector(".dots");
        if (!span) return;
        if (isLoading) {
          submitBtn.disabled = true;
          span.textContent = "جاري التحميل...";
        } else {
          span.textContent = "بحث";
          updateSubmitState();
        }
      }

      async function initBrands() {
        setSelectOptions(brandField.select, [], "جاري التحميل...");
        brandField.select.disabled = true;
        modelField.select.disabled = true;
        yearField.select.disabled = true;
        sectionField.select.disabled = true;

        try {
          brands = await loadBrands(storeId);
          if (brands.length > 0) {
            setSelectOptions(brandField.select, brands, "اختر الماركة", "name_ar");
            brandField.select.disabled = false;
          } else {
            setSelectOptions(brandField.select, [], "لا توجد خيارات");
            brandField.select.disabled = true;
          }
        } catch (e) {
          setSelectOptions(brandField.select, [], "خطأ في تحميل الماركات");
          brandField.select.disabled = true;
        }

        setSelectOptions(modelField.select, [], "اختر الموديل");
        setSelectOptions(yearField.select, [], "اختر السنة");
        setSelectOptions(sectionField.select, [], "اختر القسم");
        updateSubmitState();
      }

      brandField.select.addEventListener("change", async function () {
        var brandId = brandField.select.value;
        setStep(1);
        if (brandId) setFieldError(brandField.select, false);

        setSelectOptions(modelField.select, [], "اختر الموديل");
        setSelectOptions(yearField.select, [], "اختر السنة");
        setSelectOptions(sectionField.select, [], "اختر القسم");
        modelField.select.disabled = true;
        yearField.select.disabled = true;
        sectionField.select.disabled = true;
        selectedKeywordIds = [];
        renderKeywordTags();

        if (!brandId) {
          updateSubmitState();
          return;
        }

        var brandNumeric = Number(brandId);
        if (!Number.isNaN(brandNumeric)) {
          logFilterEvent({
            event_type: "brand_select",
            brand_id: brandNumeric,
          });
        }

        setSelectOptions(modelField.select, [], "جاري التحميل...");
        modelField.select.disabled = true;

        try {
          models = await loadModels(storeId, brandId);
          if (models.length > 0) {
            setSelectOptions(modelField.select, models, "اختر الموديل", "name_ar");
            modelField.select.disabled = false;
            setStep(2);
          } else {
            setSelectOptions(modelField.select, [], "لا توجد خيارات");
            modelField.select.disabled = true;
          }
        } catch (e) {
          setSelectOptions(modelField.select, [], "خطأ في تحميل الموديلات");
          modelField.select.disabled = true;
        }

        updateSubmitState();
      });

      modelField.select.addEventListener("change", async function () {
        var modelId = modelField.select.value;
        if (modelId) setFieldError(modelField.select, false);

        setSelectOptions(yearField.select, [], "اختر السنة");
        setSelectOptions(sectionField.select, [], "اختر القسم");
        yearField.select.disabled = true;
        sectionField.select.disabled = true;
        selectedKeywordIds = [];
        renderKeywordTags();

        if (!modelId) {
          updateSubmitState();
          return;
        }

        var modelNumeric = Number(modelId);
        if (!Number.isNaN(modelNumeric)) {
          logFilterEvent({
            event_type: "model_select",
            model_id: modelNumeric,
          });
        }

        setSelectOptions(yearField.select, [], "جاري التحميل...");
        yearField.select.disabled = true;

        try {
          years = await loadYears(storeId, modelId);
          if (years.length > 0) {
            setSelectOptions(yearField.select, years, "اختر السنة", "year");
            yearField.select.disabled = false;
            setStep(3);
          } else {
            setSelectOptions(yearField.select, [], "لا توجد خيارات");
            yearField.select.disabled = true;
          }
        } catch (e) {
          setSelectOptions(yearField.select, [], "خطأ في تحميل السنوات");
          yearField.select.disabled = true;
        }

        updateSubmitState();
      });

      yearField.select.addEventListener("change", async function () {
        var yearId = yearField.select.value;
        if (yearId) setFieldError(yearField.select, false);

        setSelectOptions(sectionField.select, [], "اختر القسم");
        sectionField.select.disabled = true;
        selectedKeywordIds = [];
        renderKeywordTags();

        if (!yearId) {
          updateSubmitState();
          return;
        }

        var yearNumeric = Number(yearId);
        if (!Number.isNaN(yearNumeric)) {
          logFilterEvent({
            event_type: "year_select",
            year_id: yearNumeric,
          });
        }

        setSelectOptions(sectionField.select, [], "جاري التحميل...");
        sectionField.select.disabled = true;

        try {
          sections = await loadSections(storeId);
          if (sections.length > 0) {
            setSelectOptions(sectionField.select, sections, "اختر القسم", "name_ar");
            sectionField.select.disabled = false;
            setStep(4);
          } else {
            setSelectOptions(sectionField.select, [], "لا توجد خيارات");
            sectionField.select.disabled = true;
          }
        } catch (e) {
          setSelectOptions(sectionField.select, [], "خطأ في تحميل الأقسام");
          sectionField.select.disabled = true;
        }

        updateSubmitState();
      });

      sectionField.select.addEventListener("change", async function () {
        var sectionId = sectionField.select.value;
        if (sectionId) setFieldError(sectionField.select, false);

        selectedKeywordIds = [];
        renderKeywordTags();

        if (!sectionId) {
          updateSubmitState();
          return;
        }

        var sectionNumeric = Number(sectionId);
        if (!Number.isNaN(sectionNumeric)) {
          logFilterEvent({
            event_type: "section_select",
            section_id: sectionNumeric,
          });
        }

        var brandId = brandField.select.value;
        var modelId = modelField.select.value;
        var yearId = yearField.select.value;

        try {
          keywords = await loadKeywords(
            storeId,
            brandId,
            modelId,
            yearId,
            sectionId
          );

          if (!keywords || !keywords.length) {
            kwBox.firstChild.textContent =
              "لا توجد كلمات محددة لهذا القسم، يمكنك البحث مباشرة.";
          } else {
            kwBox.firstChild.textContent =
              "اختر بعض القطع (اختياري) لزيادة دقة النتائج:";
          }
        } catch (e) {
          kwBox.firstChild.textContent = "خطأ في تحميل الكلمات.";
          keywords = [];
        }

        updateSubmitState();
      });

      kwBox.onclick = function () {
        if (!keywords || !keywords.length) return;
        var list = keywords.slice(0, 40);
        var names = list
          .map(function (k) {
            return (k.name_ar || k.slug || ("#" + k.id)) + " (ID:" + k.id + ")";
          })
          .join("\\n");

        var input = window.prompt(
          "اكتب أرقام القطع التي تريد اختيارها (ID) مفصولة بفواصل:\\n\\n" +
            names +
            "\\n\\nمثال: 12, 15, 99"
        );
        if (!input) return;
        var ids = input
          .split(",")
          .map(function (t) {
            return t.trim();
          })
          .filter(Boolean);

        selectedKeywordIds = [];
        ids.forEach(function (idStr) {
          var n = Number(idStr);
          if (!Number.isNaN(n)) {
            var exists = keywords.some(function (k) {
              return Number(k.id) === n;
            });
            if (exists && selectedKeywordIds.length < 5) {
              selectedKeywordIds.push(String(n));
            }
          }
        });

        if (!selectedKeywordIds.length) {
          kwBox.firstChild.textContent =
            "لم يتم اختيار أي قطعة، سيتم البحث بشكل عام.";
        } else {
          kwBox.firstChild.textContent =
            "تم اختيار " + selectedKeywordIds.length + " قطع (يمكن تعديلها).";
        }

        renderKeywordTags();
      };

      submitBtn.addEventListener("click", async function () {
        var brandId = brandField.select.value;
        var modelId = modelField.select.value;
        var yearId = yearField.select.value;
        var sectionId = sectionField.select.value;

        if (!brandId || !modelId || !yearId || !sectionId) {
          markMissingFields();
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

          var sallaCompanyId =
            (brandObj && brandObj.salla_company_id) || brandId;
          var sallaCategoryId =
            (modelRow && modelRow.salla_category_id) || modelId;
          var sallaYearId =
            (yearRow && yearRow.salla_year_id) || yearId;
          var sallaSectionId =
            (sectionRow && sectionRow.salla_section_id) || sectionId;

          var keywordIdsNumeric = selectedKeywordIds
            .map(function (v) {
              return Number(v);
            })
            .filter(function (v) {
              return !Number.isNaN(v);
            });

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

          var brandNumeric = Number(brandId);
          var modelNumeric = Number(modelId);
          var yearNumeric = Number(yearId);
          var sectionNumeric = Number(sectionId);

          logFilterEvent({
            event_type: "search_submit_mobile",
            brand_id: !Number.isNaN(brandNumeric) ? brandNumeric : null,
            model_id: !Number.isNaN(modelNumeric) ? modelNumeric : null,
            year_id: !Number.isNaN(yearNumeric) ? yearNumeric : null,
            section_id: !Number.isNaN(sectionNumeric) ? sectionNumeric : null,
            keyword_ids: keywordIdsNumeric,
            meta: {
              page_url: window.location.href,
              target_url: url,
              has_keywords: keywordIdsNumeric.length > 0,
              keyword_labels: keywordLabels,
              from: "mobile_popup",
            },
          });

          window.location.href = url;
        } catch (err) {
          console.error("[widgets-mobile.js] search click error:", err);
          setButtonLoading(false);
        }
      });

      openBtn.addEventListener("click", function () {
        overlay.classList.add("darb-m-active");
        initBrands();
      });

      function closePopup() {
        overlay.classList.remove("darb-m-active");
      }

      closeBtn.addEventListener("click", closePopup);
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closePopup();
      });
    }

    function loadMobileWidget() {
      try {
        var path = window.location && window.location.pathname;
        if (path && path !== "/" && path !== "/index.html") {
          return;
        }
        if (window.innerWidth && window.innerWidth > 1024) {
          // نخليه للموبايل والأجهزة الصغيرة فقط
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
          buildMobileFilter();
        })
        .catch(function () {
          buildMobileFilter();
        });
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", loadMobileWidget);
    } else {
      loadMobileWidget();
    }
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
