// src/app/widgets-mobile.js/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const js = `
// widgets-mobile.js — Darb Advanced Car Picker (snapshot-based, same logic as widgets.js)
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

    async function fetchJson(url, options) {
      var res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        ...(options || {}),
      });
      if (!res.ok) throw new Error("Request failed: " + res.status);
      return res.json();
    }

    // ===== snapshot بدل API calls منفصلة =====
    var SNAPSHOT = null;

    async function ensureSnapshot(storeId) {
      if (SNAPSHOT) return SNAPSHOT;

      var url =
        SNAPSHOT_BASE +
        "/" +
        encodeURIComponent(storeId) +
        ".json";

      try {
        // simple GET بدون headers خاصة عشان CORS
        var res = await fetch(url, { credentials: "omit" });
        if (!res.ok) {
          throw new Error("Snapshot request failed: " + res.status);
        }
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

    // ===== دوال التحميل من snapshot =====

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
  // 1) جرّب Live من DB (الأفضل) — يحل مشكلة نقص snapshot
  try {
    var url =
      API_BASE +
      "/keywords?store_id=" +
      encodeURIComponent(storeId) +
      "&section_id=" +
      encodeURIComponent(String(sectionId || "")) +
      "&model_id=" +
      encodeURIComponent(String(modelId || ""));

    var data = await fetchJson(url);
    var live = (data && data.keywords) || [];

    console.log("[widgets-mobile] live keywords length:", Array.isArray(live) ? live.length : 0);

    if (Array.isArray(live)) return live;
  } catch (e) {
    console.warn("[widgets-mobile] live keywords failed, fallback to snapshot", e);
  }

  // 2) Fallback: snapshot (نفس منطقك القديم)
  var snap = await ensureSnapshot(storeId);
  var allKeywords = (snap && snap.keywords) || [];

  console.log("[widgets-mobile] allKeywords length:", allKeywords.length);

  var mId = Number(modelId);
  var sId = Number(sectionId);

  var result = allKeywords.filter(function (k) {
    if (!Number.isNaN(mId) && Number(k.model_id) !== mId) return false;
    if (!Number.isNaN(sId) && Number(k.section_id) !== sId) return false;
    return true;
  });

  console.log(
    "[widgets-mobile] filtered keywords length:",
    result.length,
    "for model_id=",
    modelId,
    "section_id=",
    sectionId
  );

  if (result.length > 0) {
    console.log("[widgets-mobile] sample keyword:", result[0]);
  }

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

    // نفس الدالة الأصلية اللي كانت عندك
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

    // =========== بوب اب للجوال ======= ADVANCED CAR PICKER (BUTTON + FULLSCREEN POPUP) ==================
    function buildAdvancedSearchButton(widget) {
      var cfg = widget.config || {};
      var searchCfg = cfg.search || {};
      var pos = cfg.position || {};

      var maxParts = Number(searchCfg.maxParts || 5);
      var targetDomain = (searchCfg.targetDomain || "https://darb.com.sa").replace(
        /\/+$/,
        ""
      );

      var buttonLabel =
        typeof cfg.label === "string" ? cfg.label : "اختيار السيارة";

      // نفس اللي في widgets.js لكن في بوب أب
      var brands = [];
      var models = [];
      var years = [];
      var sections = [];
      var keywords = [];

      var state = {
        brand: null,  // = brandObj
        type: null,   // = modelRow (car)
        model: null,  // = yearRow
        section: null,
        options: [],  // أسماء القطع المختارة (labels)
      };
      var step = 0;

      // زر الفتح
      var openBtn = document.createElement("button");
      openBtn.className = "popup-open-btn";

      if (buttonLabel && buttonLabel.trim()) {
        openBtn.textContent = buttonLabel;
      } else {
        openBtn.innerHTML =
          '<span class="popup-open-icon" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24" width="18" height="18">' +
          '<path fill="currentColor" d="M4 5h16v2H4zm3 6h10v2H7zm3 6h4v2h-4z"></path>' +
          "</svg>" +
          "</span>";
      }

      document.body.appendChild(openBtn);

      // البوب أب
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
      var stepsList = [
        { label: "01" },
        { label: "02" },
        { label: "03" },
        { label: "04" },
        { label: "05" },
      ];

      function setProgressBar(currentStep) {
        progressDiv.innerHTML = stepsList
          .map(function (s, i) {
            return (
              '<div class="popup-step' +
              (i < currentStep ? " done" : "") +
              (i === currentStep ? " current" : "") +
              '" data-step="' +
              i +
              '" ' +
              (i < currentStep ? 'tabindex="0"' : "") +
              ">" +
              '<span class="step-num">' +
              s.label +
              "</span>" +
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
                if (stepIdx < 4) state.options = [];
                if (stepIdx < 3) state.section = null;
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
        if (state.brand)
          crumbs.innerHTML += "🏢 " + (state.brand.name_ar || state.brand.name || "—") + " / ";
        if (state.type)
          crumbs.innerHTML += (state.type.name_ar || state.type.name || "—") + " / ";
        if (state.model)
          crumbs.innerHTML += (String(state.model.year) || state.model.name || "—") + " / ";
        if (state.section)
          crumbs.innerHTML += (state.section.name_ar || state.section.name || "—") + " / ";
      }

      function renderStep(newStep) {
        step = newStep;
        setProgressBar(step);
        listDiv.innerHTML = "";
        searchInput.value = "";
        confirmBtn.style.display = "none";
        selectedOptionsDiv.style.display = "none";
        selectedOptionsDiv.innerHTML = "";
        renderBreadcrumbs();

        if (step === 0) {
          if (!brands.length) {
            setPlaceholder("لا توجد ماركات متاحة حالياً");
            return;
          }
          brands.forEach(function (brand) {
            var btn = document.createElement("button");
            btn.textContent = brand.name_ar || brand.name || "—";
            if (state.brand && state.brand.id === brand.id)
              btn.className = "selected";
            btn.onclick = async function () {
              state.brand = brand;
              state.type = null;
              state.model = null;
              state.section = null;
              state.options = [];
              models = [];
              years = [];
              sections = [];
              keywords = [];
              renderBreadcrumbs();

              setPlaceholder("جاري تحميل الموديلات...");
              try {
                models = await loadModels(storeId, brand.id);
              } catch (_) {
                models = [];
              }
              if (!models.length) {
                setPlaceholder("لا توجد موديلات لهذه الماركة");
              } else {
                renderStep(1);
              }
            };
            listDiv.appendChild(btn);
          });
        } else if (step === 1) {
          if (!models.length) {
            setPlaceholder("لا توجد موديلات متاحة");
            return;
          }
          models.forEach(function (m) {
            var btn = document.createElement("button");
            btn.textContent = m.name_ar || m.name || "—";
            if (state.type && state.type.id === m.id)
              btn.className = "selected";
            btn.onclick = async function () {
              state.type = m;
              state.model = null;
              state.section = null;
              state.options = [];
              years = [];
              sections = [];
              keywords = [];
              renderBreadcrumbs();

              var modelNumeric = Number(m.id);
              if (!Number.isNaN(modelNumeric)) {
                logFilterEvent({
                  event_type: "model_select_popup",
                  model_id: modelNumeric,
                });
              }

              setPlaceholder("جاري تحميل السنوات...");
              try {
                years = await loadYears(storeId, m.id);
              } catch (_) {
                years = [];
              }
              if (!years.length) {
                setPlaceholder("لا توجد سنوات لهذا الموديل");
              } else {
                renderStep(2);
              }
            };
            listDiv.appendChild(btn);
          });
        } else if (step === 2) {
          if (!years.length) {
            setPlaceholder("لا توجد سنوات متاحة");
            return;
          }
          years.forEach(function (y) {
            var btn = document.createElement("button");
            btn.textContent = String(y.year || y.name);
            if (state.model && state.model.id === y.id)
              btn.className = "selected";
            btn.onclick = async function () {
              state.model = y;
              state.section = null;
              state.options = [];
              sections = [];
              keywords = [];
              renderBreadcrumbs();

              var yearNumeric = Number(y.id);
              if (!Number.isNaN(yearNumeric)) {
                logFilterEvent({
                  event_type: "year_select_popup",
                  year_id: yearNumeric,
                });
              }

              setPlaceholder("جاري تحميل الأقسام...");
              try {
                sections = await loadSections(storeId);
              } catch (_) {
                sections = [];
              }
              if (!sections.length) {
                setPlaceholder("لا توجد أقسام متاحة");
              } else {
                renderStep(3);
              }
            };
            listDiv.appendChild(btn);
          });
        } else if (step === 3) {
          if (!sections.length) {
            setPlaceholder("لا توجد أقسام متاحة");
            return;
          }
          sections.forEach(function (sec) {
            var btn = document.createElement("button");
            btn.textContent = sec.name_ar || sec.name || "—";
            if (state.section && state.section.id === sec.id)
              btn.className = "selected";
            btn.onclick = async function () {
              state.section = sec;
              state.options = [];
              keywords = [];
              renderBreadcrumbs();

              var sectionNumeric = Number(sec.id);
              if (!Number.isNaN(sectionNumeric)) {
                logFilterEvent({
                  event_type: "section_select_popup",
                  section_id: sectionNumeric,
                });
              }

              setPlaceholder("جاري تحميل القطع...");
              try {
                keywords = await loadKeywords(
                  storeId,
                  state.brand.id,
                  state.type.id,
                  state.model.id,
                  sec.id
                );
              } catch (_) {
                keywords = [];
              }
              if (!keywords.length) {
                setPlaceholder("لا توجد كلمات/قطع لهذا القسم، يمكنك تأكيد البحث مباشرة.");
              }
              renderStep(4);
            };
            listDiv.appendChild(btn);
          });
        } else if (step === 4) {
          // اختيار القطع (اختياري)
          selectedOptionsDiv.style.display = "flex";
          confirmBtn.style.display = "block";
          selectedOptionsDiv.innerHTML = "";

          (state.options || []).forEach(function (opt) {
            var tag = document.createElement("span");
            tag.className = "selected-tag";
            tag.textContent = opt;
            var remove = document.createElement("button");
            remove.innerHTML = "×";
            remove.onclick = function () {
              state.options = state.options.filter(function (x) {
                return x !== opt;
              });
              renderStep(4);
            };
            tag.appendChild(remove);
            selectedOptionsDiv.appendChild(tag);
          });

          listDiv.innerHTML = "";
          (keywords || []).forEach(function (k) {
            var label = k.name_ar || k.slug || ("#" + k.id);
            var btn = document.createElement("button");
            btn.textContent = label;
            btn.className =
              state.options.indexOf(label) >= 0 ? "selected" : "";
            btn.onclick = function () {
              if (state.options.indexOf(label) < 0) {
                if (state.options.length < maxParts) state.options.push(label);
              } else {
                state.options = state.options.filter(function (x) {
                  return x !== label;
                });
              }
              renderStep(4);
            };
            listDiv.appendChild(btn);
          });

                    confirmBtn.onclick = async function () {
            var brandObj = state.brand;
            var modelRow = state.type;
            var yearRow = state.model;
            var sectionRow = state.section;

            if (!brandObj || !modelRow || !yearRow || !sectionRow) {
              alert("حدد جميع الخيارات أولاً");
              return;
            }

            var carSlug =
              (modelRow && modelRow.slug) ||
              (brandObj && brandObj.slug) ||
              "قطع-غيار";

            var sallaCompanyId =
              (brandObj && brandObj.salla_company_id) || brandObj.id;
            var sallaCategoryId =
              (modelRow && modelRow.salla_category_id) || modelRow.id;
            var sallaYearId =
              (yearRow && yearRow.salla_year_id) || yearRow.id;
            var sallaSectionId =
              (sectionRow && sectionRow.salla_section_id) || sectionRow.id;

            // state.options = labels (نفس ما هو)
            var keywordLabels = (state.options || []).slice();

            // نطلع IDs بناءً على labels + مصفوفة keywords الحالية
            var keywordIdsNumeric = [];
            (keywords || []).forEach(function (k) {
              var label = k.name_ar || k.slug || ("#" + k.id);
              if (keywordLabels.indexOf(label) !== -1) {
                var numId = Number(k.id);
                if (!Number.isNaN(numId)) {
                  keywordIdsNumeric.push(numId);
                }
              }
            });

            var keywordParam = "";
            if (keywordLabels.length) {
              keywordParam = encodeURIComponent(keywordLabels.join("||"));
            }

            var domain = await resolveStoreDomain(storeId);

            var url =
              domain +
              "/category/"+
              encodeURIComponent(carSlug)+
              "?filters[company]="+
              encodeURIComponent(sallaCompanyId)+
              "&filters[category_cat]="+
              encodeURIComponent(sallaCategoryId)+
              "&filters[category_id]="+
              encodeURIComponent(sallaYearId)+
              "&filters[brand_id]="+
              encodeURIComponent(sallaSectionId);

            if (keywordParam) {
              url +="&keyword="+keywordParam;
            }

            var brandNumeric = Number(brandObj.id);
            var modelNumeric = Number(modelRow.id);
            var yearNumeric = Number(yearRow.id);
            var sectionNumeric = Number(sectionRow.id);

            await logFilterEvent({
              event_type: "search_submit",
              brand_id: !Number.isNaN(brandNumeric) ? brandNumeric : null,
              model_id: !Number.isNaN(modelNumeric) ? modelNumeric : null,
              year_id: !Number.isNaN(yearNumeric) ? yearNumeric : null,
              section_id: !Number.isNaN(sectionNumeric) ? sectionNumeric : null,
              keyword_ids: keywordIdsNumeric, // ← IDs الفعلية للكلمات
              meta: {
                page_url: window.location.href,
                target_url: url,
                from: "advanced_popup",
                has_keywords: keywordLabels.length > 0,
                keyword_labels: keywordLabels, // ← الأسماء (حتى لو أكثر من كلمة)
              },
            });

            window.location.href = url;
          };

        }

        // فلتر البحث في القائمة الحالية
        searchInput.oninput = function () {
          var val = this.value.trim();
          Array.prototype.forEach.call(listDiv.children, function (btn) {
            btn.style.display =
              !val || btn.textContent.indexOf(val) !== -1 ? "" : "none";
          });
        };
      }

      openBtn.onclick = function () {
        openBtn.disabled = true;
        openBtn.textContent = "جار التحميل...";
        popup.classList.add("active");

        state = {
          brand: null,
          type: null,
          model: null,
          section: null,
          options: [],
        };
        brands = [];
        models = [];
        years = [];
        sections = [];
        keywords = [];
        step = 0;
        setPlaceholder("جاري تحميل الماركات...");

        // snapshot-based: نجيب الماركات من JSON
        loadBrands(storeId)
          .then(function (b) {
            brands = b || [];
            if (!brands.length) {
              setPlaceholder("لا توجد ماركات متاحة");
            } else {
              renderStep(0);
            }
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
        if (step === 4) renderStep(3);
        else if (step === 3) {
          state.section = null;
          state.options = [];
          renderStep(2);
        } else if (step === 2) {
          state.model = null;
          state.section = null;
          state.options = [];
          renderStep(1);
        } else if (step === 1) {
          state.type = null;
          state.model = null;
          state.section = null;
          state.options = [];
          renderStep(0);
        } else popup.classList.remove("active");
      };

      popup.onclick = function (e) {
        if (e.target === popup) popup.classList.remove("active");
      };
    }

    // نشغل بوب أب الجوال مباشرة
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
