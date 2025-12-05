// src/app/widgets-mobile.js/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const js = `
// widgets-mobile.js — Darb Advanced Car Picker (DB-based)
(function () {
  try {
    // نحدد السكربت الحالي + storeId + secret + PANEL_ORIGIN + API_BASE
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

    // =========== بوب اب للجوال ======= ADVANCED CAR PICKER (BUTTON + FULLSCREEN POPUP) ==================
    function buildAdvancedSearchButton(widget) {
      var cfg = widget.config || {};
      var searchCfg = cfg.search || {};
      var pos = cfg.position || {};

      // Firestore انشطب — ما نستخدمه
      var maxParts = Number(searchCfg.maxParts || 5);
      var targetDomain = (searchCfg.targetDomain || "https://darb.com.sa").replace(
        /\/+$/,
        ""
      );

      var buttonLabel =
        typeof cfg.label === "string" ? cfg.label : "اختيار السيارة";

      // 👇 بدل SECTION_OPTIONS من فايربيس → نبني الشجرة من API قاعدة بياناتك
      var SECTION_TREE = {};
      var CATEGORIES = [];
      var ALL_SECTIONS = [];

      async function loadData() {
        // 1) حمل الأقسام مرة واحدة
        ALL_SECTIONS = await loadSections(storeId);

        var brands = await loadBrands(storeId);
        SECTION_TREE = {};
        CATEGORIES = [];

        for (var i = 0; i < brands.length; i++) {
          var b = brands[i];
          var brandKey = String(b.id);

          var brandNode: any = {
            _meta: {
              id: b.id,
              slug: (b.slug || "").trim(),
              name: b.name_ar || b.name || "",
              carOrder: [],
            },
          };

          SECTION_TREE[brandKey] = brandNode;

          var brandObj = {
            id: b.id,
            slug: (b.slug || "").trim(),
            name: b.name_ar || b.name || "",
            children: [],
          };

          var models = await loadModels(storeId, b.id);

          for (var j = 0; j < models.length; j++) {
            var m = models[j];
            var carKey = String(m.id);

            var carMeta = {
              id: m.id,
              slug: (m.slug || "").trim(),
              name: m.name_ar || m.name || "",
            };

            var years = await loadYears(storeId, m.id);
            var yearsArr = (years || []).map(function (yr: any) {
              return {
                id: yr.id,
                name: String(yr.year),
                slug: (yr.slug || "").trim(),
              };
            });

            // نركّب sections بدون options (بنجيبها لاحقاً من /keywords)
            var mappedSections = (ALL_SECTIONS || []).map(function (s: any) {
              return {
                id: s.id,
                slug: (s.slug || "").trim(),
                name: s.name_ar || s.name || "",
                options: [], // بنعبيها عند اختيار القسم
              };
            });

            brandNode[carKey] = {
              _meta: carMeta,
              years: yearsArr,
              sections: mappedSections,
            };

            var carObj: any = {
              id: carMeta.id,
              slug: carMeta.slug,
              name: carMeta.name,
              children: yearsArr.slice(),
            };

            // نحتاج brandKey & carKey عشان نرجع لنفس الـ node لاحقاً
            carObj.__brandKey = brandKey;
            carObj.__carKey = carKey;

            brandObj.children.push(carObj);
          }

          CATEGORIES.push(brandObj);
        }
      }

      function getRawCarNode(selectedType) {
        if (
          !selectedType ||
          !selectedType.__brandKey ||
          !selectedType.__carKey
        )
          return null;
        var brandNode = SECTION_TREE[selectedType.__brandKey];
        if (!brandNode) return null;
        var carNode = brandNode[selectedType.__carKey];
        return carNode && carNode._meta ? carNode : null;
      }

      function getSectionsOfSelectedCar() {
        var rawCar = getRawCarNode(state.type);
        var secs = Array.isArray(rawCar && rawCar.sections)
          ? rawCar.sections
          : [];
        return secs.map(function (s) {
          return {
            id: s.id,
            slug: s.slug,
            name: s.name,
            options: Array.isArray(s.options) ? s.options.slice() : [],
          };
        });
      }

      // ============ UI + منطق (نفس سكربت اختيار السيارة تقريباً) ============

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

      var state = {
        brand: null,
        type: null,
        model: null,
        section: null,
        options: [],
      };
      var step = 0;

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

      function renderStep(newStep) {
        step = newStep;
        setProgressBar(step);
        listDiv.innerHTML = "";
        searchInput.value = "";
        confirmBtn.style.display = "none";
        selectedOptionsDiv.style.display = "none";
        selectedOptionsDiv.innerHTML = "";
        crumbs.innerHTML = "";

        if (state.brand)
          crumbs.innerHTML += "🏢 " + (state.brand.name || "—") + " / ";
        if (state.type) crumbs.innerHTML += (state.type.name || "—") + " / ";
        if (state.model) crumbs.innerHTML += (state.model.name || "—") + " / ";
        if (state.section)
          crumbs.innerHTML += (state.section.name || "—") + " / ";

        if (step === 0) {
          CATEGORIES.forEach(function (brand) {
            var btn = document.createElement("button");
            btn.textContent = brand.name || "—";
            if (state.brand && state.brand.id === brand.id)
              btn.className = "selected";
            btn.onclick = function () {
              state.brand = brand;
              state.type = null;
              state.model = null;
              state.section = null;
              state.options = [];
              renderStep(1);
            };
            listDiv.appendChild(btn);
          });
        } else if (step === 1) {
          (state.brand && state.brand.children ? state.brand.children : []).forEach(
            function (type) {
              var btn = document.createElement("button");
              btn.textContent = type.name;
              if (state.type && state.type.id === type.id)
                btn.className = "selected";
              btn.onclick = function () {
                state.type = type;
                state.model = null;
                state.section = null;
                state.options = [];
                renderStep(2);
              };
              listDiv.appendChild(btn);
            }
          );
        } else if (step === 2) {
          (state.type && state.type.children ? state.type.children : []).forEach(
            function (model) {
              var btn = document.createElement("button");
              btn.textContent = model.name;
              if (state.model && state.model.id === model.id)
                btn.className = "selected";
              btn.onclick = function () {
                state.model = model;
                state.section = null;
                state.options = [];
                renderStep(3);
              };
              listDiv.appendChild(btn);
            }
          );
        } else if (step === 3) {
          var sections = getSectionsOfSelectedCar();
          sections.forEach(function (section) {
            var btn = document.createElement("button");
            btn.textContent = section.name;
            if (state.section && state.section.id === section.id)
              btn.className = "selected";

            btn.onclick = async function () {
              state.section = section;
              state.options = [];

              // هنا التغيير الوحيد الحقيقي: نجيب options (القطع) من API بدل ما تكون جاهزة من Firestore
              try {
                var brandId = state.brand.id;
                var modelId = state.type.id;
                var yearId = state.model.id;
                var sectionId = section.id;

                var yearNumeric = Number(yearId);
                if (!Number.isNaN(yearNumeric)) {
                  // لو تحب تضيف event تاني هنا
                }

                var kws = await loadKeywords(
                  storeId,
                  brandId,
                  modelId,
                  yearId,
                  sectionId
                );

                section.options = (kws || []).map(function (k) {
                  return k.name_ar || k.slug || ("#" + k.id);
                });
              } catch (e) {
                section.options = [];
              }

              renderStep(4);
            };

            listDiv.appendChild(btn);
          });
        } else if (step === 4) {
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

          var options = Array.isArray(state.section && state.section.options)
            ? state.section.options
            : [];
          options.forEach(function (option) {
            var btn = document.createElement("button");
            btn.textContent = option;
            btn.className =
              state.options.indexOf(option) >= 0 ? "selected" : "";
            btn.onclick = function () {
              if (state.options.indexOf(option) < 0) {
                if (state.options.length < maxParts) state.options.push(option);
              } else {
                state.options = state.options.filter(function (x) {
                  return x !== option;
                });
              }
              renderStep(4);
            };
            listDiv.appendChild(btn);
          });

          confirmBtn.onclick = async function () {
            var carNodeRaw = getRawCarNode(state.type);
            var carMeta = (carNodeRaw && carNodeRaw._meta) || {};
            var yearNode = state.model;
            var sectionObj = state.section;
            var brandMeta = state.brand || {};

            if (
              !brandMeta.id ||
              !carMeta.id ||
              !carMeta.slug ||
              !yearNode ||
              !yearNode.id ||
              !sectionObj ||
              !sectionObj.id
            ) {
              alert(
                "ناقص معرّفات: تأكد من اختيار الشركة والسيارة والسنة والقسم وأن الـ slug موجود."
              );
              return;
            }

            var companyId = brandMeta.id;
            var carSlug = (carMeta.slug || "").trim();
            var categoryId = carMeta.id;
            var modelId = yearNode.id;
            var sectionId = sectionObj.id;

            var url =
              targetDomain +
              "/category/" +
              encodeURIComponent(carSlug) +
              "?filters[company]=" +
              encodeURIComponent(companyId) +
              "&filters[category]=" +
              encodeURIComponent(categoryId) +
              "&filters[category_id]=" +
              encodeURIComponent(modelId) +
              "&filters[brand_id]=" +
              encodeURIComponent(sectionId);

            if (state.options && state.options.length) {
              url +=
                "&keyword=" + encodeURIComponent(state.options.join("||"));
            }

            if (url.indexOf("undefinedhttps://") === 0) {
              url = url.replace("undefined", "");
            }

            try {
              var brandNumeric = Number(companyId);
              var modelNumeric = Number(categoryId);
              var yearNumeric = Number(modelId);
              var sectionNumeric = Number(sectionId);

              logFilterEvent({
                event_type: "search_submit_popup",
                brand_id: !Number.isNaN(brandNumeric) ? brandNumeric : null,
                model_id: !Number.isNaN(modelNumeric) ? modelNumeric : null,
                year_id: !Number.isNaN(yearNumeric) ? yearNumeric : null,
                section_id: !Number.isNaN(sectionNumeric) ? sectionNumeric : null,
                keyword_ids: [],
                meta: {
                  page_url: window.location.href,
                  target_url: url,
                  from: "advanced_popup",
                  has_keywords: state.options && state.options.length > 0,
                  keyword_labels: state.options.slice(),
                },
              });
            } catch (e) {}

            window.location.href = url;
          };
        }

        searchInput.oninput = function () {
          var val = this.value.trim();
          Array.prototype.forEach.call(listDiv.children, function (btn) {
            btn.style.display =
              !val || btn.textContent.indexOf(val) !== -1 ? "" : "none";
          });
        };

        backBtn.style.display = step > 0 ? "" : "none";
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
        loadData()
          .then(function () {
            renderStep(0);
          })
          .catch(function (e) {
            console.error(e);
            alert(
              "تعذر تحميل البيانات من /api/widget — تأكد من الإعدادات."
            );
            renderStep(0);
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

    // نشغل البوب أب مباشرة زي السابق
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
