import { useTranslations } from "next-intl";
import styles from "./auth.module.css";

/** Base camp sign-in art: a trail across a contour map, three waypoints to a flag. */
export default function TrailPanel() {
  const t = useTranslations("trail");

  return (
    <aside className={styles.trail} aria-hidden="true">
      <div className={styles.trailContours} />

      <svg className={styles.trailPath} viewBox="0 0 400 520" fill="none" preserveAspectRatio="none">
        <path
          d="M60 405 C 120 360, 80 310, 152 286 S 300 250, 250 190 S 290 140, 330 115"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="2 10"
        />
      </svg>

      <h2 className={styles.trailTitle}>{t("title")}</h2>

      <ol className={styles.waypoints}>
        <li style={{ left: "15%", top: "77.9%" }}>
          <span className={styles.pin} data-start />
          <span className={styles.pinLabel}>
            <small>{t("youAreHere")}</small>
            {t("one")}
          </span>
        </li>
        <li style={{ left: "38%", top: "55%" }}>
          <span className={styles.pin} />
          <span className={styles.pinLabel}>{t("two")}</span>
        </li>
        <li style={{ left: "82.5%", top: "22.1%" }}>
          <span className={styles.flag} />
          <span className={`${styles.pinLabel} ${styles.pinLabelBelow}`}>{t("three")}</span>
        </li>
      </ol>

      <blockquote className={styles.quote}>
        <p>{t("quote")}</p>
        <footer>{t("quoteBy")}</footer>
      </blockquote>
    </aside>
  );
}
