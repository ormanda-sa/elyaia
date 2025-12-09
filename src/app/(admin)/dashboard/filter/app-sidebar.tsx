// src/app/(admin)/dashboard/filter/app-sidebar.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

type Brand = {
  id: number;
  store_id: string;
  name_ar: string;
  slug: string | null;
  salla_company_id: string | null;
  sort_order: number | null;
};

// خليه اختياري عشان ما يجبرنا نمرره من كل مكان
type Props = {
  storeId?: string;
};

// الكومبوننت الداخلي اللي فعليًا يستخدم useSearchParams/useRouter
function AppSidebarInner(_props: Props) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [nameAr, setNameAr] = useState("");
  const [slug, setSlug] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [sortOrder, setSortOrder] = useState("");

  const [editingBrandId, setEditingBrandId] = useState<number | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  const pushWithParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) params.delete(key);
      else params.set(key, value);
    });
    const qs = params.toString();
    router.push(qs ? `/dashboard/filter?${qs}` : "/dashboard/filter");
  };

  const loadBrands = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/dashboard/brands`);
      if (!res.ok) throw new Error();
      const data = await res.json();

      const list: Brand[] =
        (data.brands as Brand[]) ||
        (data.items as Brand[]) ||
        ([] as Brand[]);

      setBrands(list);

      const brandParam = searchParams.get("brand");
      if (brandParam) {
        const id = Number(brandParam);
        if (!Number.isNaN(id) && list.some((b) => b.id === id)) {
          setSelectedBrandId(id);
          return;
        }
      }
      if (!brandParam && list.length && selectedBrandId == null) {
        setSelectedBrandId(list[0].id);
      }
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // يستقبل إشارة التعديل من page.tsx
  useEffect(() => {
    const handler = (e: Event) => {
      const anyEvent = e as CustomEvent<Brand>;
      const brand = anyEvent.detail;
      if (!brand) return;

      setShowForm(true);
      setEditingBrandId(brand.id);
      setNameAr(brand.name_ar || "");
      setSlug(brand.slug || "");
      setCompanyId(brand.salla_company_id || "");
      setSortOrder(
        typeof brand.sort_order === "number" ? String(brand.sort_order) : "",
      );
    };

    window.addEventListener("sidebar-edit-brand", handler);
    return () => window.removeEventListener("sidebar-edit-brand", handler);
  }, []);

  const resetForm = () => {
    setNameAr("");
    setSlug("");
    setCompanyId("");
    setSortOrder("");
    setEditingBrandId(null);
  };

  const handleCreateOrUpdate = async () => {
    if (!nameAr.trim()) {
      alert("اسم الشركة بالعربي مطلوب");
      return;
    }

    const payload = {
      name_ar: nameAr.trim(),
      slug: slug.trim() || null,
      salla_company_id: companyId.trim() || null,
      sort_order: sortOrder ? Number(sortOrder) : null,
    };

    try {
      setSaving(true);

      if (editingBrandId) {
        // تعديل
        const res = await fetch("/api/dashboard/brands", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingBrandId, ...payload }),
        });
        if (!res.ok) throw new Error();

        const data = await res.json();
        const updated: Brand =
          (data.brand as Brand) || (data.item as Brand) || (data as Brand);

        setBrands((prev) =>
          prev.map((b) => (b.id === updated.id ? updated : b)),
        );
        setSelectedBrandId(updated.id);
      } else {
        // إضافة جديدة
        const res = await fetch("/api/dashboard/brands", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();

        const data = await res.json();
        const created: Brand =
          (data.brand as Brand) || (data.item as Brand) || (data as Brand);

        setBrands((prev) => [...prev, created]);
        setSelectedBrandId(created.id);

        pushWithParams({
          brand: String(created.id),
          tab: "models",
        });
      }

      resetForm();
      setShowForm(false);

      router.refresh();
    } catch {
      alert("فشل حفظ الشركة");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-3 py-3">
        <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-900">
            الشركات (Brands)
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500">
            اختر شركة لإدارة الموديلات، السنوات والأقسام والكلمات المرتبطة.
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-2 text-[11px] text-slate-600">
        <span>الشركات المتاحة</span>
        <Button
          type="button"
          size="icon"
          variant={showForm ? "secondary" : "outline"}
          className="h-6 w-6 rounded-full text-[14px]"
          onClick={() => {
            if (showForm) {
              resetForm();
            }
            setShowForm((v) => !v);
          }}
        >
          {showForm ? "×" : "+"}
        </Button>
      </div>

      {showForm && (
        <div className="mx-2 mb-2 space-y-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-right">
          <div className="mb-1 text-[11px] font-semibold text-slate-800">
            {editingBrandId ? "تعديل شركة" : "إضافة شركة جديدة"}
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-slate-600">
              اسم الشركة بالعربي
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder="مثال: تويوتا"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-slate-600">
              slug (اختياري)
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="مثال: GKQeoY"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-slate-600">
              company.id في سلة (اختياري)
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              placeholder="مثال: 2029219668"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-slate-600">
              الترتيب في القوائم (اختياري)
            </label>
            <input
              type="number"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder="مثال: 1"
            />
          </div>
          <div className="pt-1 text-left">
            <Button
              type="button"
              className="rounded-full px-5 py-2 text-xs"
              onClick={handleCreateOrUpdate}
              disabled={saving}
            >
              {saving
                ? "جارٍ الحفظ..."
                : editingBrandId
                ? "تحديث الشركة"
                : "حفظ الشركة"}
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {loading && (
          <div className="px-2 py-2 text-[11px] text-slate-500">
            جاري تحميل الشركات…
          </div>
        )}

        {!loading && brands.length === 0 && !showForm && (
          <div className="px-2 py-2 text-[11px] text-slate-400">
            لا توجد شركات حتى الآن. اضغط زر + لإضافة أول شركة.
          </div>
        )}

        {!loading &&
          brands.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                setSelectedBrandId(b.id);
                const currentTab =
                  (searchParams.get("tab") as string | null) || "models";
                pushWithParams({
                  brand: String(b.id),
                  tab: currentTab,
                });
              }}
              className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs transition ${
                selectedBrandId === b.id
                  ? "bg-slate-900 text-slate-50"
                  : "bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span className="truncate">{b.name_ar}</span>
            </button>
          ))}
      </div>

      <div className="border-t border-slate-200 px-3 py-2 text-[10px] text-slate-500">
        فلتر متاجر سلة – درب
      </div>
    </div>
  );
}

// الكومبوننت الخارجي اللي يستخدمه layout/page
export function AppSidebar(props: Props) {
  return (
    <Suspense fallback={null}>
      <AppSidebarInner {...props} />
    </Suspense>
  );
}
