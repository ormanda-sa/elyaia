// src/app/general-manager/stores/[storeId]/invitations/page.tsx
"use client";

type Props = {
  params: { storeId: string };
};

export default function StoreInvitationsPage({ params }: Props) {
  const { storeId } = params;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">دعوات المتجر #{storeId}</h1>
      <p className="text-[11px] text-slate-500">
        شاشة لإرسال الدعوات لأصحاب المتاجر وربطهم بهذا المتجر.
      </p>

      <div className="rounded-lg border bg-white p-3 text-[11px] text-slate-600">
        Placeholder — لاحقًا نعرض دعوات من جدول{" "}
        <code className="bg-slate-100 px-1 rounded">
          store_invitations
        </code>{" "}
        أو ما يماثله.
      </div>
    </div>
  );
}
