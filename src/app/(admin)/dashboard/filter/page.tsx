// src/app/(admin)/dashboard/filter/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ModelsBulkImportDialog } from "./_components/ModelsBulkImportDialog";
import { YearsBulkImportDialog } from "./_components/YearsBulkImportDialog";
import { KeywordsBulkImportDialog } from "./_components/KeywordsBulkImportDialog";
 import { SnapshotButton } from "./_components/SnapshotButton";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { BrandsTab, Brand, BrandFormState } from "./_components/BrandsTab";
import { ModelsTab, Model, ModelFormState } from "./_components/ModelsTab";
import { YearsTab, YearRow, YearFormState } from "./_components/YearsTab";
import {
  SectionsTab,
  Section,
  SectionFormState,
} from "./_components/SectionsTab";
import {
  KeywordsTab,
  Keyword,
  KeywordFormState,
} from "./_components/KeywordsTab";

type TabKey = "brands" | "models" | "years" | "sections" | "keywords";

function BrandDeleteButton({
  brand,
  onConfirm,
}: {
  brand: Brand;
  onConfirm: () => Promise<void> | void;
}) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canDelete =
    value.trim().toLowerCase() === brand.name_ar.trim().toLowerCase();

  const handleDelete = async () => {
    if (!canDelete) return;
    try {
      setSubmitting(true);
      await onConfirm();
    } finally {
      setSubmitting(false);
      setValue("");
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="destructive"
          className="h-7 rounded-full px-3 text-[11px]"
        >
          حذف الشركة
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-right">
            حذف الشركة {brand.name_ar}؟
          </AlertDialogTitle>
          <AlertDialogDescription className="text-right text-[11px]">
            سيتم حذف الشركة وجميع الموديلات والسنوات والكلمات المرتبطة بها.
            لا يمكن التراجع عن هذه العملية. للمتابعة اكتب اسم الشركة بالضبط كما
            هو:
            <span className="ml-1 font-semibold text-slate-900">
              {brand.name_ar}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="mt-3 space-y-2">
          <label className="block text-right text-[11px] text-slate-600">
            اكتب اسم الشركة للتأكيد
          </label>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-8 rounded-xl text-[12px]"
            placeholder={brand.name_ar}
          />
          {!canDelete && value && (
            <p className="text-right text-[10px] text-red-600">
              يجب أن يطابق النص اسم الشركة تمامًا.
            </p>
          )}
        </div>
        <AlertDialogFooter className="flex flex-row justify_between gap-2">
          <AlertDialogCancel className="text-[11px]">إلغاء</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 text-[11px] hover:bg-red-700"
            disabled={!canDelete || submitting}
            onClick={handleDelete}
          >
            {submitting ? "جارٍ الحذف..." : "تأكيد حذف الشركة"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** الكومبوننت الداخلي: فيه كل useSearchParams/useRouter/useEffect/... */
function FilterSettingsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const brandFromUrl = searchParams.get("brand");
  const tabFromUrl = searchParams.get("tab") as TabKey | null;

  // نخلي التبويب الافتراضي "الموديلات"
  const [activeTab, setActiveTab] = useState<TabKey>("models");

  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [years, setYears] = useState<YearRow[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);

  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(
    null,
  );

  const [brandForm, setBrandForm] = useState<BrandFormState>({ mode: "add" });
  const [modelForm, setModelForm] = useState<ModelFormState>({ mode: "add" });
  const [yearForm, setYearForm] = useState<YearFormState>({ mode: "add" });
  const [sectionForm, setSectionForm] = useState<SectionFormState>({
    mode: "add",
  });
  const [keywordForm, setKeywordForm] = useState<KeywordFormState>({
    mode: "add",
  });

  const [loading, setLoading] = useState<Record<TabKey, boolean>>({
    brands: false,
    models: false,
    years: false,
    sections: false,
    keywords: false,
  });

  const [errors, setErrors] = useState<Record<TabKey, string | null>>({
    brands: null,
    models: null,
    years: null,
    sections: null,
    keywords: null,
  });

  const [globalLoading, setGlobalLoading] = useState(false);

  const selectedBrand = brands.find((b) => b.id === selectedBrandId) || null;
  const selectedModel = models.find((m) => m.id === selectedModelId) || null;
  const selectedSection =
    sections.find((s) => s.id === selectedSectionId) || null;

  const setTabLoading = (tab: TabKey, v: boolean) =>
    setLoading((prev) => ({ ...prev, [tab]: v }));
  const setTabError = (tab: TabKey, msg: string | null) =>
    setErrors((prev) => ({ ...prev, [tab]: msg }));

  async function postJSON(url: string, body: any, tab: TabKey) {
    setTabLoading(tab, true);
    setTabError(tab, null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "خطأ في الطلب");
      }
      return await res.json();
    } catch (e: any) {
      setTabError(tab, e.message || "خطأ غير متوقع");
      throw e;
    } finally {
      setTabLoading(tab, false);
    }
  }

  async function putJSON(url: string, body: any, tab: TabKey) {
    setTabLoading(tab, true);
    setTabError(tab, null);
    try {
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "خطأ في التعديل");
      }
      return await res.json();
    } catch (e: any) {
      setTabError(tab, e.message || "خطأ غير متوقع");
      throw e;
    } finally {
      setTabLoading(tab, false);
    }
  }

  async function deleteJSON(url: string, body: any, tab: TabKey) {
    setTabLoading(tab, true);
    setTabError(tab, null);
    try {
      const res = await fetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "خطأ في الحذف");
      }
      return await res.json();
    } catch (e: any) {
      setTabError(tab, e.message || "خطأ غير متوقع");
      throw e;
    } finally {
      setTabLoading(tab, false);
    }
  }

  // ============ LOADERS ============

  const loadBrands = async () => {
    const tab: TabKey = "brands";
    setTabLoading(tab, true);
    setTabError(tab, null);
    try {
      const res = await fetch(`/api/dashboard/brands`);
      if (!res.ok) throw new Error("فشل جلب الشركات");
      const data = await res.json();
      const list: Brand[] = data.brands || [];
      setBrands(list);
    } catch (e: any) {
      setTabError(tab, e.message || "خطأ غير متوقع");
    } finally {
      setTabLoading(tab, false);
    }
  };

  const loadModels = async () => {
    const tab: TabKey = "models";
    setTabLoading(tab, true);
    setTabError(tab, null);
    try {
      if (!selectedBrandId) {
        setModels([]);
        return;
      }
      const params = new URLSearchParams({
        brand_id: String(selectedBrandId),
      });
      const res = await fetch(`/api/dashboard/models?${params.toString()}`);
      if (!res.ok) throw new Error("فشل جلب الموديلات");
      const data = await res.json();
      const list: Model[] = data.models || [];
      setModels(list);
    } catch (e: any) {
      setTabError(tab, e.message || "خطأ غير متوقع");
    } finally {
      setTabLoading(tab, false);
    }
  };

  const loadYears = async () => {
    const tab: TabKey = "years";
    setTabLoading(tab, true);
    setTabError(tab, null);
    try {
      if (!selectedModelId) {
        setYears([]);
        return;
      }
      const params = new URLSearchParams({
        model_id: String(selectedModelId),
      });
      const res = await fetch(`/api/dashboard/years?${params.toString()}`);
      if (!res.ok) throw new Error("فشل جلب السنوات");
      const data = await res.json();
      const list: YearRow[] = data.years || data.items || [];
      setYears(list);
    } catch (e: any) {
      setTabError(tab, e.message || "خطأ غير متوقع");
    } finally {
      setTabLoading(tab, false);
    }
  };

  const loadSections = async () => {
    const tab: TabKey = "sections";
    setTabLoading(tab, true);
    setTabError(tab, null);
    try {
      const res = await fetch(`/api/dashboard/sections`);
      if (!res.ok) throw new Error("فشل جلب الأقسام");
      const data = await res.json();
      const list: Section[] = data.sections || [];
      setSections(list);
      if (!selectedSectionId && list.length) {
        setSelectedSectionId(list[0].id);
      }
    } catch (e: any) {
      setTabError(tab, e.message || "خطأ غير متوقع");
    } finally {
      setTabLoading(tab, false);
    }
  };

  const loadKeywords = async () => {
    const tab: TabKey = "keywords";
    setTabLoading(tab, true);
    setTabError(tab, null);
    try {
      if (!selectedModelId || !selectedSectionId) {
        setKeywords([]);
        return;
      }
      const params = new URLSearchParams({
        model_id: String(selectedModelId),
        section_id: String(selectedSectionId),
      });
      const res = await fetch(
        `/api/dashboard/keywords?${params.toString()}`,
      );
      if (!res.ok) throw new Error("فشل جلب الكلمات");
      const data = await res.json();
      const list: Keyword[] = data.keywords || [];
      setKeywords(list);
    } catch (e: any) {
      setTabError(tab, e.message || "خطأ غير متوقع");
    } finally {
      setTabLoading(tab, false);
    }
  };

  // ============ EFFECTS ============

  useEffect(() => {
    const allowed: TabKey[] = ["models", "years", "sections", "keywords"];
    if (tabFromUrl && allowed.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    } else {
      setActiveTab("models");
    }
  }, [tabFromUrl]);

  useEffect(() => {
    (async () => {
      setGlobalLoading(true);
      await loadBrands();
      await loadSections();
      setGlobalLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const brandParam = brandFromUrl;
    const list = brands;

    if (brandParam) {
      const id = Number(brandParam);
      if (!Number.isNaN(id)) {
        const exists = list.some((b) => b.id === id);
        if (exists) {
          if (selectedBrandId !== id) {
            setSelectedBrandId(id);
          }
          return;
        }
      }
    }

    if (!brandParam && list.length) {
      const firstId = list[0].id;
      setSelectedBrandId(firstId);

      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("brand", String(firstId));
      if (!params.get("tab")) params.set("tab", "models");
      router.replace(`/dashboard/filter?${params.toString()}`);
    }
  }, [brandFromUrl, brands, selectedBrandId, router, searchParams]);

  useEffect(() => {
    (async () => {
      await loadModels();
      setSelectedModelId(null);
      setYears([]);
      setKeywords([]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrandId]);

  useEffect(() => {
    (async () => {
      await loadYears();
      await loadKeywords();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModelId]);

  useEffect(() => {
    (async () => {
      await loadKeywords();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSectionId]);

  const reloadAll = async () => {
    setGlobalLoading(true);
    await loadBrands();
    await loadSections();
    await loadModels();
    await loadYears();
    await loadKeywords();
    setGlobalLoading(false);
  };

  // ============ CRUD (كلها نفسها) ============

  const submitBrand = async () => {
    const payload = {
      name_ar: brandForm.name_ar?.trim(),
      slug: brandForm.slug?.trim() || null,
      salla_company_id: brandForm.salla_company_id?.trim() || null,
      sort_order:
        brandForm.sort_order !== undefined && brandForm.sort_order !== null
          ? Number(brandForm.sort_order)
          : null,
    };

    if (!payload.name_ar) {
      alert("اسم الشركة مطلوب");
      return;
    }

    if (brandForm.mode === "add") {
      await postJSON("/api/dashboard/brands", payload, "brands");
    } else if (brandForm.mode === "edit" && brandForm.id) {
      await putJSON(
        "/api/dashboard/brands",
        { id: brandForm.id, ...payload },
        "brands",
      );
    }

    setBrandForm({ mode: "add" });
    await loadBrands();
  };

  const editBrand = (b: Brand) => {
    setBrandForm({
      mode: "edit",
      id: b.id,
      name_ar: b.name_ar,
      slug: b.slug,
      salla_company_id: b.salla_company_id,
      sort_order: b.sort_order ?? undefined,
    });
    setActiveTab("brands");
  };

  const deleteBrand = async (b: Brand) => {
    await deleteJSON("/api/dashboard/brands", { id: b.id }, "brands");

    if (selectedBrandId === b.id) {
      setSelectedBrandId(null);
      setSelectedModelId(null);
      setYears([]);
      setKeywords([]);
    }

    await loadBrands();
    await loadModels();
    router.refresh();
  };

  const submitModel = async () => {
    if (!selectedBrandId) {
      alert("اختر شركة أولاً");
      return;
    }

    const payload = {
      brand_id: selectedBrandId,
      name_ar: modelForm.name_ar?.trim(),
      slug: modelForm.slug?.trim() || null,
      salla_category_id: modelForm.salla_category_id?.trim() || null,
      sort_order:
        modelForm.sort_order !== undefined && modelForm.sort_order !== null
          ? Number(modelForm.sort_order)
          : null,
    };

    if (!payload.name_ar) {
      alert("اسم الموديل مطلوب");
      return;
    }

    if (modelForm.mode === "add") {
      await postJSON("/api/dashboard/models", payload, "models");
    } else if (modelForm.mode === "edit" && modelForm.id) {
      await putJSON(
        "/api/dashboard/models",
        { id: modelForm.id, ...payload },
        "models",
      );
    }

    setModelForm({ mode: "add" });
    await loadModels();
    await loadYears();
    await loadKeywords();
  };

  const editModel = (m: Model) => {
    setModelForm({
      mode: "edit",
      id: m.id,
      name_ar: m.name_ar,
      slug: m.slug,
      salla_category_id: m.salla_category_id,
      sort_order: m.sort_order ?? undefined,
    });
    setSelectedBrandId(m.brand_id);
    setSelectedModelId(m.id);
    setActiveTab("models");
  };

  const deleteModel = async (m: Model) => {
    await deleteJSON("/api/dashboard/models", { id: m.id }, "models");
    if (selectedModelId === m.id) {
      setSelectedModelId(null);
      setYears([]);
      setKeywords([]);
    }
    await loadModels();
    await loadYears();
  };

  const submitYear = async () => {
    if (!selectedModelId) {
      alert("اختر موديل أولاً");
      return;
    }

    const payload = {
      model_id: selectedModelId,
      year: yearForm.year?.trim() || "",
      slug: yearForm.slug?.trim() || null,
      salla_year_id: yearForm.salla_year_id?.trim() || null,
      sort_order:
        yearForm.sort_order !== undefined && yearForm.sort_order !== null
          ? Number(yearForm.sort_order)
          : null,
    };

    if (!payload.year) {
      alert("السنة مطلوبة");
      return;
    }

    if (yearForm.mode === "add") {
      await postJSON("/api/dashboard/years", payload, "years");
    } else if (yearForm.mode === "edit" && yearForm.id) {
      await putJSON(
        "/api/dashboard/years",
        { id: yearForm.id, ...payload },
        "years",
      );
    }

    setYearForm({ mode: "add" });
    await loadYears();
  };

  const editYear = (y: YearRow) => {
    setYearForm({
      mode: "edit",
      id: y.id,
      year: y.year,
      slug: y.slug,
      salla_year_id: y.salla_year_id,
      sort_order: y.sort_order ?? undefined,
    });
    setSelectedModelId(y.model_id);
    setActiveTab("years");
  };

  const deleteYear = async (y: YearRow) => {
    await deleteJSON("/api/dashboard/years", { id: y.id }, "years");
    await loadYears();
  };

  const submitSection = async () => {
    const payload = {
      name_ar: sectionForm.name_ar?.trim(),
      slug: sectionForm.slug?.trim() || null,
      salla_section_id: sectionForm.salla_section_id?.trim() || null,
      sort_order:
        sectionForm.sort_order !== undefined && sectionForm.sort_order !== null
          ? Number(sectionForm.sort_order)
          : null,
    };

    if (!payload.name_ar) {
      alert("اسم القسم مطلوب");
      return;
    }

    if (sectionForm.mode === "add") {
      await postJSON("/api/dashboard/sections", payload, "sections");
    } else if (sectionForm.mode === "edit" && sectionForm.id) {
      await putJSON(
        "/api/dashboard/sections",
        { id: sectionForm.id, ...payload },
        "sections",
      );
    }

    setSectionForm({ mode: "add" });
    await loadSections();
    await loadKeywords();
  };

  const editSection = (s: Section) => {
    setSectionForm({
      mode: "edit",
      id: s.id,
      name_ar: s.name_ar,
      slug: s.slug,
      salla_section_id: s.salla_section_id,
      sort_order: s.sort_order ?? undefined,
    });
    setSelectedSectionId(s.id);
    setActiveTab("sections");
  };

  const deleteSection = async (s: Section) => {
    await deleteJSON("/api/dashboard/sections", { id: s.id }, "sections");
    if (selectedSectionId === s.id) {
      setSelectedSectionId(null);
      setKeywords([]);
    }
    await loadSections();
  };

  const submitKeyword = async () => {
    if (!selectedModelId || !selectedSectionId) {
      alert("اختر موديل وقسم أولاً");
      return;
    }

    const payload = {
      model_id: selectedModelId,
      section_id: selectedSectionId,
      name_ar: keywordForm.name_ar?.trim(),
      sort_order:
        keywordForm.sort_order !== undefined &&
        keywordForm.sort_order !== null
          ? Number(keywordForm.sort_order)
          : null,
    };

    if (!payload.name_ar) {
      alert("نص الكلمة مطلوب");
      return;
    }

    if (keywordForm.mode === "add") {
      await postJSON("/api/dashboard/keywords", payload, "keywords");
    } else if (keywordForm.mode === "edit" && keywordForm.id) {
      await putJSON(
        "/api/dashboard/keywords",
        { id: keywordForm.id, ...payload },
        "keywords",
      );
    }

    setKeywordForm({ mode: "add" });
    await loadKeywords();
  };

  const editKeyword = (k: Keyword) => {
    setKeywordForm({
      mode: "edit",
      id: k.id,
      name_ar: k.name_ar,
      sort_order: k.sort_order ?? undefined,
    });
    setActiveTab("keywords");
  };

  const deleteKeyword = async (k: Keyword) => {
    await deleteJSON("/api/dashboard/keywords", { id: k.id }, "keywords");
    await loadKeywords();
  };

  // ============ UI ============

  return (
    <div className="h-full" dir="rtl">
      <Card className="h-full border-none bg-transparent shadow-none">
        <CardHeader className="px-0 pb-3">
          <CardTitle className="text-base font-semibold lg:text-lg">
            إعداد الفلتر الذكي لمتاجر سلة
          </CardTitle>
          <CardDescription className="text-[11px]">
            هنا تضبط الشركات، الموديلات، السنوات، الأقسام، والكلمات المرتبطة
            بالفلاتر.
          </CardDescription>

          {selectedBrand && (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="font-semibold text-slate-900">
                  الشركة الحالية: {selectedBrand.name_ar}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-full px-3 text-[11px]"
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent("sidebar-edit-brand", {
                          detail: selectedBrand,
                        }),
                      );
                    }}
                  >
                    تعديل الشركة
                  </Button>

                  <BrandDeleteButton
                    brand={selectedBrand}
                    onConfirm={() => deleteBrand(selectedBrand)}
                  />
                </div>
              </div>
              <div className="flex flex_wrap items-center gap-2 text-[10px] text-slate-600">
                <span className="rounded-full bg-white px-2 py-0.5 font-mono">
                  slug: {selectedBrand.slug || "—"}
                </span>
                <span className="rounded-full bg-white px-2 py-0.5 font-mono">
                  company.id: {selectedBrand.salla_company_id || "—"}
                </span>
                <span className="rounded-full bg-white px-2 py-0.5">
                  الترتيب: {selectedBrand.sort_order ?? "—"}
                </span>
              </div>
            </div>
          )}
        </CardHeader>

<CardContent className="px-0 pt-0">
  <div className="mb-3 flex items_center justify-between gap-2">
    <div className="text-[11px] text-slate-500">
      {selectedModel && (
        <>
          الموديل الحالي:{" "}
          <span className="font-semibold text-slate-900">
            {selectedModel.name_ar}
          </span>
        </>
      )}
    </div>
    <Button
      type="button"
      size="sm"
      className="rounded-full"
      onClick={reloadAll}
      disabled={globalLoading}
    >
      {globalLoading ? "جارٍ التحديث..." : "إعادة تحميل البيانات"}
    </Button>
  </div>

  {/* بلوك إدارة بيانات الودجت + زر التوليد */}
  <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
    <h2 className="text-sm font-semibold text-slate-900">
      بيانات الودجت (ملف JSON)
    </h2>
    <p className="text-xs text-slate-600">
      بعد ما تعدّل الشركات أو الموديلات أو السنوات أو الأقسام أو الكلمات،
      اضغط الزر عشان نحدّث ملف JSON اللي تستخدمه سكربتات الودجت في متجرك.
    </p>
    <SnapshotButton />
  </div>

          <Tabs
            dir="rtl"
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as TabKey)}
          >
            <TabsList className="mb-4 grid w-full grid-cols-4">
              <TabsTrigger value="models" className="text-xs">
                الموديلات
              </TabsTrigger>
              <TabsTrigger value="years" className="text-xs">
                السنوات
              </TabsTrigger>
              <TabsTrigger value="sections" className="text-xs">
                الأقسام
              </TabsTrigger>
              <TabsTrigger value="keywords" className="text-xs">
                الكلمات
              </TabsTrigger>
            </TabsList>

            {Object.values(errors).some(Boolean) && (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                في خطأ حاصل في إحدى التبويبات، تأكد من الحقول قبل الحفظ.
              </div>
            )}

            <TabsContent value="models" className="mt-0">
              <div className="mb-3 flex justify-end">
                <ModelsBulkImportDialog
                  selectedBrand={selectedBrand}
                  onImported={async () => {
                    await loadModels();
                    await loadYears();
                    await loadKeywords();
                  }}
                />
              </div>

              <ModelsTab
                brands={brands}
                models={models}
                selectedBrandId={selectedBrandId}
                setSelectedBrandId={setSelectedBrandId}
                form={modelForm}
                setForm={setModelForm}
                loading={loading.models}
                error={errors.models}
                onSubmit={submitModel}
                onEdit={editModel}
                onDelete={deleteModel}
              />
            </TabsContent>

            <TabsContent value="years" className="mt-0">
              <div className="mb-3 flex justify-end">
                <YearsBulkImportDialog
                  selectedBrand={selectedBrand}
                  selectedModel={selectedModel}
                  onImported={async () => {
                    await loadYears();
                  }}
                />
              </div>

              <YearsTab
                brands={brands}
                models={models}
                selectedBrandId={selectedBrandId}
                setSelectedBrandId={setSelectedBrandId}
                selectedModelId={selectedModelId}
                setSelectedModelId={setSelectedModelId}
                years={years}
                form={yearForm}
                setForm={setYearForm}
                loading={loading.years}
                error={errors.years}
                onSubmit={submitYear}
                onEdit={editYear}
                onDelete={deleteYear}
              />
            </TabsContent>

            <TabsContent value="sections" className="mt-0">
              <SectionsTab
                sections={sections}
                form={sectionForm}
                setForm={setSectionForm}
                loading={loading.sections}
                error={errors.sections}
                onSubmit={submitSection}
                onEdit={editSection}
                onDelete={deleteSection}
              />
            </TabsContent>

            <TabsContent value="keywords" className="mt-0">
              <div className="mb-3 flex justify-end">
                <KeywordsBulkImportDialog
                  selectedBrand={selectedBrand}
                  selectedModel={selectedModel}
                  selectedSection={selectedSection}
                  onImported={async () => {
                    await loadKeywords();
                  }}
                />
              </div>

              <KeywordsTab
                brands={brands}
                models={models}
                sections={sections}
                selectedBrandId={selectedBrandId}
                setSelectedBrandId={setSelectedBrandId}
                selectedModelId={selectedModelId}
                setSelectedModelId={setSelectedModelId}
                selectedSectionId={selectedSectionId}
                setSelectedSectionId={setSelectedSectionId}
                keywords={keywords}
                form={keywordForm}
                setForm={setKeywordForm}
                loading={loading.keywords}
                error={errors.keywords}
                onSubmit={submitKeyword}
                onEdit={editKeyword}
                onDelete={deleteKeyword}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

/** الـ default export: يلف الـ inner داخل Suspense عشان useSearchParams يرضي Next 16 */
export default function FilterSettingsPage() {
  return (
    <Suspense fallback={null}>
      <FilterSettingsInner />
    </Suspense>
  );
}
