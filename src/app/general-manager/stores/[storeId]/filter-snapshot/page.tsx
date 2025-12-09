// src/app/general-manager/stores/[storeId]/filter-snapshot/page.tsx
"use client";

type Props = {
  params: { storeId: string };
};

export default function StoreFilterSnapshotPage({ params }: Props) {
  const { storeId } = params;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Filter Snapshot للمتجر #{storeId}</h1>
      <p className="text-[11px] text-slate-500">
        هنا بنعرض عدد البراندات والموديلات والسنوات والأقسام والكلمات المفتاحية
        لهذا المتجر، مع روابط لفتح لوحة الفلتر.
      </p>

      <div className="grid gap-3 md:grid-cols-4 text-[11px]">
        <div className="rounded-lg border bg-white p-3">
          <div className="text-xs text-slate-500 mb-1">البراندات</div>
          <div className="text-lg font-semibold">12</div>
        </div>
        <div className="rounded-lg border bg-white p-3">
          <div className="text-xs text-slate-500 mb-1">الموديلات</div>
          <div className="text-lg font-semibold">34</div>
        </div>
        <div className="rounded-lg border bg-white p-3">
          <div className="text-xs text-slate-500 mb-1">السنوات</div>
          <div className="text-lg font-semibold">88</div>
        </div>
        <div className="rounded-lg border bg-white p-3">
          <div className="text-xs text-slate-500 mb-1">
            الكلمات المفتاحية
          </div>
          <div className="text-lg font-semibold">420</div>
        </div>
      </div>

      <button className="mt-2 w-fit rounded-md border px-3 py-1.5 text-[11px] hover:bg-slate-50">
        فتح لوحة الفلتر لهذا المتجر
      </button>
    </div>
  );
}
