import Logo from "./Logo";
import s from "./Brand.module.css";

type BrandProps = {
  compact?: boolean;
  /** "light" for the dark walnut sidebar */
  tone?: "dark" | "light";
};

/** Bilingual lockup: seal, ARPO, and the Hindi descriptor (government-portal style). */
export default function Brand({ compact = false, tone = "dark" }: BrandProps) {
  return (
    <span
      className={`${s.brand} ${compact ? s.compact : ""} ${tone === "light" ? s.light : ""}`}
    >
      <Logo size={compact ? 32 : 40} />
      <span className={s.text}>
        <span className={s.name}>ARPO</span>
        <span className={s.sub} lang="hi">
          स्काउट ज्ञान सहायक
        </span>
        {!compact && (
          <span className={`${s.sub} ${s.subEn}`}>Scout knowledge assistant</span>
        )}
      </span>
    </span>
  );
}
