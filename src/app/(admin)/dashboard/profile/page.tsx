"use client";

import { useEffect, useState } from "react";
import { UserInfoCard } from "./_components/UserInfoCard";
import { UserMetaCard } from "./_components/UserMetaCard";
import { UserAddressCard } from "./_components/UserAddressCard";

type ProfileData = {
  basic: {
    fullName: string;
    role: string;
    location?: string;
    email?: string;
  };
  meta: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    bio?: string;
  };
  address: {
    country?: string;
    city?: string;
    street?: string;
    postalCode?: string;
    taxId?: string;
  };
};

export default function DashboardProfilePage() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadProfile() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/profile");
      if (!res.ok) throw new Error("فشل جلب بيانات الملف الشخصي");
      const json = await res.json();
      setData(json as ProfileData);
    } catch (err: any) {
      console.error("profile load error:", err);
      setError(err.message || "خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  if (loading && !data) {
    return (
      <div className="px-4 py-4 text-[12px] text-slate-500" dir="rtl">
        جاري تحميل بيانات الملف الشخصي...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="px-4 py-4 text-[12px] text-red-600" dir="rtl">
        {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4 px-2 py-3 sm:space-y-5 sm:px-4 sm:py-4" dir="rtl">
      <h1 className="mb-2 text-base font-semibold text-slate-900 sm:text-lg">
        الملف الشخصي
      </h1>

      {/* كرت بيانات المتجر / صاحب المتجر */}
      <UserInfoCard
        data={data.basic}
        onUpdated={(basic) => setData((prev) => (prev ? { ...prev, basic } : prev))}
      />

      {/* معلومات شخصية */}
      <UserMetaCard
        data={data.meta}
        onUpdated={(meta) => setData((prev) => (prev ? { ...prev, meta } : prev))}
      />

      {/* العنوان */}
      <UserAddressCard
        data={data.address}
        onUpdated={(address) =>
          setData((prev) => (prev ? { ...prev, address } : prev))
        }
      />
    </div>
  );
}
