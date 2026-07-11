import Link from "next/link";
import { useTranslations } from "next-intl";
import Brand from "./Brand";
import LanguageToggle from "./LanguageToggle";
import s from "./SiteHeader.module.css";

type SiteHeaderProps = {
  /** Text links, styled with `headerStyles.link` */
  children?: React.ReactNode;
  /** The main button (Sign in / Sign out), placed after the language toggle */
  action?: React.ReactNode;
};

/** The one header used by every page outside the chat app shell. */
export default function SiteHeader({ children, action }: SiteHeaderProps) {
  const t = useTranslations("common");

  return (
    <header className={s.header}>
      <div className={s.inner}>
        <Link href="/" className={s.home} aria-label={t("homeLabel")}>
          <Brand />
        </Link>
        <nav className={s.nav} aria-label="Primary">
          {children}
          <LanguageToggle />
          {action}
        </nav>
      </div>
    </header>
  );
}

export { s as headerStyles };
