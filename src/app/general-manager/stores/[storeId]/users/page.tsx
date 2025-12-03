// src/app/general-manager/stores/[storeId]/users/page.tsx
"use client";

type Props = {
  params: { storeId: string };
};

export default function StoreUsersPage({ params }: Props) {
  const { storeId } = params;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">مستخدمو المتجر #{storeId}</h1>
      <p className="text-[11px] text-slate-500">
        هنا بنعرض قائمة المستخدمين المرتبطين بهذا المتجر (owner, staff, إلخ).
      </p>

      <div className="rounded-lg border bg-white p-3 text-[11px] text-slate-600">
        Placeholder — لاحقًا نربطها بجدول{" "}
        <code className="bg-slate-100 px-1 rounded">
          store_users
        </code>{" "}
        في Supabase.
      </div>
    </div>
  );
}
