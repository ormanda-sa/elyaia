import { HeroSettingsShell } from "./_components/HeroSettingsShell";

export default function HeroSettingsPage() {
  return (
    <div className="p-6 lg:p-10 flex justify-center" dir="rtl">
      <div className="w-full max-w-4xl space-y-4">
        <div>
          <h1 className="text-xl font-bold">إعداد مظهر الفلتر في الهيرو</h1>
          <p className="text-xs text-muted-foreground mt-1">
            اضبط شكل الفلتر العلوي في الصفحة الرئيسية: الخلفية، النصوص، الألوان، وزر البحث.
          </p>
        </div>

        {/* كرت واحد فقط، جوّاه تبويبات الإعدادات */}
        <HeroSettingsShell />
      </div>
    </div>
  );
}
