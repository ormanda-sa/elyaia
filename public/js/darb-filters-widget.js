// public/js/darb-filters-widget.js
(function () {
  const API_BASE = "/api/widget";

  async function fetchJson(url, options) {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      ...(options || {}),
    });
    if (!res.ok) throw new Error("Request failed: " + res.status);
    return res.json();
  }

  async function loadBrands(storeId) {
    const data = await fetchJson(
      `${API_BASE}/brands?store_id=${encodeURIComponent(storeId)}`
    );
    return data.brands || [];
  }

  async function loadModels(storeId, brandId) {
    const data = await fetchJson(
      `${API_BASE}/models?store_id=${encodeURIComponent(
        storeId
      )}&brand_id=${encodeURIComponent(brandId)}`
    );
    return data.models || [];
  }

  async function loadYears(storeId, modelId) {
    const data = await fetchJson(
      `${API_BASE}/years?store_id=${encodeURIComponent(
        storeId
      )}&model_id=${encodeURIComponent(modelId)}`
    );
    return data.years || [];
  }

  async function loadSections(storeId, yearId) {
    const data = await fetchJson(
      `${API_BASE}/sections?store_id=${encodeURIComponent(
        storeId
      )}&year_id=${encodeURIComponent(yearId)}`
    );
    return data.sections || [];
  }

  async function loadKeywords(storeId, brandId, modelId, yearId, sectionId) {
    const params = new URLSearchParams();
    params.set("store_id", storeId);
    params.set("brand_id", brandId);
    params.set("model_id", modelId);
    params.set("year_id", yearId);
    params.set("section_id", sectionId);

    const data = await fetchJson(
      `${API_BASE}/keywords?${params.toString()}`
    );
    return data.keywords || [];
  }

  function setChoices(selectEl, list, placeholder, labelKey) {
    if (!selectEl.choices) {
      selectEl.choices = new Choices(selectEl, {
        searchEnabled: true,
        shouldSort: false,
        itemSelectText: "",
        noResultsText: "لا توجد نتائج",
        placeholderValue: placeholder,
        searchPlaceholderValue: "بحث...",
      });
    } else {
      selectEl.choices.clearStore();
    }

    const items = [
      {
        value: "",
        label: placeholder,
        selected: true,
      },
    ].concat(
      (list || []).map((item) => {
        const label =
          item[labelKey] ||
          item.name ||
          item.brand_name ||
          item.model_name ||
          item.year_label ||
          item.section_name ||
          item.keyword_name ||
          `#${item.id}`;
        return {
          value: String(item.id),
          label,
          selected: false,
        };
      })
    );

    selectEl.choices.setChoices(items, "value", "label", true);
  }

  function initPartsChoices(selectEl, maxParts) {
    if (selectEl.choices) {
      selectEl.choices.destroy();
      selectEl.choices = null;
    }
    selectEl.choices = new Choices(selectEl, {
      removeItemButton: true,
      maxItemCount: maxParts || 5,
      placeholder: true,
      placeholderValue: "بحث أو اختيار القطع...",
      searchPlaceholderValue: "بحث عن القطعة...",
      shouldSort: false,
      searchEnabled: true,
      noResultsText: "لا توجد نتائج",
      itemSelectText: "اختر",
      maxItemText: function (count) {
        return "المسموح باختيار " + count + " قطع فقط";
      },
    });
  }

  async function initFilter(root, storeId, options) {
    const baseDomain =
      (options && options.baseDomain) || "https://darb.com.sa";

    const company = root.querySelector("#company");
    const category = root.querySelector("#category");
    const model = root.querySelector("#model");
    const section = root.querySelector("#section");
    const parts = root.querySelector("#parts");
    const filterBtn = root.querySelector("#filter-btn");

    let brands = [];
    let models = [];
    let years = [];
    let sections = [];
    let keywords = [];

    let currentCategory = null;
    let currentModel = null;

    company.disabled = true;
    category.disabled = true;
    model.disabled = true;
    section.disabled = true;
    parts.disabled = true;
    filterBtn.disabled = true;

    // 1) تحميل الماركات
    try {
      brands = await loadBrands(storeId);
      // اسم الشركة بالعربي
      setChoices(company, brands, "اختر الماركة", "name_ar");
      company.disabled = false;
    } catch (e) {
      console.error("loadBrands error", e);
      setChoices(company, [], "خطأ في تحميل الماركات", "name");
      return;
    }

    // 2) تغيير الشركة → تحميل الموديلات
    company.addEventListener("change", async () => {
      const brandId = company.value;
      category.disabled = true;
      model.disabled = true;
      section.disabled = true;
      parts.disabled = true;
      filterBtn.disabled = true;

      setChoices(category, [], "اختر الموديل", "model_name");
      setChoices(model, [], "اختر السنة", "year_label");
      setChoices(section, [], "اختر القسم", "section_name");
      initPartsChoices(parts, options && options.maxParts);

      currentCategory = null;
      currentModel = null;

      if (!brandId) return;

      try {
        models = await loadModels(storeId, brandId);
        setChoices(category, models, "اختر الموديل", "model_name");
        category.disabled = models.length === 0;
      } catch (e) {
        console.error("loadModels error", e);
        setChoices(category, [], "خطأ في تحميل الموديلات", "name");
      }
    });

    // 3) تغيير الموديل → تحميل السنوات
    category.addEventListener("change", async () => {
      const categoryId = category.value;
      model.disabled = true;
      section.disabled = true;
      parts.disabled = true;
      filterBtn.disabled = true;

      setChoices(model, [], "اختر السنة", "year_label");
      setChoices(section, [], "اختر القسم", "section_name");
      initPartsChoices(parts, options && options.maxParts);

      currentCategory = models.find(
        (m) => String(m.id) === String(categoryId)
      );

      if (!categoryId) return;

      try {
        years = await loadYears(storeId, categoryId);
        setChoices(model, years, "اختر السنة", "year_label");
        model.disabled = years.length === 0;
      } catch (e) {
        console.error("loadYears error", e);
        setChoices(model, [], "خطأ في تحميل السنوات", "name");
      }
    });

    // 4) تغيير السنة → تحميل الأقسام
    model.addEventListener("change", async () => {
      const modelId = model.value;
      section.disabled = true;
      parts.disabled = true;
      filterBtn.disabled = true;

      setChoices(section, [], "اختر القسم", "section_name");
      initPartsChoices(parts, options && options.maxParts);

      currentModel = years.find((y) => String(y.id) === String(modelId));

      if (!modelId) return;

      try {
        sections = await loadSections(storeId, modelId);
        setChoices(section, sections, "اختر القسم", "section_name");
        section.disabled = sections.length === 0;
      } catch (e) {
        console.error("loadSections error", e);
        setChoices(section, [], "خطأ في تحميل الأقسام", "name");
      }
    });

    // 5) تغيير القسم → تحميل الكلمات
    section.addEventListener("change", async () => {
      const sectionId = section.value;
      parts.disabled = true;
      filterBtn.disabled = true;
      initPartsChoices(parts, options && options.maxParts);

      if (!sectionId) return;

      const brandId = company.value;
      const categoryId = category.value;
      const modelId = model.value;

      try {
        keywords = await loadKeywords(
          storeId,
          brandId,
          categoryId,
          modelId,
          modelId, // year_id = modelId في API عندك
          sectionId
        );
        setChoices(parts, keywords, "اختر نوع القطعة", "keyword_name");
        parts.disabled = keywords.length === 0;
      } catch (e) {
        console.error("loadKeywords error", e);
        setChoices(parts, [], "خطأ في تحميل الكلمات", "name");
      }
    });

    // 6) تفعيل زر البحث عند وجود كلمة
    parts.addEventListener("change", () => {
      const vals = parts.choices && parts.choices.getValue(true);
      filterBtn.disabled = !vals || !vals.length;
    });

    // 7) زر البحث → بناء الرابط
    filterBtn.addEventListener("click", () => {
      const companyId = company.value;
      const categoryId = category.value;
      const modelId = model.value;
      const sectionId = section.value;

      if (!companyId || !categoryId || !modelId || !sectionId) {
        alert("حدد كل الفلاتر أولاً");
        return;
      }

      const carSlug =
        (currentCategory && currentCategory.slug) ||
        (currentModel && currentModel.slug) ||
        "";

      if (!carSlug) {
        alert("Slug السيارة غير موجود.");
        return;
      }

      let url =
        baseDomain +
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

      const vals = parts.choices && parts.choices.getValue(true);
      if (vals && vals.length) {
        url += "&keyword=" + encodeURIComponent(vals.join("||"));
      }

      window.location.href = url;
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var root = document.querySelector("[data-darb-filter-root]");
    if (!root) return;
    var storeId = root.getAttribute("data-store-id");
    if (!storeId) return;
    initFilter(root, storeId, {
      baseDomain: "https://darb.com.sa",
      maxParts: 5,
    });
  });
})();
