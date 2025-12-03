"use client";

type TabKey = "brands" | "models" | "years" | "sections" | "keywords";

type Props = {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
};

const tabs: { key: TabKey; label: string }[] = [
  { key: "brands", label: "الشركات (Brands)" },
  { key: "models", label: "السيارات (Models)" },
  { key: "years", label: "السنوات (Years)" },
  { key: "sections", label: "الأقسام (Sections)" },
  { key: "keywords", label: "الكلمات (Keywords)" },
];

export function TabsHeader({ activeTab, setActiveTab }: Props) {
  return (
    <div className="mb-5 flex flex-wrap gap-2 rounded-full bg-gray-100 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          className={`rounded-full px-4 py-2 text-sm transition-all ${
            activeTab === tab.key
              ? "bg-white shadow-sm text-brand-500"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
