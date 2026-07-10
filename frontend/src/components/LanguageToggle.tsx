"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LOCALE_COOKIE, type Locale } from "@/i18n/config";
import s from "./LanguageToggle.module.css";

type LanguageToggleProps = {
  /** "light" sits on the dark walnut sidebar */
  tone?: "dark" | "light";
};

/** Lever switch between English and Hindi. The choice is kept in a cookie. */
export default function LanguageToggle({ tone = "dark" }: LanguageToggleProps) {
  const t = useTranslations("language");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isHindi = locale === "hi";

  const toggle = () => {
    const next: Locale = isHindi ? "en" : "hi";
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    // Re-render server components with the new language
    startTransition(() => router.refresh());
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isHindi}
      aria-label={isHindi ? t("switchToEnglish") : t("switchToHindi")}
      title={isHindi ? t("switchToEnglish") : t("switchToHindi")}
      className={`${s.toggle} ${tone === "light" ? s.light : ""}`}
      data-pending={pending || undefined}
      onClick={toggle}
    >
      <span className={s.label} data-active={!isHindi}>
        {t("en")}
      </span>
      <span className={s.assembly} data-on={isHindi} aria-hidden="true">
        <span className={s.track} />
        <span className={s.lever}>
          <span className={s.arm}>
            <span className={s.knob} />
          </span>
        </span>
      </span>
      <span className={s.label} data-active={isHindi} lang="hi">
        {t("hi")}
      </span>
    </button>
  );
}
