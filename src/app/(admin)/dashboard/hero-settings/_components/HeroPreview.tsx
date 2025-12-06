import type { FilterConfig } from "./HeroSettingsShell";

type Props = {
  config: FilterConfig;
};

export function HeroPreview({ config }: Props) {
  // === وضع خلفية الهيرو ===
  const bgMode = config.hero_bg_mode ?? "image";

  const bgImage =
    config.background_image_url ||
    "https://static.darb.com.sa/hero-bg/shocks.webp";

  // الـ gradient اللي اخترته من تبويب مظهر الفلتر
  const heroGradientBg =
    config.hero_bg_gradient ||
    "radial-gradient(circle at 0 0, rgba(59,130,246,0.35), transparent 55%), radial-gradient(circle at 100% 100%, rgba(244,54,54,0.35), transparent 55%), rgba(15,23,42,0.92)";

  // === نصوص الهيرو ===
  const heroTitle = config.title_text || "ابحث عن قطع غيار سيارتك";

  const titleColor = config.hero_title_color || "#ffffff";
  const descColor = config.hero_desc_color || "#f9fafb";
  const counterColor = config.counter_color || "#e5202a";
  const shippingColor = config.shipping_color || "#2563eb";

  // === العداد + الشحن ===
  const counterValue = Number(config.counter_target ?? 0);
  const formattedCounter = Number.isFinite(counterValue)
    ? counterValue.toLocaleString("en-US")
    : "0";

  let subtitleHtml: string;

  // لو فيه HTML مخصص، استخدمه كما هو
  if (config.subtitle_text && config.subtitle_text.trim().length > 0) {
    subtitleHtml = config.subtitle_text;
  } else {
    // نبني HTML من القوالب
    const prefixTemplate =
      config.hero_description_prefix ??
      "ابحث بين {counter} قطعة غيار لجميع سيارات تويوتا الأصلية واليابانية والتجارية";

    const shippingLine =
      config.hero_shipping_line ??
      "شحن سريع خلال 4-6 أيام وسعر منافس جداً";

    const fullText = prefixTemplate.replace("{counter}", formattedCounter);

    subtitleHtml =
      `ابحث بين <span class="darb-counter">${formattedCounter}</span>` +
      fullText.replace(formattedCounter, "") +
      `<br><span class="darb-shipping">${shippingLine}</span> ` +
      `<span class="emoji-bounce">🚚</span><span class="emoji-bounce">🔥</span>`;
  }

  // === الشريط (الكبسولة) + زر البحث ===
  const stepBadgeBg = config.step_badge_bg || "#d50026";

  const capsuleBg =
    config.hero_capsule_bg ||
    "radial-gradient(circle at 0 0, rgba(59,130,246,0.2), transparent 55%), radial-gradient(circle at 100% 100%, rgba(244,54,54,0.25), transparent 55%), rgba(15,23,42,0.72)";

  const capsuleShadow =
    config.hero_capsule_shadow ||
    "0 26px 80px rgba(15,23,42,0.65), 0 0 0 1px rgba(148,163,184,0.45)";

  const buttonBg =
    config.hero_button_bg ||
    "linear-gradient(90deg, #e5202a 0%, #f97316 100%)";
  const buttonTextColor = config.hero_button_text_color || "#ffffff";

  const fieldBg = "#fffbff";
  const fieldBorder = "#ececec";
  const fieldTextColor = "#23272e";

  return (
    <div className="rounded-2xl border bg-muted/40 overflow-hidden darb-preview mb-4">
      {/* CSS مخصص للمعاينة فقط */}
      <style>
        {`
        .darb-preview .hero-section {
          position: relative;
          width: 100%;
          min-height: 260px;
          overflow: visible !important;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 32px;
          background: transparent;
        }
        .darb-preview .hero-bg-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          background-position: center;
          background-repeat: no-repeat;
          background-size: cover;
          filter: brightness(0.7) saturate(1.12) contrast(1.05);
          z-index: 1;
          pointer-events: none;
        }
        .darb-preview #custom-filter-hero {
          position: relative;
          z-index: 3;
          width: 100%;
          margin: 0 auto;
          padding-top: 26px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .darb-preview .hero-title-filter {
          margin-bottom: 16px;
          text-align: center;
        }
        .darb-preview .hero-filter-head {
          font-size: 1.6rem;
          font-weight: 900;
          margin-bottom: 4px;
          letter-spacing: -1px;
          text-shadow: 0 6px 30px #000c, 0 1px 2px #fff3;
          margin-top: 4px;
        }
        .darb-preview .hero-filter-desc {
          margin-top: 2px;
          font-size: 0.95rem;
          line-height: 1.8;
          text-shadow: 0 2px 12px #0006;
        }

        .darb-preview .hero-filters-wrapper {
          margin: 0;
          position: static;
          width: 100%;
          display: flex;
          justify-content: center;
          z-index: 5;
        }
        .darb-preview .hero-filters-form {
          position: relative;
          z-index: 10;
          width: min(900px, 100%);
          margin: 5px auto 3px 0;
          padding: 18px 14px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: nowrap;
          background: ${capsuleBg};
          box-shadow: ${capsuleShadow};
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .darb-preview .select-with-step {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          position: relative;
          margin-bottom: 0 !important;
          flex: 1 1 0;
          min-width: 160px;
        }
        .darb-preview .select-with-step .step-label {
          background: ${stepBadgeBg};
          color: #ffffff;
          text-align: center;
          font-size: 9px;
          border: 1.5px solid #eef0f8;
          margin-top: 10px;
          margin-bottom: 6px;
          letter-spacing: 1px;
          position: absolute;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          line-height: 1;
          width: 1.375rem;
          height: 1.375rem;
          border-radius: 50%;
          inset-inline-start: 0.625rem;
          pointer-events: none;
          z-index: 1;
        }

        .darb-preview .hero-filters-form select {
          min-width: 0;
          width: 100%;
          height: 49px;
          border-radius: 5px;
          border: 1.5px solid ${fieldBorder};
          font-size: 14px;
          font-weight: 600;
          background: ${fieldBg};
          color: ${fieldTextColor};
          box-shadow: none;
          padding: 0 14px;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
        }

        .darb-preview .hero-search-btn {
          font-size: 16px;
          min-width: 130px;
          padding: 0 28px;
          height: 50px;
          border-radius: 12px;
          border: none;
          font-weight: bold;
          letter-spacing: 0.5px;
          box-shadow: 0 3px 12px rgba(229,32,42,0.22);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex: 0 0 auto;
          cursor: default;
        }

        @media (max-width: 900px) {
          .darb-preview .hero-section {
            min-height: 220px;
            padding-bottom: 18px;
          }
          .darb-preview .hero-filters-form {
            display: block;
            width: 100%;
            max-width: 100%;
          }
          .darb-preview .hero-filters-form > .select-with-step {
            width: 100%;
            min-width: 0;
            margin-bottom: 6px !important;
          }
          .darb-preview .hero-search-btn {
            width: 100%;
            margin-top: 8px;
          }
        }
      `}
      </style>

      <div className="hero-section">
        {/* الخلفية الفعلية للمعاينة */}
        <div
          className="hero-bg-img"
          style={
            bgMode === "gradient"
              ? { background: heroGradientBg }
              : {
                  backgroundImage: `url(${bgImage})`,
                  backgroundPosition: "center",
                  backgroundSize: "cover",
                  backgroundRepeat: "no-repeat",
                }
          }
        />

        <div id="custom-filter-hero">
          {/* العنوان + الوصف */}
          <div className="hero-title-filter">
            <div
              className="hero-filter-head"
              style={{ color: titleColor }}
            >
              {heroTitle}
            </div>

            <div
              className="hero-filter-desc"
              style={{ color: descColor }}
              dangerouslySetInnerHTML={{ __html: subtitleHtml }}
            />

            {/* ألوان العداد والشحن */}
            <style>
              {`
                .darb-preview .darb-counter {
                  color: ${counterColor} !important;
                  font-weight: 700;
                }
                .darb-preview .darb-shipping {
                  color: ${shippingColor} !important;
                  font-weight: 600;
                }
              `}
            </style>
          </div>

          {/* فورم الفلتر (شكل فقط) */}
          <div className="hero-filters-wrapper">
            <form
              dir="rtl"
              className="hero-filters-form"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="select-with-step">
                <span className="step-label">01</span>
                <select>
                  <option>تويوتا</option>
                  <option>لكزس (مثال)</option>
                </select>
              </div>

              <div className="select-with-step">
                <span className="step-label">02</span>
                <select>
                  <option>كامري</option>
                  <option>كورولا (مثال)</option>
                </select>
              </div>

              <div className="select-with-step">
                <span className="step-label">03</span>
                <select>
                  <option>2023</option>
                  <option>2022</option>
                </select>
              </div>

              <div className="select-with-step">
                <span className="step-label">04</span>
                <select>
                  <option>اختر التصنيف</option>
                </select>
              </div>

              <div className="select-with-step">
                <span className="step-label">05</span>
                <select>
                  <option>بحث أو اختيار القطع...</option>
                </select>
              </div>

              <button
                type="button"
                className="hero-search-btn"
                style={{
                  background: buttonBg,
                  color: buttonTextColor,
                }}
              >
                بحث →
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
