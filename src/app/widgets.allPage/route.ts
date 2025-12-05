// src/app/widgets.allPage/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const js = `
// widgets.allPage.js — Darb Inline Filter for all pages except home
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

    // ========== Helpers ==========

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

    function parseCurrentUrlFilters() {
      var result = {
        pathSlug: "",
        sCompany: null,
        sCategory: null,
        sYear: null,
        sSection: null,
        keywordLabels: [],
      };
      try {
        var url = new URL(window.location.href);
        var m = url.pathname.match(/\\/category\\/([^/?#]+)/);
        if (m) {
          result.pathSlug = decodeURIComponent(m[1]);
        }
        var sp = url.searchParams;
        result.sCompany = sp.get("filters[company]");
        result.sCategory = sp.get("filters[category]");
        result.sYear = sp.get("filters[category_id]");
        result.sSection = sp.get("filters[brand_id]");
        var keyword = sp.get("keyword");
        if (keyword) {
          result.keywordLabels = keyword.split("||").filter(function (x) {
            return x && x.trim();
          });
        }
      } catch (e) {
        // نسكت
      }
      return result;
    }

    // ========== Build All-Page Filter ==========

    function buildAllPageFilter(showBranding) {
      (async function () {
        // ما نستخدم Choices هنا → select عادي
        var wrap = document.createElement("div");
        wrap.className = "darb-ap-filter-wrap";

        var html =
          '<div class="darb-ap-filter">' +
          '<form id="darb-ap-form" class="darb-ap-form" dir="rtl">' +
          '<select id="darb-ap-brand" class="darb-ap-select" disabled></select>' +
          '<select id="darb-ap-model" class="darb-ap-select" disabled></select>' +
          '<select id="darb-ap-year" class="darb-ap-select" disabled></select>' +
          '<select id="darb-ap-section" class="darb-ap-select" disabled></select>' +
          '<select id="darb-ap-keywords" class="darb-ap-select" multiple disabled></select>' +
          '<button type="button" id="darb-ap-btn" class="darb-ap-btn" disabled>بحث</button>' +
          "</form>" +
          "</div>";

        wrap.innerHTML = html;

        // نحطه تحت <header> لو موجود، وإلا في أعلى البودي
        var headerEl = document.querySelector("header");
        if (headerEl && headerEl.parentNode) {
          if (headerEl.nextSibling) {
            headerEl.parentNode.insertBefore(wrap, headerEl.nextSibling);
          } else {
            headerEl.parentNode.appendChild(wrap);
          }
        } else {
          document.body.insertBefore(wrap, document.body.firstChild);
        }

        // CSS كلاسيكي بكلاسات جديدة
        var styleId = "darb-ap-filter-style";
        if (!document.getElementById(styleId)) {
          var styleEl = document.createElement("style");
          styleEl.id = styleId;
          styleEl.textContent =
            ".darb-ap-filter-wrap{padding:8px 12px;background:#f9fafb;border-bottom:1px solid #e5e7eb;}" +
            ".darb-ap-filter{max-width:1200px;margin:0 auto;}" +
            ".darb-ap-form{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}" +
            ".darb-ap-select{min-width:140px;flex:1 1 140px;padding:6px 8px;border-radius:6px;border:1px solid #d1d5db;background:#fff;font-size:13px;}" +
            ".darb-ap-select:disabled{background:#f3f4f6;color:#9ca3af;}" +
            ".darb-ap-select.darb-ap-error{border-color:#ef4444;}" +
            ".darb-ap-btn{padding:7px 14px;border-radius:999px;border:none;background:#16a34a;color:#f9fafb;font-size:14px;font-weight:600;cursor:pointer;}" +
            ".darb-ap-btn[disabled]{opacity:.5;cursor:not-allowed;}" +
            "@media (max-width:768px){.darb-ap-form{flex-direction:column;align-items:stretch;}.darb-ap-select{flex:1 1 100%;}}" ;
          document.head.appendChild(styleEl);
        }

        var brandSelect = document.getElementById("darb-ap-brand");
        var modelSelect = document.getElementById("darb-ap-model");
        var yearSelect = document.getElementById("darb-ap-year");
        var sectionSelect = document.getElementById("darb-ap-section");
        var keywordsSelect = document.getElementById("darb-ap-keywords");
        var searchBtn = document.getElementById("darb-ap-btn");

        function setOptions(selectEl, list, placeholder, labelKey) {
          while (selectEl.firstChild) selectEl.removeChild(selectEl.firstChild);
          var opt = document.createElement("option");
          opt.value = "";
          opt.textContent = placeholder;
          selectEl.appendChild(opt);

          (list || []).forEach(function (item) {
            var label =
              (labelKey && item[labelKey]) ||
              item.year ||
              item.name_ar ||
              item.name ||
              ("#" + item.id);
            var o = document.createElement("option");
            o.value = String(item.id);
            o.textContent = label;
            selectEl.appendChild(o);
          });
        }

        function clearError(el) {
          el.classList.remove("darb-ap-error");
        }

        function setError(el) {
          el.classList.add("darb-ap-error");
        }

        function updateSearchButtonState() {
          var brandId = brandSelect.value;
          var modelId = modelSelect.value;
          var yearId = yearSelect.value;
          var sectionId = sectionSelect.value;
          var ready = !!(brandId && modelId && yearId && sectionId);
          searchBtn.disabled = !ready;
        }

        function markMissing() {
          var brandId = brandSelect.value;
          var modelId = modelSelect.value;
          var yearId = yearSelect.value;
          var sectionId = sectionSelect.value;

          if (!brandId) setError(brandSelect); else clearError(brandSelect);
          if (!modelId) setError(modelSelect); else clearError(modelSelect);
          if (!yearId) setError(yearSelect); else clearError(yearSelect);
          if (!sectionId) setError(sectionSelect); else clearError(sectionSelect);
        }

        var brands = [];
        var models = [];
        var years = [];
        var sections = [];
        var keywords = [];

        // 1) تحميل الماركات أولاً
        setOptions(brandSelect, [], "جاري تحميل الماركات...", "name_ar");
        brandSelect.disabled = true;
        modelSelect.disabled = true;
        yearSelect.disabled = true;
        sectionSelect.disabled = true;
        keywordsSelect.disabled = true;
        searchBtn.disabled = true;

        try {
          brands = await loadBrands(storeId);
          if (brands.length > 0) {
            setOptions(brandSelect, brands, "اختر الماركة", "name_ar");
            brandSelect.disabled = false;
          } else {
            setOptions(brandSelect, [], "لا توجد ماركات", "name_ar");
          }
        } catch (e) {
          console.error("[widgets.allPage] loadBrands error:", e);
          setOptions(brandSelect, [], "خطأ في تحميل الماركات", "name_ar");
        }

        // 2) تغيّر الماركة → نجيب الموديلات
        brandSelect.addEventListener("change", async function () {
          var brandId = brandSelect.value;
          clearError(brandSelect);

          setOptions(modelSelect, [], "اختر الموديل", "name_ar");
          setOptions(yearSelect, [], "اختر السنة", "year");
          setOptions(sectionSelect, [], "اختر القسم", "name_ar");
          keywordsSelect.innerHTML = "";
          modelSelect.disabled = true;
          yearSelect.disabled = true;
          sectionSelect.disabled = true;
          keywordsSelect.disabled = true;
          searchBtn.disabled = true;

          models = [];
          years = [];
          sections = [];
          keywords = [];

          if (!brandId) {
            updateSearchButtonState();
            return;
          }

          var brandNumeric = Number(brandId);
          if (!Number.isNaN(brandNumeric)) {
            logFilterEvent({
              event_type: "brand_select",
              brand_id: brandNumeric,
            });
          }

          setOptions(modelSelect, [], "جاري تحميل الموديلات...", "name_ar");
          modelSelect.disabled = true;

          try {
            models = await loadModels(storeId, brandId);
            if (models.length > 0) {
              setOptions(modelSelect, models, "اختر الموديل", "name_ar");
              modelSelect.disabled = false;
            } else {
              setOptions(modelSelect, [], "لا توجد موديلات", "name_ar");
            }
          } catch (e) {
            console.error("[widgets.allPage] loadModels error:", e);
            setOptions(modelSelect, [], "خطأ في تحميل الموديلات", "name_ar");
          }

          updateSearchButtonState();
        });

        // 3) تغيّر الموديل → نجيب السنوات
        modelSelect.addEventListener("change", async function () {
          var modelId = modelSelect.value;
          clearError(modelSelect);

          setOptions(yearSelect, [], "اختر السنة", "year");
          setOptions(sectionSelect, [], "اختر القسم", "name_ar");
          keywordsSelect.innerHTML = "";
          yearSelect.disabled = true;
          sectionSelect.disabled = true;
          keywordsSelect.disabled = true;
          searchBtn.disabled = true;

          years = [];
          sections = [];
          keywords = [];

          if (!modelId) {
            updateSearchButtonState();
            return;
          }

          var modelNumeric = Number(modelId);
          if (!Number.isNaN(modelNumeric)) {
            logFilterEvent({
              event_type: "model_select",
              model_id: modelNumeric,
            });
          }

          setOptions(yearSelect, [], "جاري تحميل السنوات...", "year");
          yearSelect.disabled = true;

          try {
            years = await loadYears(storeId, modelId);
            if (years.length > 0) {
              setOptions(yearSelect, years, "اختر السنة", "year");
              yearSelect.disabled = false;
            } else {
              setOptions(yearSelect, [], "لا توجد سنوات", "year");
            }
          } catch (e) {
            console.error("[widgets.allPage] loadYears error:", e);
            setOptions(yearSelect, [], "خطأ في تحميل السنوات", "year");
          }

          updateSearchButtonState();
        });

        // 4) تغيّر السنة → نجيب الأقسام
        yearSelect.addEventListener("change", async function () {
          var yearId = yearSelect.value;
          clearError(yearSelect);

          setOptions(sectionSelect, [], "اختر القسم", "name_ar");
          keywordsSelect.innerHTML = "";
          sectionSelect.disabled = true;
          keywordsSelect.disabled = true;
          searchBtn.disabled = true;

          sections = [];
          keywords = [];

          if (!yearId) {
            updateSearchButtonState();
            return;
          }

          var yearNumeric = Number(yearId);
          if (!Number.isNaN(yearNumeric)) {
            logFilterEvent({
              event_type: "year_select",
              year_id: yearNumeric,
            });
          }

          setOptions(sectionSelect, [], "جاري تحميل الأقسام...", "name_ar");
          sectionSelect.disabled = true;

          try {
            sections = await loadSections(storeId);
            if (sections.length > 0) {
              setOptions(sectionSelect, sections, "اختر القسم", "name_ar");
              sectionSelect.disabled = false;
            } else {
              setOptions(sectionSelect, [], "لا توجد أقسام", "name_ar");
            }
          } catch (e) {
            console.error("[widgets.allPage] loadSections error:", e);
            setOptions(sectionSelect, [], "خطأ في تحميل الأقسام", "name_ar");
          }

          updateSearchButtonState();
        });

        // 5) تغيّر القسم → نجيب الكلمات
        sectionSelect.addEventListener("change", async function () {
          var sectionId = sectionSelect.value;
          clearError(sectionSelect);

          keywordsSelect.innerHTML = "";
          keywordsSelect.disabled = true;
          searchBtn.disabled = true;

          keywords = [];

          if (!sectionId) {
            updateSearchButtonState();
            return;
          }

          var sectionNumeric = Number(sectionId);
          if (!Number.isNaN(sectionNumeric)) {
            logFilterEvent({
              event_type: "section_select",
              section_id: sectionNumeric,
            });
          }

          var brandId = brandSelect.value;
          var modelId = modelSelect.value;
          var yearId = yearSelect.value;

          // نحط placeholder بسيط
          var loadingOpt = document.createElement("option");
          loadingOpt.value = "";
          loadingOpt.textContent = "جاري تحميل الكلمات...";
          keywordsSelect.appendChild(loadingOpt);
          keywordsSelect.disabled = true;

          try {
            keywords = await loadKeywords(
              storeId,
              brandId,
              modelId,
              yearId,
              sectionId
            );

            keywordsSelect.innerHTML = "";

            if ((keywords || []).length > 0) {
              (keywords || []).forEach(function (k) {
                var label = k.name_ar || k.slug || ("#" + k.id);
                var o = document.createElement("option");
                o.value = String(k.id);
                o.textContent = label;
                keywordsSelect.appendChild(o);
              });
              keywordsSelect.disabled = false;
            } else {
              var opt = document.createElement("option");
              opt.value = "";
              opt.textContent = "لا توجد كلمات محددة";
              keywordsSelect.appendChild(opt);
              keywordsSelect.disabled = true;
            }
          } catch (e) {
            console.error("[widgets.allPage] loadKeywords error:", e);
            keywordsSelect.innerHTML = "";
            var optErr = document.createElement("option");
            optErr.value = "";
            optErr.textContent = "خطأ في تحميل الكلمات";
            keywordsSelect.appendChild(optErr);
            keywordsSelect.disabled = true;
          }

          updateSearchButtonState();
        });

        // تغيير الكلمات (multi-select، بس نستخدمها في الـ URL)
        keywordsSelect.addEventListener("change", function () {
          clearError(keywordsSelect);
        });

        // ===== زر البحث =====
        searchBtn.addEventListener("click", async function () {
          var brandId = brandSelect.value;
          var modelId = modelSelect.value;
          var yearId = yearSelect.value;
          var sectionId = sectionSelect.value;

          if (!brandId || !modelId || !yearId || !sectionId) {
            markMissing();
            return;
          }

          // نجيب الكائنات عشان نعرف السلاجات و IDs تبع سلة
          var brandObj =
            brands.find(function (b) {
              return String(b.id) === String(brandId);
            }) || null;

          var modelRow =
            models.find(function (m) {
              return String(m.id) === String(modelId);
            }) || null;

          var yearRow =
            years.find(function (y) {
              return String(y.id) === String(yearId);
            }) || null;

          var sectionRow =
            sections.find(function (s) {
              return String(s.id) === String(sectionId);
            }) || null;

          var carSlug =
            (modelRow && modelRow.slug) ||
            (brandObj && brandObj.slug) ||
            "قطع-غيار";

          var sallaCompanyId =
            (brandObj && brandObj.salla_company_id) || brandId;
          var sallaCategoryId =
            (modelRow && modelRow.salla_category_id) || modelId;
          var sallaYearId =
            (yearRow && yearRow.salla_year_id) || yearId;
          var sallaSectionId =
            (sectionRow && sectionRow.salla_section_id) || sectionId;

          // الكلمات المختارة → لابل فقط
          var selectedKeywordIds = Array.prototype.slice
            .call(keywordsSelect.selectedOptions || [])
            .map(function (o) {
              return o.value;
            })
            .filter(function (v) {
              return v;
            });

          var keywordLabels = [];
          selectedKeywordIds.forEach(function (id) {
            var k = (keywords || []).find(function (kw) {
              return String(kw.id) === String(id);
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

          // نفس الأحداث
          logFilterEvent({
            event_type: "search_submit",
            brand_id: !Number.isNaN(brandNumeric) ? brandNumeric : null,
            model_id: !Number.isNaN(modelNumeric) ? modelNumeric : null,
            year_id: !Number.isNaN(yearNumeric) ? yearNumeric : null,
            section_id: !Number.isNaN(sectionNumeric) ? sectionNumeric : null,
            keyword_ids: [],
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

        // 6) Prefill من الـ URL الحالي (best effort)
        var urlInfo = parseCurrentUrlFilters();

        // نحاول نطبق الموجود في URL خطوة خطوة بدون ما نعلق
        try {
          // نحدد البراند
          var preBrand = null;
          if (urlInfo.sCompany) {
            preBrand = brands.find(function (b) {
              return (
                String(b.salla_company_id) === String(urlInfo.sCompany) ||
                String(b.id) === String(urlInfo.sCompany)
              );
            });
          }
          if (!preBrand && urlInfo.pathSlug) {
            preBrand = brands.find(function (b) {
              return String(b.slug) === String(urlInfo.pathSlug);
            });
          }

          if (!preBrand) {
            return; // لا نعرف البراند → نخليها فاضية
          }

          // نطبق البراند
          brandSelect.value = String(preBrand.id);
          brandSelect.dispatchEvent(new Event("change"));

          // ننتظر شوية عشان models تنجاب (شبكة)
          setTimeout(async function () {
            if (!models.length) return;

            var preModel = null;

            if (urlInfo.sCategory) {
              preModel = models.find(function (m) {
                return (
                  String(m.salla_category_id) === String(urlInfo.sCategory) ||
                  String(m.id) === String(urlInfo.sCategory)
                );
              });
            }

            // لو ما فيه category بس فيه pathSlug وما كان براند → ممكن يكون موديل
            if (!preModel && urlInfo.pathSlug) {
              preModel = models.find(function (m) {
                return String(m.slug) === String(urlInfo.pathSlug);
              });
            }

            if (!preModel) return;

            modelSelect.value = String(preModel.id);
            modelSelect.dispatchEvent(new Event("change"));

            setTimeout(async function () {
              if (!years.length) return;

              var preYear = null;

              if (urlInfo.sYear) {
                preYear = years.find(function (y) {
                  return (
                    String(y.salla_year_id) === String(urlInfo.sYear) ||
                    String(y.id) === String(urlInfo.sYear)
                  );
                });
              }

              if (!preYear && urlInfo.pathSlug) {
                preYear = years.find(function (y) {
                  return String(y.slug) === String(urlInfo.pathSlug);
                });
              }

              if (!preYear) return;

              yearSelect.value = String(preYear.id);
              yearSelect.dispatchEvent(new Event("change"));

              setTimeout(async function () {
                if (!sections.length) return;

                var preSection = null;
                if (urlInfo.sSection) {
                  preSection = sections.find(function (s) {
                    return (
                      String(s.salla_section_id) === String(urlInfo.sSection) ||
                      String(s.id) === String(urlInfo.sSection)
                    );
                  });
                }

                if (!preSection) return;

                sectionSelect.value = String(preSection.id);
                sectionSelect.dispatchEvent(new Event("change"));

                // لو فيه keyword في الرابط: نخزّنه، بس تطبيقه يعتمد على تحميل keywords
                if (urlInfo.keywordLabels && urlInfo.keywordLabels.length) {
                  setTimeout(function () {
                    if (!(keywords && keywords.length)) return;
                    // نحاول نطابق بالاسم
                    var selectedIds = [];
                    urlInfo.keywordLabels.forEach(function (label) {
                      var k = keywords.find(function (kw) {
                        var name = kw.name_ar || kw.slug || ("#" + kw.id);
                        return name === label;
                      });
                      if (k) {
                        selectedIds.push(String(k.id));
                      }
                    });
                    if (!selectedIds.length) return;
                    Array.prototype.forEach.call(
                      keywordsSelect.options,
                      function (opt) {
                        opt.selected =
                          selectedIds.indexOf(String(opt.value)) !== -1;
                      }
                    );
                  }, 700);
                }
              }, 700);
            }, 700);
          }, 500);
        } catch (e) {
          console.error("[widgets.allPage] prefill error:", e);
        }
      })();
    }

    function loadAllPageWidget() {
      try {
        var path = window.location && window.location.pathname;
        if (!path) return;
        if (path === "/" || path === "/index.html") {
          // الصفحة الرئيسية لها widgets.js الخاص فيها
          return;
        }
      } catch (e) {
        // نسكت
      }

      var statusUrl =
        (PANEL_ORIGIN || "") +
        "/api/widget/subscription-status?store_id=" +
        encodeURIComponent(storeId);

      fetch(statusUrl)
        .then(function (res) {
          return res.json().catch(function () {
            return {};
          });
        })
        .then(function (data) {
          if (data && data.ok && data.suspended) {
            // المتجر موقوف → لا نظهر الفلتر
            return;
          }
          var showBranding = !!(data && data.ok && data.show_branding);
          buildAllPageFilter(showBranding);
        })
        .catch(function () {
          buildAllPageFilter(false);
        });
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
