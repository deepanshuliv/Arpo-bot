import Link from "next/link";
import { getTranslations } from "next-intl/server";
import SiteHeader from "@/components/SiteHeader";
import s from "./landing.module.css";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  const th = await getTranslations("header");

  return (
    <div className={s.page}>
      <div className={s.contours} aria-hidden="true" />
      <SiteHeader
        action={
          <Link href="/auth" className="btn-secondary">
            {th("signIn")}
          </Link>
        }
      />
      <main id="main" className={s.notFound}>
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1>{t.rich("title", { em: (chunks) => <em>{chunks}</em> })}</h1>
        <p>{t("desc")}</p>
        <Link href="/" className="btn-primary">
          {t("cta")}
        </Link>
      </main>
    </div>
  );
}
