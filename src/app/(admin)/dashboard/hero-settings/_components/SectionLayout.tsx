import type { FilterConfig } from "./HeroSettingsShell";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  config: FilterConfig;
  onChange: <K extends keyof FilterConfig>(key: K, value: FilterConfig[K]) => void;
};

export function SectionCapsule({ config, onChange }: Props) {
  return (
    <section
      id="hero-capsule"
      className="border rounded-2xl p-4 md:p-5 bg-white/60 space-y-4"
    >
      <div>
        <h2 className="text-sm font-semibold">خلفية شريط الفلتر (الكبسولة)</h2>
        <p className="text-[11px] text-muted-foreground">
          تحكم في الخلفية المتدرجة وظل الشريط الذي يحتوي على الحقول في الهيرو.
        </p>
      </div>

      {/* الخلفية */}
      <div className="space-y-2">
        <Label className="text-xs">
          كود الخلفية (CSS background)
          <span className="block text-[10px] text-muted-foreground">
            مثال: radial-gradient(..., rgba(15,23,42,0.72))
          </span>
        </Label>
        <Textarea
          rows={3}
          value={config.hero_capsule_bg ?? ""}
          onChange={(e) => onChange("hero_capsule_bg", e.target.value)}
        />
      </div>

      {/* الظل */}
      <div className="space-y-2">
        <Label className="text-xs">
          كود الظل (box-shadow)
          <span className="block text-[10px] text-muted-foreground">
            مثال: 0 26px 80px rgba(15,23,42,0.65), 0 0 0 1px rgba(148,163,184,0.45)
          </span>
        </Label>
        <Textarea
          rows={2}
          value={config.hero_capsule_shadow ?? ""}
          onChange={(e) => onChange("hero_capsule_shadow", e.target.value)}
        />
      </div>
    </section>
  );
}
