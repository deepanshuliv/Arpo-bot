import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
} from "@phosphor-icons/react/dist/ssr";
import SiteHeader, { headerStyles } from "@/components/SiteHeader";
import s from "./landing.module.css";

const capabilities = ["manuals", "badges", "fieldcraft", "sources"] as const;
const steps = ["one", "two", "three", "four"] as const;

const LAST_UPDATED = new Date("2026-09-28");

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const th = await getTranslations("header");
  const format = await getFormatter();
  const em = (chunks: React.ReactNode) => <em>{chunks}</em>;

  return (
    <div className={s.page}>
      <div className={s.contours} aria-hidden="true" />

      <SiteHeader
        action={
          <Link href="/auth" className="btn-secondary">
            {th("signIn")}
          </Link>
        }
      >
        <Link href="/admin/auth" className={`${headerStyles.link} ${headerStyles.hideSm}`}>
          {th("forLeaders")}
        </Link>
      </SiteHeader>

      <main id="main">
        <section className={s.hero} aria-labelledby="hero-title">
          <div className={s.heroCopy}>
            <p className="eyebrow">{t("eyebrow")}</p>
            <h1 id="hero-title" className={s.heroTitle}>
              {t.rich("heroTitle", { em })}
            </h1>
            <p className={s.heroDesc}>{t("heroDesc")}</p>
            <div className={s.heroActions}>
              <Link href="/auth" className="btn-primary">
                {t("ctaPrimary")}
                <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </Link>
              <Link href="/admin" className={s.textLink}>
                {t("ctaSecondary")}
                <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <figure className={s.specimen} aria-label={t("specimen.label")}>
            <div className={s.specimenBar}>
              <span>{t("specimen.label")}</span>
              <span className={s.specimenTime}>{t("specimen.time")}</span>
            </div>

            <div className={s.specimenBody}>
              <p className={s.question}>{t("specimen.question")}</p>

              <div className={s.answer}>
                <p>{t("specimen.answerIntro")}</p>
                <ol>
                  {steps.map((step) => (
                    <li key={step}>{t(`specimen.steps.${step}`)}</li>
                  ))}
                </ol>
              </div>

              <figcaption className={s.citation}>
                <BookOpenText size={14} aria-hidden="true" />
                <span>{t("specimen.source")}</span>
                <span className={s.citationMeta}>{t("specimen.sourceMeta")}</span>
              </figcaption>
            </div>
          </figure>
        </section>

        <section className={s.features} aria-labelledby="features-title">
          <div className={s.featuresIntro}>
            <p className="eyebrow">{t("features.eyebrow")}</p>
            <h2 id="features-title">{t("features.title")}</h2>
            <p>{t("features.desc")}</p>
          </div>

          <ol className={s.featureList}>
            {capabilities.map((key, i) => (
              <li className={s.featureItem} key={key}>
                <span className={s.featureIndex}>{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{t(`features.items.${key}.title`)}</h3>
                  <p>{t(`features.items.${key}.description`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={s.closing} aria-labelledby="closing-title">
          <h2 id="closing-title">{t.rich("closing.title", { em })}</h2>
          <Link href="/auth" className="btn-primary">
            {t("closing.cta")}
            <ArrowRight size={16} weight="bold" aria-hidden="true" />
          </Link>
        </section>
      </main>

      <footer className={s.footer}>
        <div className={s.footerInfo}>
          <span>{t("footer.service")}</span>
          <span>{t("footer.disclaimer")}</span>
          <span className="tabular">
            {t("footer.lastUpdated", {
              date: format.dateTime(LAST_UPDATED, { day: "numeric", month: "long", year: "numeric" }),
            })}
          </span>
        </div>
        <nav className={s.footerLinks} aria-label="Footer">
          <Link href="/auth">{t("footer.signIn")}</Link>
          <Link href="/admin/auth">{t("footer.adminSignIn")}</Link>
        </nav>
      </footer>
    </div>
  );
}
